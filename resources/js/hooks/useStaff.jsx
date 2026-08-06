import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth'; 
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';


// The provider component
export const StaffProvider = ({ children }) => {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const { token } = useAuth(); // Get the token from our auth hook

    const fetchStaff = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setStaff(data);
        } catch (error) {
            console.error("Failed to fetch staff:", error);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchStaff();
    }, [fetchStaff]);

    const addStaff = async (staffData) => {
        // Hash password before inserting
        let password = staffData.password;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            password = await bcrypt.hash(password, salt);
        }
        
        const payload = {
            name: staffData.name,
            email: staffData.email,
            password: password,
            role: staffData.role || 'cashier',
            phone: staffData.phone,
        };

        const { data, error } = await supabase.from('users').insert([payload]).select().single();
        if (error) throw error;
        
        setStaff(prevStaff => [data, ...prevStaff]);
        return data;
    };

    const updateStaff = async (staffId, staffData) => {
        const payload = { ...staffData };
        if (payload.password) {
            const salt = await bcrypt.genSalt(10);
            payload.password = await bcrypt.hash(payload.password, salt);
        } else {
            delete payload.password;
        }

        const { data, error } = await supabase.from('users').update(payload).eq('id', staffId).select().single();
        if (error) throw error;
        
        setStaff(prevStaff => prevStaff.map(s => (s.id === staffId ? data : s)));
        return data;
    };

    const deleteStaff = async (staffId) => {
        const { error } = await supabase.from('users').delete().eq('id', staffId);
        if (error) throw error;
        
        setStaff(prevStaff => prevStaff.filter(s => s.id !== staffId));
    };

    const value = {
        staff,
        loading,
        fetchStaff,
        addStaff,
        updateStaff,
        deleteStaff,
    };

    return (
        <StaffContext.Provider value={value}>
            {children}
        </StaffContext.Provider>
    );
};

// The custom hook that components will use
export const useStaff = () => {
    return useContext(StaffContext);
};
