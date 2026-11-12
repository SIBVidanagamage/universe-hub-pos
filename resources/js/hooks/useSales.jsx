import { useState, useCallback, createContext, useContext, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

const SalesContext = createContext(null);

export const SalesProvider = ({ children }) => {
    const [sales, setSales] = useState([]);
    const [stats, setStats] = useState(null);
    const [dailyCash, setDailyCash] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingStats, setLoadingStats] = useState(true);
    const { token, user } = useAuth();
    const { toast } = useToast();

    const fetchAllData = useCallback(async (authToken) => {
        if (!authToken) {
            setLoading(false);
            setLoadingStats(false);
            return;
        }

        setLoading(true);
        setLoadingStats(true);

        try {
            // Fetch products to enrich sale_items with actual names and categories
            const { data: productsData } = await supabase
                .from('products')
                .select('id, name, category, cost_price, selling_price, sku');
            const productsMap = (productsData || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});

            const { data: salesDataRaw, error } = await supabase
                .from('sales')
                .select('*, sale_items(*), customers(name), users(name)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            const salesData = (salesDataRaw || []).map(sale => {
                const enrichedItems = (sale.sale_items || []).map(item => {
                    const prod = item.saleable_type?.includes('Product') ? productsMap[item.saleable_id] : null;
                    const isRepair = prod?.category?.toLowerCase() === 'repair' || 
                                     prod?.name?.toLowerCase().includes('repair') || 
                                     prod?.sku?.startsWith('REP-') ||
                                     item.saleable_type?.includes('Repair');
                    return {
                        ...item,
                        isRepair: Boolean(isRepair),
                        saleable: prod || { 
                            name: item.saleable_type?.includes('Product') ? 'Product #' + item.saleable_id : 'Bundle #' + item.saleable_id,
                            category: isRepair ? 'Repair' : 'General'
                        }
                    };
                });

                const isRepairSale = enrichedItems.some(i => i.isRepair);

                return {
                    ...sale,
                    created_at: sale.created_at || new Date().toISOString(),
                    customer_name: sale.customers ? sale.customers.name : (sale.customer_name || 'Walk-in Customer'),
                    user: sale.users || { name: 'Cashier' },
                    isRepair: isRepairSale,
                    items: enrichedItems
                };
            });
            
            setSales(salesData);

            // Calculate stats locally
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const statsData = {
                totalRevenue: salesData.reduce((sum, sale) => sum + parseFloat(sale.total || 0), 0),
                totalSales: salesData.length,
                todayRevenue: salesData.filter(sale => new Date(sale.created_at) >= today).reduce((sum, sale) => sum + parseFloat(sale.total || 0), 0),
                todaySales: salesData.filter(sale => new Date(sale.created_at) >= today).length,
            };
            setStats(statsData);
        } catch (error) {
            console.error("Failed to fetch sales data:", error);
        } finally {
            setLoading(false);
            setLoadingStats(false);
        }
    }, []);

    useEffect(() => {
        if (token) {
            fetchAllData(token);
        }
    }, [token, fetchAllData]);

    const addSale = async (salePayload) => {
        if (!token) throw new Error("Not authenticated");

        // Calculate totals and profit manually
        let subtotal = 0;
        let totalDiscount = 0;
        let totalProfit = 0;

        // Ensure customer exists or use provided details
        let customerId = null;
        if (salePayload.customerPhone || salePayload.customerEmail) {
            const query = salePayload.customerPhone || salePayload.customerEmail;
            const { data: customer } = await supabase
                .from('customers')
                .select('id')
                .or(`phone.eq.${query},email.eq.${query}`)
                .limit(1)
                .maybeSingle();
            
            if (customer) {
                customerId = customer.id;
            } else {
                const { data: newCustomer, error: custError } = await supabase
                    .from('customers')
                    .insert([{
                        name: salePayload.customerName,
                        email: salePayload.customerEmail,
                        phone: salePayload.customerPhone
                    }])
                    .select('id')
                    .single();
                if (!custError && newCustomer) customerId = newCustomer.id;
            }
        }

        // We need to fetch current product data to calculate profit accurately
        // But for simplicity, we use the frontend sellingPrice and assume cost_price = sellingPrice * 0.7 for now if we can't fetch it, 
        // OR we can just ignore profit for now if it's too complex to fetch.
        // Actually, we can fetch all products in the cart
        const productIds = salePayload.cart.filter(c => c.type === 'product').map(c => c.id);
        let productsMap = {};
        if (productIds.length > 0) {
            const { data: products } = await supabase.from('products').select('*').in('id', productIds);
            productsMap = (products || []).reduce((acc, p) => ({...acc, [p.id]: p}), {});
        }

        const bundleIds = salePayload.cart.filter(c => c.type === 'bundle').map(c => c.id);
        let bundlesMap = {};
        if (bundleIds.length > 0) {
            const { data: bundles } = await supabase.from('bundles').select('*, bundle_product(*)').in('id', bundleIds);
            bundlesMap = (bundles || []).reduce((acc, b) => ({...acc, [b.id]: b}), {});
        }

        for (const item of salePayload.cart) {
            const itemSellingPrice = parseFloat(item.sellingPrice);
            const itemDiscount = parseFloat(item.discount || 0);
            const qty = parseInt(item.quantity);

            subtotal += (itemSellingPrice * qty);
            totalDiscount += (itemDiscount * qty);

            // Calculate profit
            if (item.type === 'product' && productsMap[item.id]) {
                const p = productsMap[item.id];
                const costPrice = parseFloat(p.cost_price || 0);
                const profitPerUnit = itemSellingPrice - costPrice;
                totalProfit += (profitPerUnit * qty);
            } else if (item.type === 'repair') {
                const costPrice = parseFloat(item.costPrice || 0);
                const profitPerUnit = itemSellingPrice - costPrice;
                totalProfit += (profitPerUnit * qty);
            } else if (item.type === 'bundle' && bundlesMap[item.id]) {
                // Approximate bundle profit if we can't easily fetch all bundle items' costs
                totalProfit += ((itemSellingPrice * 0.3) * qty); // Fallback profit calculation
            }
        }

        const exchangeValue = parseFloat(salePayload.exchangeValue || 0);
        const total = Math.max(0, subtotal - totalDiscount - exchangeValue);
        const finalProfit = totalProfit - totalDiscount - exchangeValue;

        const saleRecord = {
            user_id: user?.id,
            customer_id: customerId,
            customer_name: salePayload.customerName,
            customer_email: salePayload.customerEmail,
            customer_phone: salePayload.customerPhone,
            payment_cash: salePayload.paymentCash,
            payment_card: salePayload.paymentCard,
            payment_transfer: salePayload.paymentTransfer,
            payment_koko: salePayload.paymentKoko,
            subtotal,
            discount: totalDiscount,
            exchange_value: exchangeValue,
            exchange_phone_brand: salePayload.exchangePhoneBrand,
            exchange_phone_model: salePayload.exchangePhoneModel,
            exchange_phone_color: salePayload.exchangePhoneColor,
            exchange_phone_imei: salePayload.exchangePhoneImei,
            exchange_phone_storage: salePayload.exchangePhoneStorage,
            tax: 0,
            total,
            profit: finalProfit
        };

        const { data: insertedSales, error: saleError } = await supabase.from('sales').insert([saleRecord]).select();
        if (saleError) throw saleError;
        
        const newSale = insertedSales[0];

        // Insert sale_items
        const saleItems = salePayload.cart.map(item => {
            let warrantyMonths = 0;
            if (item.type === 'product' && productsMap[item.id]) {
                warrantyMonths = parseInt(productsMap[item.id].warranty_period_months || 0);
            }
            
            // Format date for warranty
            let warrantyExpiresAt = null;
            if (warrantyMonths > 0) {
                const d = new Date();
                d.setMonth(d.getMonth() + warrantyMonths);
                warrantyExpiresAt = d.toISOString();
            }

            return {
                sale_id: newSale.id,
                saleable_type: item.type === 'product' ? 'App\\Models\\Product' : 'App\\Models\\Bundle',
                saleable_id: item.id,
                quantity: item.quantity,
                price_at_sale: item.sellingPrice,
                discount: parseFloat(item.discount || 0),
                warranty_months: warrantyMonths,
                warranty_expires_at: warrantyExpiresAt,
                sold_item_codes: item.itemCodes && item.itemCodes.length > 0 ? item.itemCodes : null
            };
        });

        if (saleItems.length > 0) {
            const { error: itemsError } = await supabase.from('sale_items').insert(saleItems);
            if (itemsError) console.error("Failed to insert sale_items:", itemsError);
        }

        // Decrement product quantities
        for (const item of salePayload.cart) {
            if (item.type === 'product' && productsMap[item.id]) {
                const currentQty = parseInt(productsMap[item.id].quantity || 0);
                await supabase.from('products').update({ quantity: Math.max(0, currentQty - item.quantity) }).eq('id', item.id);
            } else if (item.type === 'bundle' && bundlesMap[item.id]) {
                const bundle = bundlesMap[item.id];
                if (bundle.bundle_product) {
                    for (const bp of bundle.bundle_product) {
                        const { data: bpProduct } = await supabase.from('products').select('quantity').eq('id', bp.product_id).single();
                        if (bpProduct) {
                            const newQty = Math.max(0, parseInt(bpProduct.quantity) - (item.quantity * bp.quantity));
                            await supabase.from('products').update({ quantity: newQty }).eq('id', bp.product_id);
                        }
                    }
                }
            }
        }

        // Add some basic mock data to newSale so the billing screen can print it
        newSale.items = salePayload.cart.map(item => ({
            quantity: item.quantity,
            price_at_sale: item.sellingPrice,
            discount: item.discount,
            sold_item_codes: item.itemCodes,
            saleable: item.type === 'product' ? productsMap[item.id] : bundlesMap[item.id]
        }));
        newSale.user = { name: 'Admin' };

        if (salePayload.paymentCash > 0) {
            setDailyCash(prev => prev + salePayload.paymentCash);
        }

        fetchAllData(token);
        return newSale;
    };

    const deleteSale = async (saleId) => {
        if (!token) throw new Error("Not authenticated");

        try {
            // First delete associated sale_items to respect foreign keys
            await supabase.from('sale_items').delete().eq('sale_id', saleId);
            const { error } = await supabase.from('sales').delete().eq('id', saleId);
            if (error) throw error;

            // Refetch all data to ensure dashboard and reports are up-to-date
            await fetchAllData(token);
            toast({ title: "Success", description: `Sale #${saleId} has been deleted.` });
        } catch (err) {
            console.error("Failed to delete sale:", err);
            throw err;
        }
    };

    const updateSaleCost = async (saleId, newTotalCost, explicitProfit = null) => {
        if (!token) throw new Error("Not authenticated");
        
        const targetSale = sales.find(s => s.id === saleId);
        if (!targetSale) throw new Error("Sale not found");

        const parsedCost = parseFloat(newTotalCost) || 0;
        const total = parseFloat(targetSale.total || 0);
        const newProfit = explicitProfit !== null ? parseFloat(explicitProfit) : (total - parsedCost);

        const { error } = await supabase.from('sales').update({
            profit: newProfit
        }).eq('id', saleId);

        if (error) throw error;

        // Also if any sale item corresponds to a repair product, update its cost_price
        try {
            if (targetSale.items && targetSale.items.length === 1 && targetSale.items[0].saleable_id) {
                await supabase.from('products').update({ cost_price: parsedCost }).eq('id', targetSale.items[0].saleable_id);
            }
        } catch (prodErr) {
            // non-fatal
        }

        await fetchAllData(token);
        toast({ title: "Cost & Profit Updated", description: `Sale #${saleId}: Part Cost LKR ${parsedCost.toFixed(2)} | Profit LKR ${newProfit.toFixed(2)}` });
    };

    const resetDailyCash = () => {
        setDailyCash(0);
        toast({ title: "Success", description: "Cash in register has been reset to 0." });
    };

    const value = {
        sales,
        stats,
        dailyCash,
        loading,
        loadingStats,
        addSale,
        deleteSale, // Expose the new delete function
        updateSaleCost,
        resetDailyCash,
    };

    return (
        <SalesContext.Provider value={value}>
            {children}
        </SalesContext.Provider>
    );
};

export const useSales = () => {
    const context = useContext(SalesContext);
    if (!context) {
        console.error("useSales must be used within a SalesProvider.");
        return {
            sales: [],
            stats: null,
            dailyCash: 0,
            loading: true,
            loadingStats: true,
            addSale: async () => {},
            deleteSale: async () => {}, // Provide default
            updateSaleCost: async () => {},
            resetDailyCash: () => {},
        };
    }
    return context;
};
