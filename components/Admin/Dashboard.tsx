
import React, { useState, useEffect, useMemo } from 'react';
import { Product, Sale, InventoryInsight, DailyRecord } from '../../types';
import { getInventoryInsights } from '../../services/geminiService';
import { formatCurrency } from '../../services/currencyUtils';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  Sparkles,
  RefreshCcw,
  ArrowUpRight,
  ArrowDownRight,
  Lock,
  Wallet,
  Plus,
  X,
  Package, // Added Package
  Save // Added Save icon
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell
} from 'recharts';

interface AdminDashboardProps {
  products: Product[];
  sales: Sale[];
  currency: any;
  isPremium: boolean;
  dailyRecords: DailyRecord[];
  initialCapital: number;
  onUpdateRecord: (record: DailyRecord) => Promise<void>;
  onLogExpense?: (log: any) => Promise<void>;
  expenses?: any[];
  shopName?: string;
  onSwitchToPOS?: () => void;
  showPOS?: boolean;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ products, sales, currency, isPremium, dailyRecords, initialCapital, onUpdateRecord, onLogExpense, expenses, shopName, onSwitchToPOS, showPOS }) => {
  const [insight, setInsight] = useState<InventoryInsight | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  const stats = useMemo(() => {
    const getLocalDateString = (dateInput: string | Date = new Date()) => {
      const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    };

    const todayStr = getLocalDateString();

    // Filter sales for today
    const todaysSales = sales.filter(sale => getLocalDateString(sale.timestamp) === todayStr);

    const totalSales = todaysSales.reduce((acc, sale) => acc + sale.totalPrice, 0);
    const totalCost = todaysSales.reduce((acc, sale) => acc + (sale.totalCost || 0), 0);
    const profit = totalSales - totalCost;

    // For chart, we still want the daily history
    const dailyData = sales.reduce((acc: any, sale) => {
      const date = new Date(sale.timestamp).toLocaleDateString();
      if (!acc[date]) acc[date] = { date, revenue: 0, profit: 0 };
      acc[date].revenue += sale.totalPrice;
      acc[date].profit += (sale.totalPrice - sale.totalCost);
      return acc;
    }, {});

    const chartData = Object.values(dailyData).slice(-7);
    const lowStockCount = products.filter(p => p.quantity <= p.minThreshold).length;

    return { totalSales, profit, lowStockCount, chartData, todaysSalesCount: todaysSales.length };
  }, [sales, products]);

  const capitalStats = useMemo(() => {
    if (initialCapital === 0) return { current: 0, growth: 0 };

    // Find latest record or use today
    const sorted = [...dailyRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latestInfo = sorted[0];

    if (!latestInfo) return { current: 0, growth: 0 };

    // Calculate latest day's closing balance
    const daySales = sales.filter(s => s.timestamp.startsWith(latestInfo.date));
    const revenue = daySales.reduce((acc, s) => acc + s.totalPrice, 0);

    const currentCapital = latestInfo.opening_balance + revenue - latestInfo.stock_purchases - latestInfo.other_expenses;
    const growth = ((currentCapital - initialCapital) / initialCapital) * 100;

    return { current: currentCapital, growth };
  }, [dailyRecords, sales, initialCapital]);

  const fetchInsights = async () => {
    if (!isPremium) return;
    setLoadingInsight(true);
    const res = await getInventoryInsights(products, sales);
    setInsight(res);
    setLoadingInsight(false);
  };

  useEffect(() => {
    if (sales.length > 0 && !insight && isPremium) fetchInsights();
  }, [isPremium]);

  const formatPrice = (val: number) => {
    return formatCurrency(val, currency);
  };





  return (
    <div className="space-y-6 relative">
      {/* Shop Name Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-2">
        <div>
          {shopName && (
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 tracking-tighter drop-shadow-sm mb-1 animate-in fade-in slide-in-from-left-4 duration-500">
              {shopName}
            </h1>
          )}
          <h2 className="text-xl font-bold text-slate-400 pl-1 uppercase tracking-widest">Dashboard Overview</h2>
        </div>

        {showPOS && (
          <button
            onClick={onSwitchToPOS}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-500/20"
          >
            <ShoppingCart size={20} />
            <span>Open POS</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* ... StatCards ... */}
        <StatCard
          title="Inventory Value"
          value={formatPrice(products.reduce((sum, p) => sum + (p.sellPrice * p.quantity), 0))}
          icon={<Package />} // Removed className since StatCard overrides it
          color="bg-gradient-to-br from-purple-500 to-indigo-600"
          trend="Total Potential Sales"
        />
        <StatCard
          title="Today's Revenue"
          value={formatPrice(stats.totalSales)}
          icon={<DollarSign />}
          color="bg-gradient-to-br from-emerald-400 to-emerald-600"
          trend="+12%"
        />
        <StatCard
          title="Today's Profit"
          value={formatPrice(stats.profit)}
          icon={<TrendingUp />}
          color="bg-gradient-to-br from-blue-400 to-blue-600"
          trend="+5%"
        />
        <StatCard
          title="Low Stock Items"
          value={stats.lowStockCount.toString()}
          icon={<AlertTriangle />}
          color={stats.lowStockCount > 5 ? "bg-gradient-to-br from-red-500 to-orange-600" : "bg-gradient-to-br from-orange-400 to-orange-600"}
          trend={stats.lowStockCount > 5 ? "Action Needed" : "Stable"}
        />
        <StatCard
          title="Today's Sales"
          value={stats.todaysSalesCount.toString()}
          icon={<ShoppingCart />}
          color="bg-gradient-to-br from-indigo-400 to-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions Panel */}


          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-80">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center justify-between">
              Revenue & Profit Trend
              <span className="text-xs font-normal text-slate-500">Last 7 Days</span>
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(value: number) => [formatPrice(value), ""]}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#2563eb' }} />
                  <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>

            <div className="flex items-center justify-between mb-6 z-10">
              <div className="flex items-center gap-2">
                <Sparkles className="text-blue-400" size={20} />
                <h3 className="text-lg font-bold">AI Business Advisor</h3>
              </div>
              {isPremium && (
                <button
                  onClick={fetchInsights}
                  disabled={loadingInsight}
                  className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-all disabled:opacity-50"
                >
                  <RefreshCcw size={16} className={loadingInsight ? "animate-spin" : ""} />
                </button>
              )}
            </div>

            <div className="flex-1 z-10">
              {!isPremium ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-8">
                  <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400">
                    <Lock size={32} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-white">Premium Feature</h4>
                    <p className="text-xs text-slate-400 max-w-[200px] mx-auto">
                      Unlock Gemini AI to analyze your stock and get smart business advice.
                    </p>
                  </div>
                  <button className="text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors">
                    Upgrade to Premium
                  </button>
                </div>
              ) : loadingInsight ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-800 rounded w-1/2"></div>
                  <div className="h-20 bg-slate-800 rounded"></div>
                </div>
              ) : insight ? (
                <div className="space-y-4">
                  <div className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${insight.riskLevel === 'HIGH' ? 'bg-red-500' : insight.riskLevel === 'MEDIUM' ? 'bg-orange-500' : 'bg-emerald-500'
                    }`}>
                    Risk: {insight.riskLevel}
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{insight.analysis}</p>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-blue-400 uppercase">Stock Recommendations:</p>
                    {insight.recommendations.map((rec, i) => (
                      <div key={i} className="flex gap-2 text-xs text-slate-400">
                        <div className="mt-1.5 w-1 h-1 rounded-full bg-blue-500 shrink-0"></div>
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <p className="text-xs font-bold text-emerald-400 uppercase">Business Growth Advice:</p>
                    {insight.businessGrowthAdvice.map((adv, i) => (
                      <div key={i} className="flex gap-2 text-xs text-slate-300 italic">
                        <div className="mt-1.5 w-1 h-1 rounded-full bg-emerald-500 shrink-0"></div>
                        <span>"{adv}"</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic text-center py-8">Run AI analysis for insights.</p>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  trend?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, trend }) => (
  <div className={`${color} p-5 rounded-2xl shadow-lg shadow-gray-200/50 flex flex-col justify-between h-full min-h-[140px] relative overflow-hidden group transition-all hover:scale-[1.02] hover:shadow-xl`}>
    <div className="absolute top-0 right-0 p-4 opacity-20 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
      {/* Clone icon with larger size for background effect */}
      {React.cloneElement(icon as React.ReactElement, { size: 64, className: 'text-white' })}
    </div>

    <div className="relative z-10">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg text-white shadow-inner">
          {React.cloneElement(icon as React.ReactElement, { size: 20, className: 'text-white' })}
        </div>
        <p className="text-white/90 text-sm font-bold uppercase tracking-wider">{title}</p>
      </div>

      <h4 className="text-3xl font-black text-white tracking-tight break-all">{value}</h4>
    </div>

    {trend && (
      <div className="relative z-10 mt-3 pt-3 border-t border-white/10">
        <p className="text-xs font-medium text-white/80 flex items-center gap-1">
          <span className="bg-white/20 px-1.5 py-0.5 rounded text-white font-bold">{trend}</span>
          <span className="opacity-70">vs last week</span>
        </p>
      </div>
    )}
  </div>
);

export default AdminDashboard;
