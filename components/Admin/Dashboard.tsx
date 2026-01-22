
import React, { useState, useEffect, useMemo } from 'react';
import { Product, Sale, InventoryInsight } from '../../types';
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
  Lock
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
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ products, sales, currency, isPremium }) => {
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Revenue"
          value={formatPrice(stats.totalSales)}
          icon={<DollarSign className="text-emerald-600" />}
          color="bg-emerald-50"
          trend="+12%"
        />
        <StatCard
          title="Today's Profit"
          value={formatPrice(stats.profit)}
          icon={<TrendingUp className="text-blue-600" />}
          color="bg-blue-50"
          trend="+5%"
        />
        <StatCard
          title="Low Stock Items"
          value={stats.lowStockCount.toString()}
          icon={<AlertTriangle className="text-orange-600" />}
          color="bg-orange-50"
          trend={stats.lowStockCount > 5 ? "Action Needed" : "Stable"}
        />
        <StatCard
          title="Today's Sales"
          value={stats.todaysSalesCount.toString()}
          icon={<ShoppingCart className="text-purple-600" />}
          color="bg-purple-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center justify-between">
            Revenue & Profit Trend
            <span className="text-xs font-normal text-slate-500">Last 7 Days</span>
          </h3>
          <div className="h-80">
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
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start justify-between">
    <div className="space-y-3">
      <p className="text-slate-500 text-sm font-medium">{title}</p>
      <h4 className="text-2xl font-bold text-slate-800">{value}</h4>
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-semibold ${trend.includes('+') ? 'text-emerald-600' : 'text-slate-400'}`}>
          {trend.includes('+') ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {trend}
        </div>
      )}
    </div>
    <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
  </div>
);

export default AdminDashboard;
