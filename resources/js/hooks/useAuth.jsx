import { useState, useEffect, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

// Create a context to hold authentication data
const AuthContext = createContext(null);

// Create a provider component that will wrap your application
export const AuthProvider = ({ children }) => {
    // Get the user from localStorage on initial load
    const [user, setUser] = useState(() => {
        const storedUser = localStorage.getItem('authUser');
        return storedUser ? JSON.parse(storedUser) : null;
    });
    const [token, setToken] = useState(localStorage.getItem('authToken'));
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        // Since we are not using an API session, we just rely on localStorage
        if (!token || !user) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
            setToken(null);
            setUser(null);
        }
        setLoading(false);
    }, [token, user]);

    const login = (authData) => {
        localStorage.setItem('authToken', authData.token);
        localStorage.setItem('authUser', JSON.stringify(authData.user));
        setToken(authData.token);
        setUser(authData.user);

        // *** This is where the navigation happens ***
        navigate('/dashboard');
    };

    // The logout function
    const logout = async () => {
        // Clear local state and storage
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        setToken(null);
        setUser(null);
        navigate('/login'); // Navigate back to the login page
    };

    // The value provided to all children components
    const value = {
        user,
        token,
        loading,
        login,
        logout,
    };

    // We only render the children once the initial loading (token check) is complete
    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

// The custom hook that components will use to access the auth context
export const useAuth = () => {
    return useContext(AuthContext);
};
