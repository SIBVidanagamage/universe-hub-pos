import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  LogOut,
  Smartphone,
  Bell,
  ShieldCheck,
  WalletCards,
  ArrowUpCircle,
  Megaphone,
  Wrench,
  Contact,
  Truck
} from 'lucide-react';

const allMenuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'billing', label: 'Billing', icon: ShoppingCart, path: '/billing' },
  { id: 'repairs', label: 'Repairs', icon: Wrench, path: '/repairs' },
  { id: 'warranty', label: 'Warranty', icon: ShieldCheck, path: '/warranty' },
  { id: 'customers', label: 'Customers', icon: Contact, path: '/customers' },
  { id: 'inventory', label: 'Inventory', icon: Package, path: '/inventory' },
  { id: 'bundles', label: 'Bundles', icon: Package, path: '/bundles' },
  { id: 'cash-out', label: 'Cash Out', icon: ArrowUpCircle, path: '/cash-out' },
  { id: 'suppliers', label: 'Suppliers', icon: Truck, path: '/suppliers' },
  { id: 'accounts', label: 'Accounts', icon: WalletCards, path: '/accounts' },
  { id: 'staff', label: 'Staff', icon: Users, path: '/staff' },
  { id: 'promotions', label: 'Promotions', icon: Megaphone, path: '/promotions' },
  { id: 'reports', label: 'Reports', icon: BarChart3, path: '/reports' },
];

// Define which roles can see which menu items
const rolePermissions = {
    admin: ['dashboard', 'billing', 'repairs', 'warranty', 'customers', 'inventory', 'bundles', 'cash-out', 'suppliers', 'accounts', 'staff', 'promotions', 'reports'],
    manager: ['dashboard', 'billing', 'repairs', 'warranty', 'customers', 'inventory', 'bundles', 'suppliers', 'promotions', 'reports'],
    cashier: ['dashboard', 'billing', 'repairs', 'warranty', 'customers', 'cash-out'],
    technician: ['repairs', 'dashboard', 'warranty'],
    viewer: ['dashboard', 'inventory', 'warranty', 'reports'],
};


// The onLogout prop is passed down from App.jsx, which gets it from useAuth
export function Sidebar({ activeTab, onLogout, user, lowStockCount, mobileOpen, onCloseMobile }) {
  const navigate = useNavigate();

  // Filter the menu items based on the user's role.
  // Defaults to an empty array if the role or permissions are not defined.
  const accessibleMenuItems = allMenuItems.filter(item =>
    (rolePermissions[user?.role] || []).includes(item.id)
  );

  const handleNavClick = (path) => {
    navigate(path);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <motion.div
        initial={false}
        className={cn(
          "w-64 h-[calc(100vh-32px)] my-4 ml-4 glass-effect flex flex-col z-50 transition-all duration-300",
          "fixed inset-y-0 left-0 md:relative md:translate-x-0",
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cosmic-purple to-cosmic-blue rounded-xl flex items-center justify-center border border-white/20 shadow-[0_0_15px_rgba(123,97,255,0.4)]">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">UNIVERSE HUB</h2>
              <p className="text-xs text-cosmic-titanium">Inventory System</p>
            </div>
          </div>
          {onCloseMobile && (
            <button 
              onClick={onCloseMobile}
              className="md:hidden text-gray-400 hover:text-white p-1 rounded-lg"
            >
              ✕
            </button>
          )}
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cosmic-blue to-cyan-400 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(0,122,255,0.3)]">
              <span className="text-sm font-bold text-white">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-cosmic-titanium capitalize">{user?.role || 'Staff'}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <div className="space-y-2">
            {/* Map over the filtered list of accessible menu items */}
            {accessibleMenuItems.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 text-cosmic-titanium hover:text-white hover:bg-white/5 transition-all rounded-xl py-6",
                  activeTab === item.id && "bg-white/10 text-white font-medium shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1),_0_0_15px_rgba(0,122,255,0.2)]"
                )}
                onClick={() => handleNavClick(item.path)} // Use navigate for tab changes
              >
                <item.icon className="w-5 h-5" />
                {item.label}
                {item.id === 'inventory' && lowStockCount > 0 && (
                  <div className="ml-auto flex items-center gap-1">
                    <Bell className="w-4 h-4 text-red-400" />
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                      {lowStockCount}
                    </span>
                  </div>
                )}
              </Button>
            ))}
          </div>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-white/10">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl"
            onClick={onLogout}
          >
            <LogOut className="w-5 h-5" />
            Logout
          </Button>
        </div>
      </motion.div>
    </>
  );
}
