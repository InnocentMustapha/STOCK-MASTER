
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, Product, Sale, ShopRule, SubscriptionTier } from './types';
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



  useEffect(() => {
    const savedProducts = localStorage.getItem('sm_products');
    const savedSales = localStorage.getItem('sm_sales');
    const savedRules = localStorage.getItem('sm_rules');
    const savedCategories = localStorage.getItem('sm_categories');
    const savedUsers = localStorage.getItem('sm_users');

    if (savedProducts) setProducts(JSON.parse(savedProducts));
    if (savedSales) setSales(JSON.parse(savedSales));
    if (savedRules) setRules(JSON.parse(savedRules));

    if (savedUsers) {
      const parsedSaved = JSON.parse(savedUsers);
      const mergedUsers = [...userData];
      parsedSaved.forEach((su: any) => {
        if (!mergedUsers.find(u => u.username === su.username)) {
          mergedUsers.push(su);
        }
      });
      setUsers(mergedUsers as User[]);
    } else {
      setUsers(userData as User[]);
    }

    if (savedCategories) {
      setCategories(JSON.parse(savedCategories));
    } else {
      setCategories(INITIAL_CATEGORIES);
      localStorage.setItem('sm_categories', JSON.stringify(INITIAL_CATEGORIES));
    }
  }, []);

  useEffect(() => { localStorage.setItem('sm_products', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('sm_sales', JSON.stringify(sales)); }, [sales]);
  useEffect(() => { localStorage.setItem('sm_rules', JSON.stringify(rules)); }, [rules]);
  useEffect(() => { localStorage.setItem('sm_categories', JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem('sm_users', JSON.stringify(users)); }, [users]);

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

  const addSale = (newSale: Sale) => {
    const processedSale: Sale = {
      ...newSale,
      profit: newSale.totalPrice - newSale.totalCost
    };
    setSales(prev => [...prev, processedSale]);
    setProducts(prev => prev.map(p =>
      p.id === processedSale.productId ? { ...p, quantity: p.quantity - processedSale.quantity } : p
    ));
  };

  const updateInventory = (updatedProducts: Product[]) => setProducts(updatedProducts);
  const handleUpdateRules = (updatedRules: ShopRule[]) => setRules(updatedRules);

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
          <AdminDashboard products={products} sales={sales} currency={currentCurrency} isPremium={isPremium} />
        ) : (
          <SellerDashboard products={products} sales={sales} onSale={addSale} currentUser={currentUser} currency={currentCurrency} />
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
      case 'inventory':
        return (
          <InventoryManagement
            products={products}
            onUpdate={updateInventory}
            isAdmin={currentUser.role === UserRole.ADMIN}
            currency={currentCurrency}
            isSubscribed={isSubscribed}
            categories={categories}
            onUpdateCategories={setCategories}
          />
        );
      case 'sales':
        // Super Admin sees Subscription Verification, others see Sales History
        return currentUser.role === UserRole.SUPER_ADMIN ? (
          <SubscriptionVerification users={users} currency={currentCurrency} />
        ) : (
          <SalesHistory sales={sales} isAdmin={currentUser.role === UserRole.ADMIN} currency={currentCurrency} />
        );
      case 'users':
        return <UserManagement users={users} onUpdate={setUsers} currentUser={currentUser} translations={t} isSubscribed={isSubscribed} />;
      case 'reports':
        return <Reports sales={sales} products={products} currency={currentCurrency} isPremium={isPremium} />;
      case 'rules':
        // Super Admin sees Motto, others see Shop Rules
        return currentUser.role === UserRole.SUPER_ADMIN ? (
          <Motto />
        ) : (
          <ShopRules rules={rules} onUpdate={handleUpdateRules} isAdmin={currentUser.role === UserRole.ADMIN} translations={t} />
        );
      case 'subscription':
        return <Subscription currentTier={currentUser.subscription || SubscriptionTier.NONE} onUpgrade={handleUpgrade} currency={currentCurrency} trialRemaining={getTrialRemaining()} isTrialActive={trialActive} />;
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
      </main>
    </div>
  );
};

export default App;
