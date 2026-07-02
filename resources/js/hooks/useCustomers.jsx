import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
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
            const response = await axios.get('/api/v1/customers', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCustomers(response.data);
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
            await axios.post('/api/v1/customers', data, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast({ title: 'Success', description: 'Customer added successfully.' });
            fetchCustomers();
            return true;
        } catch (error) {
            console.error('Add customer error:', error);
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to add customer.',
                variant: 'destructive',
            });
            return false;
        }
    };

    const updateCustomer = async (id, data) => {
        try {
            await axios.put(`/api/v1/customers/${id}`, data, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast({ title: 'Success', description: 'Customer updated successfully.' });
            fetchCustomers();
            return true;
        } catch (error) {
            console.error('Update customer error:', error);
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to update customer.',
                variant: 'destructive',
            });
            return false;
        }
    };

    const deleteCustomer = async (id) => {
        try {
            await axios.delete(`/api/v1/customers/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast({ title: 'Success', description: 'Customer deleted successfully.' });
            fetchCustomers();
            return true;
        } catch (error) {
            console.error('Delete customer error:', error);
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to delete customer.',
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
