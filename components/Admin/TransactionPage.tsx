import React, { useState, useMemo } from 'react';
import { Sale, Product, DailyRecord, UserRole } from '../../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    FileText, TrendingUp, TrendingDown, DollarSign, Calendar, Save, Printer,
    ArrowUpCircle, ArrowDownCircle, User
} from 'lucide-react';
import Reports from './Reports';
import { getLocalDateISO } from '../../utils/dateUtils';
import { formatCurrency } from '../../services/currencyUtils';

interface TransactionPageProps {
    sales: Sale[];
    products: Product[];
    dailyRecords: DailyRecord[];
    onUpdateRecord: (record: DailyRecord) => Promise<void>;
    currency: any;
    isPremium: boolean;
    isAdmin: boolean;
    initialCapital: number;
    onUpdateInitialCapital: (amount: number) => Promise<void>;
    users?: any[];
}

const TransactionPage: React.FC<TransactionPageProps> = ({
    sales, products, dailyRecords, onUpdateRecord, currency, isPremium, isAdmin,
    initialCapital, onUpdateInitialCapital, expenses = [], users = []
}) => {
    // ... existing state ...
    const [selectedDate, setSelectedDate] = useState(getLocalDateISO());
    const [openingBalance, setOpeningBalance] = useState('');
    const [capitalInput, setCapitalInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const format = (amount: number) => formatCurrency(amount, currency);

    // Financial calculations
    const dailyStats = useMemo(() => {
        const currentRecord = dailyRecords.find(r => r.date === selectedDate) || {
            opening_balance: 0,
            stock_purchases: 0,
            other_expenses: 0
        };

        const daySales = sales.filter(s => s.timestamp.startsWith(selectedDate));
        const totalSalesRevenue = daySales.reduce((sum, s) => sum + s.totalPrice, 0);

        // Impact Analysis
        const salesImpact = totalSalesRevenue;
        const purchaseImpact = currentRecord.stock_purchases;
        const netProfit = totalSalesRevenue - (daySales.reduce((sum, s) => sum + (s.totalCost || 0), 0)) - currentRecord.other_expenses;
        const closingBalance = totalSalesRevenue - currentRecord.stock_purchases - currentRecord.other_expenses;
        const capitalGrowth = initialCapital > 0 ? ((closingBalance - initialCapital) / initialCapital) * 100 : 0;
        const growthAmount = closingBalance - initialCapital;

        return {
            salesRevenue: totalSalesRevenue,
            salesImpact,
            purchaseImpact,
            netProfit,
            closingBalance,
            record: currentRecord,
            transactionCount: daySales.length,
            capitalGrowth,
            growthAmount
        };
    }, [sales, dailyRecords, selectedDate, initialCapital]);

    // Group sales by ALL sellers for the selected date
    const sellerStats = useMemo(() => {
        const daySales = sales.filter(s => s.timestamp.startsWith(selectedDate));

        // Map keyed by sellerId (or unique name fallback)
        const sellersMap: Record<string, { id: string, name: string, sales: Sale[], total: number }> = {};

        // 1. Initialize with all known sellers from Users list
        const sellerUsers = (users || []).filter(u => u.role === UserRole.SELLER || u.role === 'seller');
        sellerUsers.forEach(u => {
            sellersMap[u.id] = { id: u.id, name: u.name, sales: [], total: 0 };
        });

        // 2. Distribute sales
        daySales.forEach(sale => {
            // Prefer sellerId, fallback to name for legacy data
            let key = sale.sellerId;

            // If we have a name but no ID in the sale (legacy), or ID not in map yet?
            if (!key) {
                // If no ID, try to find a user with matching name to get their ID, or use name as key
                const matchingUser = sellerUsers.find(u => u.name === sale.sellerName);
                key = matchingUser ? matchingUser.id : (sale.sellerName || 'Unknown');
            }

            if (!sellersMap[key]) {
                sellersMap[key] = {
                    id: key,
                    name: sale.sellerName || 'Unknown',
                    sales: [],
                    total: 0
                };
            }

            sellersMap[key].sales.push(sale);
            sellersMap[key].total += sale.totalPrice;
        });

        return Object.values(sellersMap).sort((a, b) => b.total - a.total);
    }, [sales, selectedDate, users]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onUpdateRecord({
                id: dailyStats.record.id,
                date: selectedDate,
                opening_balance: Number(openingBalance) || dailyStats.record.opening_balance,
                stock_purchases: dailyStats.record.stock_purchases, // Purely auto-calculated now
                other_expenses: dailyStats.record.other_expenses    // Purely auto-calculated now
            } as DailyRecord);

            if (capitalInput) {
                await onUpdateInitialCapital(Number(capitalInput));
            }

            alert('Records updated successfully!');
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const generatePDF = () => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(22);
        doc.text('Daily Transaction Report', 14, 20);

        doc.setFontSize(12);
        doc.text(`Date: ${selectedDate}`, 14, 30);
        doc.text(`Generated by: Stock Master`, 14, 36);

        // Financial Summary
        autoTable(doc, {
            startY: 45,
            head: [['Metric', 'Amount']],
            body: [
                ['(+) Sales Revenue', format(dailyStats.salesRevenue)],
                ['(-) Stock Purchases', format(dailyStats.record.stock_purchases)],
                ['(-) Other Expenses', format(dailyStats.record.other_expenses)],
                ['= Closing Balance', { content: format(dailyStats.closingBalance), styles: { fontStyle: 'bold', fillColor: [240, 255, 240] } }],
                ['Current ROI', { content: `${dailyStats.capitalGrowth.toFixed(1)}%`, styles: { fontStyle: 'bold', textColor: dailyStats.capitalGrowth >= 0 ? [0, 128, 0] : [255, 0, 0] } }]
            ],
            theme: 'grid',
            headStyles: { fillColor: [66, 66, 66] }
        });

        // Sales Breakdown
        const daySales = sales.filter(s => s.timestamp.startsWith(selectedDate));
        if (daySales.length > 0) {
            doc.text('Sales Breakdown', 14, (doc as any).lastAutoTable.finalY + 15);

            autoTable(doc, {
                startY: (doc as any).lastAutoTable.finalY + 20,
                head: [['Time', 'Product', 'Qty', 'Total', 'Profit']],
                body: daySales.map(s => [
                    new Date(s.timestamp).toLocaleTimeString(),
                    s.productName,
                    s.quantity,
                    format(s.totalPrice),
                    format(s.profit)
                ]),
                theme: 'striped'
            });
        }

        doc.save(`report-${selectedDate}.pdf`);
    };

    return (
        <div className="space-y-8">
            {/* Header & Date Picker */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800">Daily Transactions</h2>
                        <p className="text-sm text-slate-500 font-medium">Tracking purchases, sales & ROI</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => {
                            setSelectedDate(e.target.value);
                            setOpeningBalance('');
                        }}
                        className="p-2 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        onClick={generatePDF}
                        className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl font-bold hover:bg-slate-700 transition-all"
                    >
                        <Printer size={18} /> Export
                    </button>
                </div>
            </div>

            {/* Investment Overview Panel */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
                    <div>
                        <h3 className="text-lg font-black text-slate-800">Investment Status</h3>
                        <p className="text-sm text-slate-500">Real-time impact of today's activities on your capital</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Shop Value</p>
                        <h2 className="text-3xl font-black text-slate-800">{format(dailyStats.closingBalance)}</h2>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Total Stock Value Display */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase">Total Inventory Value</span>
                            <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-full">Selling Price</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-3xl font-black text-slate-800">
                                {format(products.reduce((sum, p) => sum + ((p.sellPrice || 0) * (p.quantity || 0)), 0))}
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 font-medium">Potential revenue if all stock is sold</p>
                    </div>

                    {/* Today's Impact Flow */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-center space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2 text-emerald-600 font-bold">
                                <ArrowUpCircle size={16} />
                                <span>Sales (In)</span>
                            </div>
                            <span className="font-bold text-emerald-600">+{format(dailyStats.salesImpact)}</span>
                        </div>
                        <div className="w-full h-px bg-slate-200"></div>
                        <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2 text-red-500 font-bold">
                                <ArrowDownCircle size={16} />
                                <span>Purchases (Out)</span>
                            </div>
                            <span className="font-bold text-red-500">-{format(dailyStats.purchaseImpact)}</span>
                        </div>
                    </div>

                    {/* ROI Result */}
                    <div className={`p-4 rounded-2xl border flex flex-col justify-center items-center text-center ${dailyStats.netProfit >= 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                        <p className="text-xs font-bold uppercase tracking-widest mb-1">Net Profit Today</p>
                        <h3 className="text-3xl font-black">
                            {format(dailyStats.netProfit)}
                        </h3>
                        <p className="text-xs font-medium opacity-80 mt-1">
                            Sales - (Cost of Goods + Expenses)
                        </p>
                    </div>
                </div>
            </div>

            {/* Daily Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="md:col-span-3 mb-2 flex items-center gap-2 text-slate-800 font-bold border-b border-slate-100 pb-2">
                    <DollarSign size={18} />
                    <span>Daily Financial Summary</span>
                    <span className="text-xs font-normal text-slate-400 ml-2">(Auto-calculated from Purchases & Expenses)</span>
                </div>

                <div className="p-4 bg-red-50/50 rounded-2xl border border-red-100">
                    <label className="text-xs font-bold text-red-400 uppercase tracking-wider">Total Stock Purchases</label>
                    <div className="mt-1 text-2xl font-black text-red-800">
                        {format(dailyStats.record.stock_purchases)}
                    </div>
                    <p className="text-[10px] text-red-400 mt-1 font-medium">Managed in "Purchases" tab</p>
                </div>

                <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-200">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Other Expenses</label>
                    <div className="mt-1 text-2xl font-black text-slate-800">
                        {format(dailyStats.record.other_expenses)}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">Managed in "Pay Expenses" tab</p>
                </div>

                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                    <label className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Total Sales</label>
                    <div className="mt-1 text-2xl font-black text-emerald-700">
                        {format(dailyStats.salesRevenue)}
                    </div>
                    <p className="text-[10px] text-emerald-500 mt-1 font-medium">Recorded from Sales</p>
                </div>
            </div>

            {/* Daily Expenses Breakdown Table */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mt-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <FileText size={18} className="text-blue-600" />
                    Daily Expense Log
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                            <tr>
                                <th className="p-3 rounded-l-xl">Category</th>
                                <th className="p-3">Description</th>
                                <th className="p-3 text-right rounded-r-xl">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {expenses.filter(e => e.date === selectedDate).length > 0 ? (
                                expenses.filter(e => e.date === selectedDate).map((expense, i) => (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-3 font-bold text-slate-700">
                                            <span className={`px-2 py-1 rounded text-[10px] bg-slate-100 text-slate-600 uppercase`}>
                                                {expense.category}
                                            </span>
                                        </td>
                                        <td className="p-3 text-slate-600">{expense.description || '-'}</td>
                                        <td className="p-3 text-right font-black text-slate-800">
                                            {format(expense.amount)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center text-slate-400 italic">
                                        No expenses recorded for this date.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Seller Sales Breakdown */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mt-6">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <User size={18} className="text-blue-600" />
                    Seller Sales Breakdown
                </h3>

                {sellerStats.length > 0 ? (
                    <div className="space-y-8">
                        {sellerStats.map((stat) => (
                            <div key={stat.id} className="border border-slate-200 rounded-2xl overflow-hidden">
                                {/* Seller Header */}
                                <div className="bg-gradient-to-r from-blue-50 to-slate-50 p-6 border-b border-slate-200">
                                    <div className="flex items-center justify-between flex-wrap gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 text-blue-600">
                                                <User size={24} />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-800 text-xl">{stat.name}</h4>
                                                <p className="text-sm text-slate-500 font-medium">{stat.sales.length} transaction(s)</p>
                                            </div>
                                        </div>
                                        <div className="px-6 py-3 rounded-2xl border-2 bg-emerald-50 border-emerald-200">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Daily Sales</p>
                                            <p className="text-2xl font-black text-emerald-600">
                                                {format(stat.total)}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Seller Sales Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-white border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                                            <tr>
                                                <th className="p-4">Time</th>
                                                <th className="p-4">Product</th>
                                                <th className="p-4 text-right">Qty</th>
                                                <th className="p-4 text-right">Price</th>
                                                <th className="p-4 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {stat.sales.map((sale) => (
                                                <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="p-4 font-medium text-slate-500">
                                                        {new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                    <td className="p-4 font-bold text-slate-700">
                                                        {sale.productName}
                                                        {sale.metadata?.unitType && sale.metadata.unitType !== 'Single' && (
                                                            <span className="text-blue-500 font-normal ml-1 text-xs">
                                                                ({sale.metadata.unitType}) x{sale.metadata.packQuantity}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-right font-bold text-slate-600">
                                                        {sale.quantity}
                                                    </td>
                                                    <td className="p-4 text-right text-slate-500">
                                                        {format(sale.unitPrice)}
                                                    </td>
                                                    <td className="p-4 text-right font-black text-slate-800">
                                                        {format(sale.totalPrice)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-slate-50/50 border-t border-slate-100">
                                            <tr>
                                                <td colSpan={4} className="p-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                    Seller Total
                                                </td>
                                                <td className="p-4 text-right font-black text-emerald-600 text-lg">
                                                    {format(stat.total)}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-slate-400 font-medium italic">No sales recorded for this date.</p>
                    </div>
                )}
            </div>

            {/* Existing Reports Charts */}
            <div className="mt-8">
                <h3 className="text-lg font-bold text-slate-800 mb-4 px-2">Performance Analytics</h3>
                <Reports sales={sales} products={products} currency={currency} isPremium={isPremium} />
            </div>
        </div>
    );
};

export default TransactionPage;
