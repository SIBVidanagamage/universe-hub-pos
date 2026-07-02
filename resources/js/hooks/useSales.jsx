import { useState, useCallback, createContext, useContext, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';

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

const SalesContext = createContext(null);

export const SalesProvider = ({ children }) => {
    const [sales, setSales] = useState([]);
    const [stats, setStats] = useState(null);
    const [dailyCash, setDailyCash] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingStats, setLoadingStats] = useState(true);
    const { token } = useAuth();
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
            const [salesData, statsData] = await Promise.all([
                fetchWithAuth('/api/v1/sales', {}, authToken),
                fetchWithAuth('/api/sales/stats', {}, authToken)
            ]);
            setSales(salesData || []);
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

        const newSale = await fetchWithAuth('/api/v1/sales', {
            method: 'POST',
            body: JSON.stringify(salePayload),
        }, token);

        if (salePayload.paymentMethod === 'cash') {
            setDailyCash(prev => prev + newSale.total);
        }

        fetchAllData(token);
        return newSale;
    };

    const deleteSale = async (saleId) => {
        if (!token) throw new Error("Not authenticated");

        await fetchWithAuth(`/api/v1/sales/${saleId}`, {
            method: 'DELETE',
        }, token);

        // Refetch all data to ensure dashboard and reports are up-to-date
        await fetchAllData(token);
        toast({ title: "Success", description: `Sale #${saleId} has been deleted and items have been restocked.` });
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
            resetDailyCash: () => {},
        };
    }
    return context;
};
