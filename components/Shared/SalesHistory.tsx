
import React, { useState } from 'react';
import { Sale } from '../../types';
import { ShoppingBag, Search, Calendar, User } from 'lucide-react';

interface SalesHistoryProps {
  sales: Sale[];
  isAdmin: boolean;
  currency: any;
}

const SalesHistory: React.FC<SalesHistoryProps> = ({ sales, isAdmin, currency }) => {
  const [filter, setFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const formatPrice = (val: number) => {
    return `${currency.symbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  // Group sales by date
  const groupedSales = React.useMemo(() => {
    // 1. Filter raw sales
    const filtered = sales.filter(s => {
      const matchesSearch = s.productName.toLowerCase().includes(filter.toLowerCase()) ||
        s.sellerName.toLowerCase().includes(filter.toLowerCase());

      const saleDate = new Date(s.timestamp).toLocaleDateString('en-CA'); // YYYY-MM-DD
      const matchesDate = dateFilter ? saleDate === dateFilter : true;

      return matchesSearch && matchesDate;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // 2. Group by date string
    const groups: { [date: string]: { sales: Sale[], totalRevenue: number, totalProfit: number } } = {};

    filtered.forEach(sale => {
      const dateKey = new Date(sale.timestamp).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      if (!groups[dateKey]) {
        groups[dateKey] = { sales: [], totalRevenue: 0, totalProfit: 0 };
      }

      groups[dateKey].sales.push(sale);
      groups[dateKey].totalRevenue += sale.totalPrice;
      groups[dateKey].totalProfit += sale.profit;
    });

    return groups;
  }, [sales, filter, dateFilter]);

  const sortedDates = Object.keys(groupedSales).sort((a, b) => {
    // We can pick any sale from the group to sort the dates, since they are already roughly sorted or we can parse the date string.
    // Simpler: use the timestamp of the first sale in the group (which is the latest due to previous sort)
    return new Date(groupedSales[b].sales[0].timestamp).getTime() - new Date(groupedSales[a].sales[0].timestamp).getTime();
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative max-w-sm w-full">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Search transactions..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-sm font-bold text-slate-500 whitespace-nowrap">Filter Date:</span>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/20 transition-all"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
              title="Clear Date"
            >
              <User size={0} className="hidden" /> {/* Dummy impl for layout if needed, using X is better */}
              <span className="font-black text-xs">CLEAR</span>
            </button>
          )}
        </div>
      </div>

      {sortedDates.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center">
          <ShoppingBag size={48} className="mx-auto text-slate-200 mb-4" />
          <h3 className="text-lg font-bold text-slate-800">No transactions found</h3>
          <p className="text-slate-500">Try adjusting your search or date filter.</p>
        </div>
      ) : (
        sortedDates.map(dateKey => {
          const group = groupedSales[dateKey];
          return (
            <div key={dateKey} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-5 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <Calendar size={20} />
                  </div>
                  <h3 className="text-lg font-black text-slate-800">{dateKey}</h3>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Daily Revenue</p>
                    <p className="text-lg font-black text-slate-800">{formatPrice(group.totalRevenue)}</p>
                  </div>
                  {isAdmin && (
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Daily Profit</p>
                      <p className="text-lg font-black text-emerald-500">+{formatPrice(group.totalProfit)}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                      <th className="px-6 py-3">Time</th>
                      <th className="px-6 py-3">Product</th>
                      <th className="px-6 py-3">Seller</th>
                      <th className="px-6 py-3 text-right">Qty</th>
                      <th className="px-6 py-3 text-right">Amount</th>
                      {isAdmin && <th className="px-6 py-3 text-right">Profit</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {group.sales.map(sale => (
                      <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-slate-400">
                          {new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-700 block text-xs md:text-sm">
                            {sale.productName}
                            {sale.metadata?.unitType && sale.metadata.unitType !== 'Single' && (
                              <span className="text-blue-500 font-normal ml-1">
                                ({sale.metadata.unitType}) - {sale.metadata.packQuantity} pack(s)
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ID: #{sale.id.slice(0, 6)} {sale.metadata?.unitType && sale.metadata.unitType !== 'Single' ? `• Pack Size: ${sale.metadata.packSize}` : ''}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                              {sale.sellerName.charAt(0)}
                            </div>
                            <span className="font-semibold text-slate-600">{sale.sellerName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-medium">{sale.quantity}</td>
                        <td className="px-6 py-4 text-right font-bold text-slate-800">{formatPrice(sale.totalPrice)}</td>
                        {isAdmin && (
                          <td className="px-6 py-4 text-right">
                            <span className="text-emerald-600 font-bold">+{formatPrice(sale.profit)}</span>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default SalesHistory;
