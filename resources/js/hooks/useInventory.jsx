import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

// Helper to map backend snake_case to frontend camelCase
const mapProductToFrontend = (product) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    productType: product.product_type || 'general',
    phoneBrand: product.phone_brand || '',
    phoneModel: product.phone_model || '',
    phoneColor: product.phone_color || '',
    phoneImei: product.phone_imei || '',
    phoneStorage: product.phone_storage || '',
    sku: product.sku,
    barcode: product.barcode,
    serialNumber: product.serial_number || '',
    quantity: parseInt(product.quantity, 10),
    supplier: product.supplier,
    costPrice: parseFloat(product.cost_price),
    sellingPrice: parseFloat(product.selling_price),
    createdAt: product.created_at,
    updatedAt: product.updated_at,
    minStock: parseInt(product.min_stock_level, 10),
    warrantyPeriod: parseInt(product.warranty_period_months, 10),
});

// Helper to map frontend camelCase to backend snake_case
const mapProductToBackend = (product) => ({
    name: product.name,
    category: product.category,
    product_type: product.productType || 'general',
    phone_brand: product.productType === 'phone' ? product.phoneBrand : null,
    phone_model: product.productType === 'phone' ? product.phoneModel : null,
    phone_color: product.productType === 'phone' ? product.phoneColor : null,
    phone_imei: product.productType === 'phone' ? product.phoneImei : null,
    phone_storage: product.productType === 'phone' ? product.phoneStorage : null,
    sku: product.sku,
    barcode: product.barcode || product.sku,
    serial_number: product.serialNumber,
    quantity: product.quantity,
    supplier: product.supplier,
    cost_price: product.costPrice,
    selling_price: product.sellingPrice,
    min_stock_level: product.minStock,
    warranty_period_months: product.warrantyPeriod,
});


const InventoryContext = createContext(null);

export const InventoryProvider = ({ children }) => {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const { token } = useAuth(); // We only need the token from the auth hook

    const refreshInventory = useCallback(async () => {
        if (token) {
            setLoading(true);
            try {
                const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
                if (error) throw error;
                setInventory(data.map(mapProductToFrontend));
            } catch (error) {
                console.error("Failed to fetch inventory:", error);
                setInventory([]);
            } finally {
                setLoading(false);
            }
        } else {
            setInventory([]);
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        refreshInventory();
    }, [refreshInventory]);

    const addItem = async (itemData) => {
        const backendData = mapProductToBackend(itemData);
        const { data, error } = await supabase.from('products').insert([backendData]).select();
        if (error) throw error;
        setInventory(prev => [mapProductToFrontend(data[0]), ...prev]);
    };

    const updateItem = async (itemId, itemData) => {
        const backendData = mapProductToBackend(itemData);
        const { data, error } = await supabase.from('products').update(backendData).eq('id', itemId).select();
        if (error) throw error;
        setInventory(prev => prev.map(item => item.id === itemId ? mapProductToFrontend(data[0]) : item));
    };

    const deleteItem = async (itemId) => {
        const { error } = await supabase.from('products').delete().eq('id', itemId);
        if (error) throw error;
        setInventory(prev => prev.filter(item => item.id !== itemId));
    };

    const value = {
        inventory,
        loading,
        addItem,
        updateItem,
        deleteItem,
        refreshInventory,
        lowStockItems: inventory.filter(item => item.quantity <= item.minStock)
    };

    return (
        <InventoryContext.Provider value={value}>
            {children}
        </InventoryContext.Provider>
    );
};

export const useInventory = () => {
    const context = useContext(InventoryContext);
    if (context === null) {
        return {
            inventory: [],
            loading: true,
            addItem: async () => {},
            updateItem: async () => {},
            deleteItem: async () => {},
            refreshInventory: async () => {},
            lowStockItems: [],
        };
    }
    return context;
};
