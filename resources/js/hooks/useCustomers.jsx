import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from './useAuth';

export function useCustomers() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const { token } = useAuth();

    const fetchCustomers = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setCustomers(data);
        } catch (error) {
            console.error('Failed to fetch customers:', error);
            toast({
                title: 'Error',
                description: 'Failed to load customers.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }, [token, toast]);

    useEffect(() => {
        if (token) {
            fetchCustomers();
        }
    }, [fetchCustomers, token]);

    const addCustomer = async (data) => {
        try {
            const { error } = await supabase.from('customers').insert([data]);
            if (error) throw error;
            toast({ title: 'Success', description: 'Customer added successfully.' });
            fetchCustomers();
            return true;
        } catch (error) {
            console.error('Add customer error:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to add customer.',
                variant: 'destructive',
            });
            return false;
        }
    };

    const updateCustomer = async (id, data) => {
        try {
            const { error } = await supabase.from('customers').update(data).eq('id', id);
            if (error) throw error;
            toast({ title: 'Success', description: 'Customer updated successfully.' });
            fetchCustomers();
            return true;
        } catch (error) {
            console.error('Update customer error:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to update customer.',
                variant: 'destructive',
            });
            return false;
        }
    };

    const deleteCustomer = async (id) => {
        try {
            const { error } = await supabase.from('customers').delete().eq('id', id);
            if (error) throw error;
            toast({ title: 'Success', description: 'Customer deleted successfully.' });
            fetchCustomers();
            return true;
        } catch (error) {
            console.error('Delete customer error:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to delete customer.',
                variant: 'destructive',
            });
            return false;
        }
    };

    return {
        customers,
        loading,
        fetchCustomers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
    };
}
