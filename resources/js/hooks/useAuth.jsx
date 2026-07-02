import { useState, useEffect, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

// Create a context to hold authentication data
const AuthContext = createContext(null);

// Create a provider component that will wrap your application
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    // Get the token from localStorage on initial load
    const [token, setToken] = useState(localStorage.getItem('authToken'));
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        // This effect runs when the component mounts or the token changes.
        // If a token exists, it fetches the user's profile to verify the token
        // and get up-to-date user information.
        const fetchUser = async () => {
            if (token) {
                try {
                    const response = await fetch('/api/user', {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/json',
                        },
                    });
                    if (response.ok) {
                        const userData = await response.json();
                        setUser(userData);
                    } else {
                        // If token is invalid, clear it
                        localStorage.removeItem('authToken');
                        setToken(null);
                        setUser(null);
                    }
                } catch (error) {
                    console.error("Failed to fetch user:", error);
                    localStorage.removeItem('authToken');
                    setToken(null);
                    setUser(null);
                }
            }
            setLoading(false);
        };

        fetchUser();
    }, [token]);

    // The login function to be called from the Login component
    const login = (authData) => {
        // authData is the response from your Laravel /api/login endpoint
        localStorage.setItem('authToken', authData.token);
        setToken(authData.token);
        // REMOVED: setUser(authData.user); - This was the cause of the issue.

        // *** This is where the navigation happens ***
        navigate('/dashboard');
    };

    // The logout function
    const logout = async () => {
        if (token) {
            try {
                await fetch('/api/logout', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                });
            } catch (error) {
                console.error("API logout failed, logging out client-side.", error);
            }
        }
        // Clear local state and storage
        localStorage.removeItem('authToken');
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
