
import React, { useState } from 'react';
import { Plus, Search, Calendar, Filter, Download, DollarSign, Wallet, Minus, CreditCard, AlertCircle } from 'lucide-react';
import { getLocalDateISO } from '../../utils/dateUtils';
import { formatCurrency } from '../../services/currencyUtils';

interface PayExpensesProps {
    expenses: any[];
    currency: any;
    onLogExpense: (expense: any) => Promise<void>;
    className?: string;
}

const PayExpenses: React.FC<PayExpensesProps> = ({ expenses, currency, onLogExpense, className }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Form State
    const [expenseCategory, setExpenseCategory] = useState('TRANSPORT');
    const [expenseReason, setExpenseReason] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');

    // Filter proper expenses (excluding STOCK purchases which are handled in Purchases)
    const nonStockExpenses = expenses.filter(e => e.category !== 'STOCK').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const filteredExpenses = nonStockExpenses.filter(e =>
        (e.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (e.category?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = Number(expenseAmount);
        if (isNaN(amount) || amount <= 0) return;

        if (expenseCategory === 'OTHER' && !expenseReason) {
            alert("Please specify a reason for 'Other' expenses.");
            return;
        }

        const description = expenseCategory === 'OTHER' ? expenseReason : expenseCategory;

        const newExpense = {
            date: getLocalDateISO(),
            category: expenseCategory,
            amount: amount,
            description: description,
            metadata: { reason: expenseReason }
        };

        await onLogExpense(newExpense);

        setIsAddModalOpen(false);
        // Reset form
        setExpenseReason('');
        setExpenseAmount('');
        setExpenseCategory('TRANSPORT');
    };

    const format = (val: number) => formatCurrency(val, currency);

    return (
        <div className={`space-y-6 ${className}`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative flex-1 w-full sm:w-auto">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search expenses..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full sm:w-96 pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-medium transition-all shadow-sm"
                    />
                </div>

                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-3 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-slate-500/20"
                >
                    <Minus size={20} />
                    <span>Pay Expense</span>
                </button>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="p-4 pl-6 text-xs font-black text-slate-400 uppercase tracking-wider">Date</th>
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-wider">Category</th>
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-wider">Description/Reason</th>
                                <th className="p-4 text-right text-xs font-black text-slate-400 uppercase tracking-wider">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredExpenses.length > 0 ? (
                                filteredExpenses.map((expense) => (
                                    <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 pl-6 text-sm font-bold text-slate-500">
                                            {new Date(expense.date).toLocaleDateString()}
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600">
                                                {expense.category}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm font-medium text-slate-600">
                                            {expense.description}
                                        </td>
                                        <td className="p-4 text-right text-sm font-black text-slate-800">
                                            {format(expense.amount)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center text-slate-400 font-medium">
                                        No expense records found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot className="bg-slate-50 border-t border-slate-200">
                            <tr>
                                <td colSpan={3} className="p-4 pl-6 text-sm font-black text-slate-600 text-right uppercase tracking-wider">
                                    Total Expenses
                                </td>
                                <td className="p-4 text-right text-sm font-black text-red-500">
                                    {format(totalExpenses)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Add Expenses Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                <CreditCard className="text-slate-600" />
                                Record Expense
                            </h3>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                            >
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
                                <select
                                    value={expenseCategory}
                                    onChange={(e) => setExpenseCategory(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                >
                                    <option value="TRANSPORT">Transportation</option>
                                    <option value="SALARY">Paying Salary</option>
                                    <option value="LUNCH">Lunch for Workers</option>
                                    <option value="CASUAL">Paying Casual Labor</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>

                            {expenseCategory === 'OTHER' && (
                                <div className="animate-in slide-in-from-top-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Reason</label>
                                    <input
                                        type="text"
                                        required
                                        value={expenseReason}
                                        onChange={(e) => setExpenseReason(e.target.value)}
                                        placeholder="Specify reason..."
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Amount ({currency.symbol})</label>
                                <input
                                    required
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={expenseAmount}
                                    onChange={(e) => setExpenseAmount(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors shadow-lg shadow-slate-500/20"
                                >
                                    Pay Expense
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PayExpenses;
