
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './services/supabase';
import { User, UserRole, Product, Sale, ShopRule, SubscriptionTier, DailyRecord } from './types';
import Login from './components/Auth/Login';
import Sidebar from './components/Navigation/Sidebar';
import AdminDashboard from './components/Admin/Dashboard';
import SellerDashboard from './components/Seller/Dashboard';
import InventoryManagement from './components/Shared/InventoryManagement';
import SalesHistory from './components/Shared/SalesHistory';
import MottoSplash from './components/Shared/MottoSplash';
import UserManagement from './components/Admin/UserManagement';
import Reports from './components/Admin/Reports';
import ShopRules from './components/Admin/ShopRules';
import Motto from './components/Admin/Motto';
import Subscription from './components/Admin/Subscription';
import SubscriptionVerification from './components/Admin/SubscriptionVerification';
import AIAdvisorChat from './components/Shared/AIAdvisorChat';
import TransactionPage from './components/Admin/TransactionPage';
import {
  Users, FilePieChart, Package, LayoutDashboard, History,
  Palette, Check, Globe, Banknote, ChevronDown, ShieldAlert,
  Mail, MessageCircle, Menu, X, Timer
} from 'lucide-react';
import { LANGUAGES, CURRENCIES, translations } from './locales';
import { INITIAL_CATEGORIES } from './constants';
import userData from './user-data.json';

const THEMES = [
  { id: 'classic', name: 'Classic Blue', colors: ['#2563eb', '#0f172a'] },
  { id: 'forest', name: 'Forest Green', colors: ['#059669', '#064e3b'] },
  { id: 'sunset', name: 'Sunset Rose', colors: ['#e11d48', '#fb923c'] },
  { id: 'midnight', name: 'Midnight', colors: ['#6366f1', '#020617'] },
];

const TRIAL_DAYS = 7;



const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState(localStorage.getItem('sm_theme') || 'classic');
  const [lang, setLang] = useState(localStorage.getItem('sm_lang') || 'en');
  const [currency, setCurrency] = useState(localStorage.getItem('sm_currency') || 'USD');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showMottoSplash, setShowMottoSplash] = useState(false);

  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const themePickerRef = useRef<HTMLDivElement>(null);
  const langPickerRef = useRef<HTMLDivElement>(null);
  const currencyPickerRef = useRef<HTMLDivElement>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [rules, setRules] = useState<ShopRule[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  const t = translations[lang] || translations.en;
  const currentCurrency = CURRENCIES.find(c => c.id === currency) || CURRENCIES[0];

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sm_theme', theme);
  }, [theme]);

  useEffect(() => { localStorage.setItem('sm_lang', lang); }, [lang]);
  useEffect(() => { localStorage.setItem('sm_currency', currency); }, [currency]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (themePickerRef.current && !themePickerRef.current.contains(target)) setShowThemePicker(false);
      if (langPickerRef.current && !langPickerRef.current.contains(target)) setShowLangPicker(false);
      if (currencyPickerRef.current && !currencyPickerRef.current.contains(target)) setShowCurrencyPicker(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);



  // 1. Auth & Session Management (Run once on mount)
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (profile) {
          setCurrentUser({
            id: profile.id,
            name: profile.name,
            username: profile.username,
            role: profile.role as UserRole,
            createdAt: profile.created_at,
            subscription: profile.subscription as SubscriptionTier,
            trialStartedAt: profile.trial_started_at,
            ownerId: profile.owner_id,
            initialCapital: profile.initial_capital || 0
          });
        }
      }
    };

    initAuth();

    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
        }
      }
    );

    return () => {
      authListener.unsubscribe();
    };
  }, []);

  // 2. Data Fetching & Realtime Sync (Run when currentUser changes)
  useEffect(() => {
    if (!currentUser) {
      setProducts([]);
      setSales([]);
      setRules([]);
      setUsers([]);
      return;
    }

    const shopId = currentUser.role === UserRole.SELLER ? currentUser.ownerId : currentUser.id;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch Products
        const { data: productsData } = await supabase.from('products').select('*').eq('shop_id', shopId);
        setProducts((productsData || []).map(p => ({
          id: p.id, name: p.name, sku: p.sku, category: p.category,
          buyPrice: p.buy_price, sellPrice: p.sell_price, quantity: p.quantity,
          minThreshold: p.min_threshold, discount: p.discount
        })));

        // Fetch Sales
        const { data: salesData } = await supabase.from('sales').select('*').eq('shop_id', shopId);
        setSales((salesData || []).map(s => ({
          id: s.id, productId: s.product_id, productName: s.product_name,
          quantity: s.quantity, unitPrice: s.unit_price, totalPrice: s.total_price,
          totalCost: s.total_cost || 0, profit: s.profit, timestamp: s.timestamp,
          sellerId: s.seller_id, sellerName: s.seller_name
        })));

        // Fetch Rules
        const { data: rulesData } = await supabase.from('shop_rules').select('*').eq('shop_id', shopId);
        setRules((rulesData || []).map(r => ({
          id: r.id, title: r.title, content: r.content, updatedAt: r.updated_at
        })));

        // Fetch Categories
        const { data: categoriesData } = await supabase.from('categories').select('name').eq('shop_id', shopId);
        if (categoriesData && categoriesData.length > 0) {
          setCategories(categoriesData.map(c => c.name));
        } else {
          setCategories(INITIAL_CATEGORIES);
          // Only seed if Admin
          if (currentUser.role !== UserRole.SELLER) {
            for (const name of INITIAL_CATEGORIES) {
              await supabase.from('categories').insert([{ shop_id: shopId, name }]);
            }
          }
        }

        // Fetch Daily Records
        const { data: recordsData } = await supabase.from('daily_records').select('*').eq('shop_id', shopId);
        setDailyRecords((recordsData || []).map(r => ({
          id: r.id,
          shop_id: r.shop_id,
          date: r.date,
          opening_balance: r.opening_balance,
          stock_purchases: r.stock_purchases,
          stock_purchases: r.stock_purchases,
          other_expenses: r.other_expenses
        })));

        // Fetch Expense Logs
        const { data: expensesData } = await supabase.from('expense_logs').select('*').eq('shop_id', shopId);
        setExpenses((expensesData || []).map(e => ({
          id: e.id,
          date: e.date,
          category: e.category,
          amount: e.amount,
          description: e.description,
          metadata: e.metadata
        })));

        // Fetch Users (Staff Management)
        let profilesQuery = supabase.from('profiles').select('*');
        if (currentUser.role === UserRole.ADMIN) {
          profilesQuery = profilesQuery.eq('owner_id', currentUser.id);
        } else if (currentUser.role === UserRole.SUPER_ADMIN) {
          // Super admin sees everyone or we can specificy
        }

        const { data: profilesData } = await profilesQuery;
        setUsers((profilesData || []).map(p => ({
          id: p.id, name: p.name, username: p.username, role: p.role as UserRole,
          createdAt: p.created_at, subscription: p.subscription as SubscriptionTier,
          trialStartedAt: p.trial_started_at, ownerId: p.owner_id
        })));

      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Realtime Subscriptions
    const channels = [
      supabase.channel('products-sync').on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `shop_id=eq.${shopId}` }, () => fetchData()).subscribe(),
      supabase.channel('sales-sync').on('postgres_changes', { event: '*', schema: 'public', table: 'sales', filter: `shop_id=eq.${shopId}` }, () => fetchData()).subscribe(),
      supabase.channel('categories-sync').on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: `shop_id=eq.${shopId}` }, () => fetchData()).subscribe(),
      supabase.channel('daily-records-sync').on('postgres_changes', { event: '*', schema: 'public', table: 'daily_records', filter: `shop_id=eq.${shopId}` }, () => fetchData()).subscribe(),
      supabase.channel('expenses-sync').on('postgres_changes', { event: '*', schema: 'public', table: 'expense_logs', filter: `shop_id=eq.${shopId}` }, () => fetchData()).subscribe(),
      supabase.channel('profile-sync').on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${currentUser.id}`
      }, (payload) => {
        const p = payload.new;
        setCurrentUser(prev => prev ? {
          ...prev,
          name: p.name,
          username: p.username,
          role: p.role as UserRole,
          subscription: p.subscription as SubscriptionTier,
          trialStartedAt: p.trial_started_at,
          ownerId: p.owner_id,
          initialCapital: p.initial_capital || 0
        } : null);
      }).subscribe()
    ];

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [currentUser]);






  const handleLogin = (user: User) => {
    setCurrentUser(user);
    // Show motto splash for non-super-admin users
    if (user.role !== UserRole.SUPER_ADMIN) {
      setShowMottoSplash(true);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  const handleUpgrade = (tier: SubscriptionTier) => {
    if (!currentUser) return;

    // Local update only
    const updatedUser = { ...currentUser, subscription: tier };
    setCurrentUser(updatedUser);
  };

  const isTrialActive = () => {
    if (!currentUser?.trialStartedAt) return false;
    const start = new Date(currentUser.trialStartedAt).getTime();
    const now = new Date().getTime();
    const diffDays = (now - start) / (1000 * 60 * 60 * 24);
    return diffDays <= TRIAL_DAYS;
  };

  const getTrialRemaining = () => {
    if (!currentUser?.trialStartedAt) return 0;
    const start = new Date(currentUser.trialStartedAt).getTime();
    const now = new Date().getTime();
    const diffDays = (now - start) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(TRIAL_DAYS - diffDays));
  };

  const addSale = async (newSale: Sale) => {
    try {
      const shopId = currentUser?.role === UserRole.SELLER ? currentUser.ownerId : currentUser?.id;

      // 1. Insert into Sales table
      const dbSale = {
        shop_id: shopId,
        product_id: newSale.productId,
        product_name: newSale.productName,
        quantity: newSale.quantity,
        unit_price: newSale.unitPrice,
        total_price: newSale.totalPrice,
        total_cost: newSale.totalCost,
        profit: newSale.totalPrice - newSale.totalCost,
        seller_id: currentUser?.id,
        seller_name: currentUser?.name || 'Unknown',
        timestamp: new Date().toISOString()
      };

      const { data: insertedSale, error: saleError } = await supabase
        .from('sales')
        .insert([dbSale])
        .select()
        .single();

      if (saleError) throw saleError;

      // 2. Update Product Quantity
      const productToUpdate = products.find(p => p.id === newSale.productId);
      if (productToUpdate) {
        const { error: updateError } = await supabase
          .from('products')
          .update({ quantity: productToUpdate.quantity - newSale.quantity })
          .eq('id', productToUpdate.id);

        if (updateError) throw updateError;
      }

      // 3. Update Local State (Optimistic or Refresh)
      // Refreshing entire list is safer but slower. 
      // Let's just update local state to match DB result.

      const processedSale: Sale = {
        ...newSale,
        id: insertedSale.id,
        profit: insertedSale.profit,
        timestamp: insertedSale.timestamp,
        sellerId: insertedSale.seller_id,
        sellerName: insertedSale.seller_name
      };

      setSales(prev => [...prev, processedSale]);
      setProducts(prev => prev.map(p =>
        p.id === newSale.productId ? { ...p, quantity: p.quantity - newSale.quantity } : p
      ));

    } catch (err) {
      console.error('Error adding sale:', err);
      alert('Failed to record sale. Please try again.');
    }
  };

  const addProduct = async (product: Product) => {
    if (!currentUser || (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.SUPER_ADMIN)) {
      alert('Unauthorized: Only Shop Owners can add products.');
      return;
    }
    try {
      // Prepare DB object (remove ID to let DB generate it, or use empty string handling if my schema allows)
      // Schema says id default gen_random_uuid().
      // My previous InventoryManagement code passed empty string for ID if new.
      // So I should just omit ID or pass undefined if I can.

      const { id, ...rest } = product; // Remove ID to let Postgres generate it

      const shopId = currentUser?.role === UserRole.SELLER ? currentUser.ownerId : currentUser?.id;

      // Map camelCase to snake_case
      const dbProduct = {
        shop_id: shopId,
        name: rest.name,
        sku: rest.sku,
        category: rest.category,
        buy_price: rest.buyPrice,
        sell_price: rest.sellPrice,
        quantity: rest.quantity,
        min_threshold: rest.minThreshold,
        discount: rest.discount
      };

      const { data, error } = await supabase.from('products').insert([dbProduct]).select().single();
      if (error) throw error;

      // Map back to camelCase
      const newHelper: Product = {
        id: data.id,
        name: data.name,
        sku: data.sku,
        category: data.category,
        buyPrice: data.buy_price,
        sellPrice: data.sell_price,
        quantity: data.quantity,
        minThreshold: data.min_threshold,
        discount: data.discount
      };

      setProducts(prev => [...prev, newHelper]);
    } catch (err: any) {
      console.error('Error adding product:', err);
      alert('Failed to add product: ' + err.message);
    }
  };

  const editProduct = async (product: Product) => {
    if (!currentUser || (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.SUPER_ADMIN)) {
      alert('Unauthorized: Only Shop Owners can edit products.');
      return;
    }
    try {
      const shopId = currentUser?.role === UserRole.SELLER ? currentUser.ownerId : currentUser?.id;

      const dbProduct = {
        shop_id: shopId,
        name: product.name,
        sku: product.sku,
        category: product.category,
        buy_price: product.buyPrice,
        sell_price: product.sellPrice,
        quantity: product.quantity,
        min_threshold: product.minThreshold,
        discount: product.discount
      };

      const { error } = await supabase
        .from('products')
        .update(dbProduct)
        .eq('id', product.id);

      if (error) throw error;

      setProducts(prev => prev.map(p => p.id === product.id ? product : p));

    } catch (err: any) {
      console.error('Error editing product:', err);
      alert('Failed to update product: ' + err.message);
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!currentUser || (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.SUPER_ADMIN)) {
      alert('Unauthorized: Only Shop Owners can delete products.');
      return;
    }
    try {
      const shopId = currentUser?.role === UserRole.SELLER ? currentUser.ownerId : currentUser?.id;
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('shop_id', shopId); // Extra safety layer

      if (error) throw error;
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (err: any) {
      console.error('Error deleting product:', err);
      alert('Failed to delete product: ' + err.message);
    }
  };
  const handleUpdateRules = async (updatedRules: ShopRule[]) => {
    if (!currentUser || (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.SUPER_ADMIN)) {
      alert('Unauthorized: Only Shop Owners can update shop rules.');
      return;
    }
    try {
      // Assuming we have a fixed set of rules or we update them all
      // For simplicity, if we have multiple rules, we might want to update them individually or clear/insert
      // But usually, ShopRules component updates a specific rule.
      // Let's implement a robust update for the whole set if that's how it's used, 
      // or better, handle individual updates.

      setRules(updatedRules);

      const shopId = currentUser?.role === UserRole.SELLER ? currentUser.ownerId : currentUser?.id;

      // Persistence logic:
      for (const rule of updatedRules) {
        const { error } = await supabase
          .from('shop_rules')
          .upsert({
            id: rule.id.length > 10 ? rule.id : undefined, // only use id if it's a UUID
            shop_id: shopId,
            title: rule.title,
            content: rule.content,
            updated_at: new Date().toISOString()
          });
        if (error) throw error;
      }
    } catch (err: any) {
      console.error('Error updating rules:', err);
      alert('Failed to save rules: ' + err.message);
    }
  };

  const handleUpdateCategories = async (updatedCategories: string[]) => {
    if (!currentUser || (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.SUPER_ADMIN)) {
      alert('Unauthorized: Only Shop Owners can update categories.');
      return;
    }

    try {
      const shopId = currentUser?.role === UserRole.SELLER ? currentUser.ownerId : currentUser?.id;
      setCategories(updatedCategories);

      // Persistence: Clear and Re-insert
      await supabase.from('categories').delete().eq('shop_id', shopId);

      const newRows = updatedCategories.map(name => ({ shop_id: shopId, name }));
      const { error } = await supabase.from('categories').insert(newRows);

      if (error) throw error;
    } catch (err: any) {
      console.error('Error updating categories:', err);
      alert('Failed to save categories to cloud: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentUser) return <Login onLogin={handleLogin} />;

  const trialActive = isTrialActive();
  const isAdminOrSuper = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPER_ADMIN;
  const isSubscribed = (currentUser.subscription && currentUser.subscription !== SubscriptionTier.NONE) || trialActive || currentUser.role === UserRole.SELLER || currentUser.role === UserRole.SUPER_ADMIN;
  const isPremium = currentUser.subscription === SubscriptionTier.PREMIUM || trialActive || currentUser.role === UserRole.SELLER || currentUser.role === UserRole.SUPER_ADMIN;

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPER_ADMIN ? (
          <AdminDashboard
            products={products}
            sales={sales}
            currency={currentCurrency}
            isPremium={isPremium}
            dailyRecords={dailyRecords}
            initialCapital={currentUser.initialCapital || 0}
            onUpdateRecord={async (record) => {
              const shopId = currentUser.role === UserRole.SELLER ? currentUser.ownerId : currentUser.id;
              const { error } = await supabase.from('daily_records').upsert({ ...record, shop_id: shopId });
              if (error) alert('Error updating record: ' + error.message);
            }}
            onLogExpense={async (log) => {
              const shopId = currentUser.role === UserRole.SELLER ? currentUser.ownerId : currentUser.id;
              const { error } = await supabase.from('expense_logs').insert({ ...log, shop_id: shopId });
              if (error) console.error('Error logging expense:', error);
            }}
            expenses={expenses}
          />
        ) : (
          <SellerDashboard
            products={products}
            sales={sales}
            onSale={addSale}
            currentUser={currentUser}
            currency={currentCurrency}
            categories={categories}
          />
        );
      case 'system':
        return (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-2xl font-black text-slate-800 mb-6">System Console</h2>
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-slate-600 font-medium">Developer restricted area for system logs and global configurations.</p>
              <div className="mt-6 space-y-4">
                <div className="p-4 bg-white rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">System Status</p>
                  <p className="text-emerald-500 font-black">All systems operational</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Users</p>
                  <p className="text-slate-800 font-black">{users.length}</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">System Maintenance</p>
                  <button
                    onClick={() => {
                      if (confirm('⚠️ WARNING: This will clear ALL local data including users, products, sales, and settings. This action cannot be undone. Continue?')) {
                        localStorage.clear();
                        window.location.reload();
                      }
                    }}
                    className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                    Clear All Data & Reset System
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'sell':
        return (
          <SellerDashboard
            products={products}
            sales={sales}
            onSale={addSale}
            currentUser={currentUser}
            currency={currentCurrency}
            categories={categories}
          />
        );
      case 'inventory':
        return (
          <InventoryManagement
            products={products}
            onAdd={addProduct}
            onEdit={editProduct}
            onDelete={deleteProduct}
            isAdmin={currentUser.role === UserRole.ADMIN}
            currency={currentCurrency}
            isSubscribed={isSubscribed}
            categories={categories}
            onUpdateCategories={handleUpdateCategories}
          />
        );
      case 'sales':
        // Super Admin sees Subscription Verification, others see Sales History
        return currentUser.role === UserRole.SUPER_ADMIN ? (
          <SubscriptionVerification
            users={users}
            currency={currentCurrency}
            currentUser={currentUser}
            onUpdateUser={(userId, updates) => setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u))}
          />
        ) : (
          <SalesHistory sales={sales} isAdmin={currentUser.role === UserRole.ADMIN} currency={currentCurrency} />
        );
      case 'users':
        return <UserManagement users={users} onUpdate={setUsers} currentUser={currentUser} translations={t} isSubscribed={isSubscribed} />;
      case 'reports':
        return (
          <TransactionPage
            sales={sales}
            products={products}
            dailyRecords={dailyRecords}
            onUpdateRecord={async (record) => {
              const shopId = currentUser.role === UserRole.SELLER ? currentUser.ownerId : currentUser.id;
              const { error } = await supabase.from('daily_records').upsert({ ...record, shop_id: shopId });
              if (error) {
                alert('Error updating record: ' + error.message);
              }
            }}
            currency={currentCurrency}
            isPremium={isPremium}
            isAdmin={currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPER_ADMIN}
            initialCapital={currentUser.initialCapital || 0}
            onUpdateInitialCapital={async (amount) => {
              if (!currentUser) return;
              const { error } = await supabase.from('profiles').update({ initial_capital: amount }).eq('id', currentUser.id);
              if (error) alert('Failed to update capital: ' + error.message);
            }}
          />
        );
      case 'rules':
        // Super Admin sees Motto, others see Shop Rules
        return currentUser.role === UserRole.SUPER_ADMIN ? (
          <Motto />
        ) : (
          <ShopRules rules={rules} onUpdate={handleUpdateRules} isAdmin={currentUser.role === UserRole.ADMIN} translations={t} />
        );
      case 'subscription':
        return <Subscription currentUser={currentUser} onUpgrade={handleUpgrade} currency={currentCurrency} trialRemaining={getTrialRemaining()} isTrialActive={trialActive} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden" data-theme={theme}>
      {/* Motto Splash Screen for non-super-admin users */}
      {showMottoSplash && (
        <MottoSplash onComplete={() => setShowMottoSplash(false)} />
      )}

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 transform lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => { setActiveTab(tab); setIsSidebarOpen(false); }}
          userRole={currentUser.role}
          onLogout={handleLogout}
          userName={currentUser.name}
          translations={t}
        />
      </div>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col w-full relative">
        <div className="max-w-7xl mx-auto w-full flex-1">
          {trialActive && currentUser.role === UserRole.ADMIN && activeTab !== 'subscription' && (
            <div className="mb-6 p-4 bg-emerald-500 text-white rounded-2xl flex items-center justify-between shadow-lg shadow-emerald-100 animate-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Timer size={20} />
                </div>
                <div>
                  <p className="font-black text-sm uppercase tracking-wider">Free Trial Active</p>
                  <p className="text-xs font-medium text-emerald-50 opacity-90">You have {getTrialRemaining()} days of Premium features left for free.</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('subscription')}
                className="bg-white text-emerald-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 transition-all active:scale-95 shadow-sm"
              >
                Upgrade Now
              </button>
            </div>
          )}

          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 relative">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-600 active:scale-95 transition-all"
              >
                <div className="flex flex-col gap-1 w-6 items-center">
                  <div className="h-0.5 w-full bg-slate-600 rounded-full"></div>
                  <div className="h-0.5 w-full bg-slate-600 rounded-full"></div>
                  <div className="h-0.5 w-full bg-slate-600 rounded-full"></div>
                </div>
              </button>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
                  {t[activeTab] || activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </h1>
                <p className="text-slate-500 text-xs md:text-sm font-medium">Monitoring activity as <span className="text-blue-600 font-bold">{currentUser.role}</span></p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 ml-auto">
              <div className="relative" ref={currencyPickerRef}>
                <button
                  onClick={() => setShowCurrencyPicker(!showCurrencyPicker)}
                  className="flex items-center gap-2 bg-white px-3 py-2.5 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-500 hover:text-blue-600 transition-all active:scale-95"
                >
                  <Banknote size={18} />
                  <span className="text-xs font-bold">{currentCurrency.id} ({currentCurrency.symbol})</span>
                  <ChevronDown size={14} className={`transition-transform duration-200 ${showCurrencyPicker ? 'rotate-180' : ''}`} />
                </button>
                {showCurrencyPicker && (
                  <div className="absolute right-0 mt-3 w-48 bg-white rounded-3xl shadow-2xl border border-slate-100 p-2 z-[60] animate-in fade-in slide-in-from-top-2">
                    {CURRENCIES.map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setCurrency(c.id); setShowCurrencyPicker(false); }}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-semibold ${currency === c.id ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-50'}`}
                      >
                        <span>{c.name}</span>
                        <span className="font-bold">{c.symbol}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative" ref={langPickerRef}>
                <button
                  onClick={() => setShowLangPicker(!showLangPicker)}
                  className="flex items-center gap-2 bg-white px-3 py-2.5 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-500 hover:text-blue-600 transition-all active:scale-95"
                >
                  <Globe size={18} />
                  <span className="text-xs font-bold uppercase">{lang}</span>
                  <ChevronDown size={14} className={`transition-transform duration-200 ${showLangPicker ? 'rotate-180' : ''}`} />
                </button>
                {showLangPicker && (
                  <div className="absolute right-0 mt-3 w-48 bg-white rounded-3xl shadow-2xl border border-slate-100 p-2 z-[60] animate-in fade-in slide-in-from-top-2">
                    {LANGUAGES.map(l => (
                      <button
                        key={l.id}
                        onClick={() => { setLang(l.id); setShowLangPicker(false); }}
                        className={`w-full flex items-center gap-3 p-3 rounded-2xl text-xs font-semibold ${lang === l.id ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-50'}`}
                      >
                        <span>{l.flag}</span>
                        <span>{l.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative" ref={themePickerRef}>
                <button
                  onClick={() => setShowThemePicker(!showThemePicker)}
                  className="p-2.5 bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-blue-500 hover:text-blue-600 transition-all active:scale-95"
                >
                  <Palette size={20} />
                </button>
                {showThemePicker && (
                  <div className="absolute right-0 mt-3 w-56 bg-white rounded-3xl shadow-2xl border border-slate-100 p-3 z-[60] animate-in fade-in slide-in-from-top-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-3">Themes</p>
                    <div className="space-y-1">
                      {THEMES.map(t => (
                        <button
                          key={t.id}
                          onClick={() => { setTheme(t.id); setShowThemePicker(false); }}
                          className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all ${theme === t.id ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-50'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex -space-x-1.5">
                              <div className="w-5 h-5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: t.colors[0] }}></div>
                              <div className="w-5 h-5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: t.colors[1] }}></div>
                            </div>
                            <span className="text-sm font-semibold">{t.name}</span>
                          </div>
                          {theme === t.id && <Check size={16} strokeWidth={3} />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>
          {renderContent()}
        </div>

        <footer className="mt-12 py-8 border-t border-slate-200 w-full max-w-7xl mx-auto flex flex-col gap-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Developed by</p>
              <h4 className="text-lg font-black text-slate-800 tracking-tight">INNOCENT MUSTAPHA</h4>
              <div className="flex items-center gap-2 text-slate-500 text-sm mt-1 justify-center md:justify-start">
                <Mail size={14} className="text-blue-500" />
                <a href="mailto:innocentmustapha36@gmail.com" className="hover:text-blue-600 transition-colors">
                  innocentmustapha36@gmail.com
                </a>
              </div>
            </div>

            <div className="flex flex-col items-center md:items-end gap-2 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Get in touch</p>
              <a
                href="https://wa.me/255678159460"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-100 transition-all active:scale-95 group"
              >
                <MessageCircle size={20} className="group-hover:rotate-12 transition-transform" />
                Contact on WhatsApp
              </a>
            </div>
          </div>
          <div className="text-center pt-4 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em]">
              © {new Date().getFullYear()} STOCK MASTER. All Rights Reserved.
            </p>
          </div>
        </footer>

        {currentUser && (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPER_ADMIN) && (
          <AIAdvisorChat products={products} sales={sales} />
        )}
      </main>
    </div>
  );
};

export default App;
