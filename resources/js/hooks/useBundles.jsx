import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

const BundlesContext = createContext(null);

export const BundlesProvider = ({ children }) => {
    const [bundles, setBundles] = useState([]);
    const [loading, setLoading] = useState(true);
    const { token } = useAuth();

    const fetchBundles = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const { data: bundlesData, error: bundlesError } = await supabase
                .from('bundles')
                .select('*')
                .order('created_at', { ascending: false });
            if (bundlesError) throw bundlesError;

            // Fetch bundle_product mappings
            const { data: pivotData } = await supabase.from('bundle_product').select('*');
            
            // Map products to bundles (if we have products in state, but useBundles doesn't have it)
            // For now, attach raw pivot data
            const mappedBundles = bundlesData.map(bundle => ({
                ...bundle,
                bundle_items: pivotData ? pivotData.filter(p => p.bundle_id === bundle.id) : []
            }));

            setBundles(mappedBundles);
        } catch (error) {
            console.error("Failed to fetch bundles:", error);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchBundles();
    }, [fetchBundles]);

    const addBundle = async (bundleData) => {
        // Since bundle Data might have bundle_items array, we need to insert bundle first, then items
        // To simplify, if bundleData already matches the schema or we have a trigger/function, great.
        // Assuming bundleData has {name, description, price, bundle_items: [{product_id, quantity}]}
        const { bundle_items, ...bundleInfo } = bundleData;
        const { data: newBundle, error: bundleError } = await supabase.from('bundles').insert([bundleInfo]).select().single();
        if (bundleError) throw bundleError;

        if (bundle_items && bundle_items.length > 0) {
            const itemsToInsert = bundle_items.map(item => ({ product_id: item.product_id, bundle_id: newBundle.id }));
            const { error: itemsError } = await supabase.from('bundle_product').insert(itemsToInsert);
            if (itemsError) throw itemsError;
        }
        await fetchBundles(); // Refetch to get the latest list
    };

    const updateBundle = async (bundleId, bundleData) => {
        const { bundle_items, ...bundleInfo } = bundleData;
        const { error: bundleError } = await supabase.from('bundles').update(bundleInfo).eq('id', bundleId);
        if (bundleError) throw bundleError;
        
        if (bundle_items) {
            await supabase.from('bundle_product').delete().eq('bundle_id', bundleId);
            if (bundle_items.length > 0) {
                const itemsToInsert = bundle_items.map(item => ({ product_id: item.product_id, bundle_id: bundleId }));
                await supabase.from('bundle_product').insert(itemsToInsert);
            }
        }
        await fetchBundles(); // Refetch
    };

    const deleteBundle = async (bundleId) => {
        const { error } = await supabase.from('bundles').delete().eq('id', bundleId);
        if (error) throw error;
        setBundles(prev => prev.filter(b => b.id !== bundleId)); // Optimistic update
    };

    const value = { bundles, loading, addBundle, updateBundle, deleteBundle };

    return (
        <BundlesContext.Provider value={value}>
            {children}
        </BundlesContext.Provider>
    );
};

export const useBundles = () => {
    return useContext(BundlesContext);
};
