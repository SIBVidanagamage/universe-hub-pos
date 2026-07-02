import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth'; // To get the auth token

// Create a context for staff data
const StaffContext = createContext(null);

// API helper function
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
    // For 204 No Content, response.json() will fail
    return response.status === 204 ? null : response.json();
};


// The provider component
export const StaffProvider = ({ children }) => {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const { token } = useAuth(); // Get the token from our auth hook

    const fetchStaff = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const data = await fetchWithAuth('/api/v1/staff', {}, token);
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
        const data = await fetchWithAuth('/api/v1/staff', {
            method: 'POST',
            body: JSON.stringify(staffData),
        }, token);
        // Add new staff to the local state to update UI instantly
        setStaff(prevStaff => [...prevStaff, data]);
        return data; // Return the created user data
    };

    const updateStaff = async (staffId, staffData) => {
        const data = await fetchWithAuth(`/api/v1/staff/${staffId}`, {
            method: 'PUT',
            body: JSON.stringify(staffData),
        }, token);
        // Update the user in the local state
        setStaff(prevStaff => prevStaff.map(s => (s.id === staffId ? data : s)));
        return data;
    };

    const deleteStaff = async (staffId) => {
        await fetchWithAuth(`/api/v1/staff/${staffId}`, {
            method: 'DELETE',
        }, token);
        // Remove the user from the local state
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
