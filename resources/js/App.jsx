import React from 'react';
import { Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from '@/components/ui/toaster';
import { Login } from '@/components/Login';
import { Dashboard } from '@/components/Dashboard';
import { Inventory } from '@/components/Inventory';
import { Billing } from '@/components/Billing';
import { StaffManagement } from '@/components/StaffManagement';
import { Reports } from '@/components/Reports';
import { WarrantyClaims } from '@/components/WarrantyClaims';
import { AccountManagement } from '@/components/AccountManagement';
import { CashOut } from '@/components/CashOut';
import { Promotions } from '@/components/Promotions';
import { Sidebar } from '@/components/Sidebar';
import { Repairs } from '@/components/Repairs';
import { Customers } from '@/components/Customers';
import { Suppliers } from '@/components/Suppliers';
import { useAuth } from '@/hooks/useAuth';
import { useInventory, InventoryProvider } from '@/hooks/useInventory';
import { StaffProvider } from '@/hooks/useStaff';
import { Bundles } from '@/components/bundles/Bundles';
import { BundlesProvider } from '@/hooks/useBundles';
import { SalesProvider } from '@/hooks/useSales';

// This component remains the same. It protects routes from unauthenticated access.
function ProtectedRoute() {
    const { user, loading } = useAuth();
    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-900">Loading...</div>;
    }
    return user ? <Outlet /> : <Navigate to="/login" replace />;
}

// The main layout for authenticated pages, including the sidebar.
import { Starfield } from './components/Starfield';

function AppLayout() {
    const { user, logout } = useAuth();
    const { lowStockItems } = useInventory();
    const location = useLocation();
    const activeTab = location.pathname.split('/')[1] || 'dashboard';

    return (
        <div className="flex h-screen bg-cosmic-bg relative overflow-hidden text-white font-sans">
            <Starfield />
            {/* Cosmic Ambient Background Elements */}
            <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-cosmic-blue/20 rounded-full mix-blend-screen filter blur-[150px] opacity-30 animate-pulse-glow pointer-events-none z-0"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-cosmic-purple/20 rounded-full mix-blend-screen filter blur-[150px] opacity-30 animate-pulse-glow pointer-events-none z-0" style={{ animationDelay: '2s' }}></div>
            
            {/* Abstract Orbit Rings */}
            <div className="absolute top-[50%] left-[50%] w-[150vw] h-[150vw] -translate-x-1/2 -translate-y-1/2 border-[1px] border-white/[0.02] rounded-full pointer-events-none z-0"></div>
            <div className="absolute top-[50%] left-[50%] w-[120vw] h-[120vw] -translate-x-1/2 -translate-y-1/2 border-[1px] border-white/[0.03] rounded-full pointer-events-none z-0 animate-orbit"></div>
            <div className="absolute top-[50%] left-[50%] w-[90vw] h-[90vw] -translate-x-1/2 -translate-y-1/2 border-[1px] border-white/[0.04] rounded-full pointer-events-none z-0 animate-orbit" style={{ animationDirection: 'reverse', animationDuration: '120s' }}></div>

            <Sidebar
                activeTab={activeTab}
                onLogout={logout}
                user={user}
                lowStockCount={lowStockItems.length}
                className="z-10 relative"
            />
            <main className="flex-1 overflow-auto z-10 relative">
                <div className="p-6">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.key}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {/* Child routes will be rendered here */}
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}

// The main App component with the corrected routing structure.
function App() {
    const { login, user } = useAuth();

    return (
        <>
            <Helmet>
                <title>UNIVERSE HUB</title>
            </Helmet>
            <Routes>
                <Route path="/login" element={<Login onLogin={login} />} />

                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                    {/* FIX: The SalesProvider and InventoryProvider now wrap the AppLayout.
                      This makes the sales and inventory contexts available to all child routes,
                      including the Dashboard and Billing pages.
                    */}
                    <Route
                        element={
                            <InventoryProvider>
                                <SalesProvider>
                                    <AppLayout />
                                </SalesProvider>
                            </InventoryProvider>
                        }
                    >
                        {/* Define child routes that will render inside AppLayout's Outlet */}
                        <Route path="dashboard" element={<Dashboard />} />
                        <Route path="inventory" element={<Inventory />} />
                        <Route
                            path="bundles"
                            element={
                                <BundlesProvider>
                                    <Bundles />
                                </BundlesProvider>
                            }
                        />
                        <Route
                            path="billing"
                            element={
                                // Billing also needs access to bundles functionality
                                <BundlesProvider>
                                    <Billing />
                                </BundlesProvider>
                            }
                        />
                        <Route path="staff" element={<StaffProvider><StaffManagement /></StaffProvider>} />
                        <Route path="warranty" element={<WarrantyClaims />} />
                        <Route path="repairs" element={<Repairs />} />
                        <Route path="customers" element={<Customers />} />
                        <Route path="suppliers" element={['admin', 'manager'].includes(user?.role) ? <Suppliers /> : <Navigate to="/dashboard" replace />} />
                        <Route path="promotions" element={['admin', 'manager'].includes(user?.role) ? <Promotions /> : <Navigate to="/dashboard" replace />} />
                        <Route path="accounts" element={user?.role === 'admin' ? <AccountManagement /> : <Navigate to="/dashboard" replace />} />
                        <Route path="cash-out" element={['admin', 'cashier'].includes(user?.role) ? <CashOut /> : <Navigate to="/dashboard" replace />} />
                        <Route path="reports" element={<Reports />} />

                        {/* Default route for authenticated users */}
                        <Route index element={<Navigate to="/dashboard" replace />} />
                    </Route>
                </Route>
            </Routes>
            <Toaster />
        </>
    );
}

export default App;
