import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

// Helper function for authenticated API calls
const fetchWithAuth = async (url, options = {}, token) => {
    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
    };
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.status === 204 ? null : response.json();
};

const BundlesContext = createContext(null);

export const BundlesProvider = ({ children }) => {
    const [bundles, setBundles] = useState([]);
    const [loading, setLoading] = useState(true);
    const { token } = useAuth();

    const fetchBundles = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const data = await fetchWithAuth('/api/v1/bundles', {}, token);
            setBundles(data);
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
        await fetchWithAuth('/api/v1/bundles', {
            method: 'POST',
            body: JSON.stringify(bundleData),
        }, token);
        await fetchBundles(); // Refetch to get the latest list
    };

    const updateBundle = async (bundleId, bundleData) => {
        await fetchWithAuth(`/api/v1/bundles/${bundleId}`, {
            method: 'PUT',
            body: JSON.stringify(bundleData),
        }, token);
        await fetchBundles(); // Refetch
    };

    const deleteBundle = async (bundleId) => {
        await fetchWithAuth(`/api/v1/bundles/${bundleId}`, {
            method: 'DELETE',
        }, token);
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
