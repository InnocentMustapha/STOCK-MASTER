
import React, { useMemo } from 'react';
import { Sale, Product } from '../../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Calculator, TrendingUp, DollarSign, Lock } from 'lucide-react';

interface ReportsProps {
  sales: Sale[];
  products: Product[];
  currency: any;
  isPremium: boolean;
}

const Reports: React.FC<ReportsProps> = ({ sales, products, currency, isPremium }) => {
  const financialSummary = useMemo(() => {
    const getLocalDateString = (dateInput: string | Date = new Date()) => {
      const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    };

    const todayStr = getLocalDateString();
    const todaysSales = sales.filter(s => getLocalDateString(s.timestamp) === todayStr);
    const totalRevenue = todaysSales.reduce((acc, s) => acc + s.totalPrice, 0);
    const totalCost = todaysSales.reduce((acc, s) => acc + (s.totalCost || 0), 0);
    const totalProfit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Profit by product (using all sales for analysis)
    const productProfitMap: any = {};
    sales.forEach(sale => {
      if (!productProfitMap[sale.productName]) productProfitMap[sale.productName] = 0;
      productProfitMap[sale.productName] += (sale.totalPrice - (sale.totalCost || 0));
    });

    const topProducts = Object.entries(productProfitMap)
      .map(([name, profit]) => ({ name, profit: Number(profit) }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);

    return { totalRevenue, totalProfit, margin, topProducts, todaysCount: todaysSales.length };
  }, [sales]);

  const formatPrice = (val: number) => {
    return `${currency.symbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Gross Margin</p>
          <div className="flex items-end gap-2">
            <h4 className="text-3xl font-black text-slate-800">{financialSummary.margin.toFixed(1)}%</h4>
            <div className="mb-1 text-emerald-500 font-bold flex items-center text-xs">
              <TrendingUp size={14} /> Healthy
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Today's Profit</p>
          <h4 className="text-3xl font-black text-emerald-600">{formatPrice(financialSummary.totalProfit)}</h4>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Today's Revenue</p>
          <h4 className="text-3xl font-black text-slate-800">{formatPrice(financialSummary.totalRevenue)}</h4>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Today's Sales</p>
          <h4 className="text-3xl font-black text-blue-600">{financialSummary.todaysCount}</h4>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
          {!isPremium && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center text-center p-8">
              <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mb-4">
                <Lock size={28} />
              </div>
              <h4 className="font-black text-slate-800 text-lg mb-2">Product Profitability Analytics</h4>
              <p className="text-sm text-slate-500 max-w-xs mb-6">Upgrade to Premium to see which products generate the most profit for your business.</p>
              <button className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-blue-100">Upgrade Now</button>
            </div>
          )}
          <h3 className="text-lg font-bold text-slate-800 mb-8 flex items-center gap-2">
            <Calculator className="text-blue-500" /> Profitability by Product
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialSummary.topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={120} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <Tooltip cursor={{ fill: 'transparent' }} formatter={(val: number) => formatPrice(val)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="profit" radius={[0, 4, 4, 0]}>
                  {financialSummary.topProducts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'][index % 5]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-3xl shadow-xl text-white relative overflow-hidden">
          {!isPremium && (
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center text-center p-8">
              <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center text-blue-400 mb-4">
                <Lock size={28} />
              </div>
              <h4 className="font-black text-white text-lg mb-2">Daily Revenue Breakdown</h4>
              <p className="text-sm text-slate-400 max-w-xs mb-6">Premium users get access to detailed historical daily profit tracking.</p>
              <button className="bg-white text-slate-900 px-6 py-3 rounded-2xl font-bold text-sm">Unlock Reports</button>
            </div>
          )}
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <DollarSign className="text-emerald-400" /> Daily Breakdown
          </h3>
          <div className="space-y-4">
            {sales.length === 0 ? (
              <p className="text-slate-500 italic py-10 text-center">No sales data recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {Array.from(new Set(sales.map(s => {
                  const d = new Date(s.timestamp);
                  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
                }))).sort().slice(-5).map(dateStr => {
                  const daySales = sales.filter(s => {
                    const d = new Date(s.timestamp);
                    const compareDate = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
                    return compareDate === dateStr;
                  });
                  const dayProfit = daySales.reduce((acc, s) => acc + (s.totalPrice - (s.totalCost || 0)), 0);
                  return (
                    <div key={dateStr} className="flex items-center justify-between p-4 bg-slate-800 rounded-2xl">
                      <div>
                        <p className="text-xs text-slate-400 font-bold uppercase">{dateStr}</p>
                        <p className="text-sm font-medium">{daySales.length} transactions</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Profit</p>
                        <p className="text-emerald-400 font-bold">{formatPrice(dayProfit)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
