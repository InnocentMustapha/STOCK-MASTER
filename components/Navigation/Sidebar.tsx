
import React from 'react';
import { UserRole } from '../../types';
import {
  LayoutDashboard,
  Package,
  History,
  LogOut,
  Users,
  FilePieChart,
  Box,
  Gavel,
  CreditCard,
  ShoppingCart
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: UserRole;
  onLogout: () => void;
  userName: string;
  translations: any;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, userRole, onLogout, userName, translations }) => {
  const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;
  const isSuperAdmin = userRole === UserRole.SUPER_ADMIN;

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: translations.dashboard },
  ];

  // Add inventory only for non-super-admin users
  if (!isSuperAdmin) {
    menuItems.push({ id: 'inventory', icon: Package, label: translations.inventory });
  }

  // Sales/Transactions - different label for Super Admin
  const salesLabel = isSuperAdmin ? 'Subscription Verification' : translations.transactions;
  menuItems.push({ id: 'sales', icon: History, label: salesLabel });

  // Add Sell button for Admin and Seller (not Super Admin)
  if (!isSuperAdmin) {
    menuItems.push({ id: 'sell', icon: ShoppingCart, label: 'Sell' });
    menuItems.push({ id: 'purchases', icon: Package, label: 'Purchases' }); // Add Purchases
  }

  // Motto for Super Admin, Shop Rules for others
  const rulesLabel = isSuperAdmin ? 'Motto' : (translations.rules || 'Shop Rules');
  menuItems.push({ id: 'rules', icon: Gavel, label: rulesLabel });

  if (isAdmin) {
    const usersLabel = isSuperAdmin ? 'User Accounts' : (translations.staff || 'Staff Management');
    menuItems.push({ id: 'users', icon: Users, label: usersLabel });
    menuItems.push({ id: 'reports', icon: FilePieChart, label: translations.reports });

    // Only show subscription for regular admins, not super admin
    if (!isSuperAdmin) {
      menuItems.push({ id: 'subscription', icon: CreditCard, label: 'Subscription' });
    }
  }

  if (isSuperAdmin) {
    menuItems.push({ id: 'system', icon: Box, label: 'System Console' });
  }

  return (
    <aside className="w-64 bg-slate-900 text-slate-400 h-full flex flex-col shadow-2xl border-r border-slate-800">
      <div className="p-8 flex items-center gap-3">
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
          <Box className="text-white" size={24} />
        </div>
        <span className="text-xl font-black text-white tracking-tight">STOCK MASTER</span>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 group ${activeTab === item.id
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'hover:bg-slate-800 hover:text-slate-200'
              }`}
          >
            <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
            <span className={`font-bold text-sm ${activeTab === item.id ? '' : 'text-slate-400 group-hover:text-slate-200'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      <div className="p-4 mt-auto">
        <div className="bg-slate-800/50 backdrop-blur-md border border-slate-800 rounded-3xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-black text-sm">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{userName}</p>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isAdmin ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{userRole}</p>
              </div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 justify-center py-2.5 px-3 bg-slate-800 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all text-xs font-bold border border-slate-700 hover:border-red-500/20"
          >
            <LogOut size={14} />
            {translations.logout}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
