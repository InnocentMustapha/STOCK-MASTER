
import React, { useState } from 'react';
import { Plus, Search, Calendar, Filter, Download, DollarSign, User, Package, CreditCard, AlertCircle } from 'lucide-react';
import { Product } from '../../types';

interface Purchase {
    id: string;
    date: string;
    agentName: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalCost: number;
    amountPaid: number;
    amountRemained: number;
}

interface PurchasesProps {
    expenses: any[]; // We will filter for category 'STOCK'
    products: Product[];
    currency: any;
    onAddPurchase: (purchase: any) => Promise<void>;
    className?: string; // Add className prop
}

const Purchases: React.FC<PurchasesProps> = ({ expenses, products, currency, onAddPurchase, className }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Form State
    const [selectedProductId, setSelectedProductId] = useState('');
    const [agentName, setAgentName] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [unitPrice, setUnitPrice] = useState(0);
    const [amountPaid, setAmountPaid] = useState(0);

    // Derived Values
    const selectedProduct = products.find(p => p.id === selectedProductId);
    const totalCost = quantity * unitPrice;
    const amountRemained = amountPaid - totalCost; // Positive = Surplus, Negative = Debt

    // Filter Purchases from Expenses
    // We assume 'STOCK' category or similar metadata tag
    const purchases: Purchase[] = expenses
        .filter(e => e.category === 'STOCK' || e.metadata?.type === 'PURCHASE')
        .map(e => {
            const cost = e.metadata?.totalCost || e.amount;
            const paid = e.metadata?.amountPaid || e.amount;
            return {
                id: e.id,
                date: e.date,
                agentName: e.metadata?.agentName || 'Unknown',
                productName: e.metadata?.productName || e.description,
                quantity: e.metadata?.quantity || 0,
                unitPrice: e.metadata?.unitPrice || 0,
                totalCost: cost,
                amountPaid: paid,
                amountRemained: paid - cost
            };
        });

    const filteredPurchases = purchases.filter(p =>
        p.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.productName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const grandTotalPaid = filteredPurchases.reduce((sum, p) => sum + p.amountPaid, 0);
    const grandTotalRemained = filteredPurchases.reduce((sum, p) => sum + p.amountRemained, 0);
    const grandTotalCost = filteredPurchases.reduce((sum, p) => sum + p.totalCost, 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) return;

        const newPurchase = {
            category: 'STOCK',
            date: new Date().toISOString(),
            amount: amountPaid,
            description: `Stock Purchase: ${selectedProduct.name}`,
            metadata: {
                type: 'PURCHASE',
                productId: selectedProduct.id,
                productName: selectedProduct.name,
                agentName,
                quantity,
                unitPrice,
                totalCost,
                amountPaid,
                amountRemained
            }
        };

        await onAddPurchase(newPurchase);
        setIsAddModalOpen(false);
        // Reset form
        setSelectedProductId('');
        setAgentName('');
        setQuantity(1);
        setUnitPrice(0);
        setAmountPaid(0);
    };

    return (
        <div className={`space-y-6 ${className}`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative flex-1 w-full sm:w-auto">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by agent or product..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full sm:w-96 pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-medium transition-all shadow-sm"
                    />
                </div>

                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                >
                    <Plus size={20} />
                    <span>New Purchase</span>
                </button>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="p-4 pl-6 text-xs font-black text-slate-400 uppercase tracking-wider">Date</th>
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-wider">Agent</th>
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-wider">Product</th>
                                <th className="p-4 text-right text-xs font-black text-slate-400 uppercase tracking-wider">Qty</th>
                                <th className="p-4 text-right text-xs font-black text-slate-400 uppercase tracking-wider">Unit Price</th>
                                <th className="p-4 text-right text-xs font-black text-slate-400 uppercase tracking-wider">Total Cost</th>
                                <th className="p-4 text-right text-xs font-black text-slate-400 uppercase tracking-wider">Paid</th>
                                <th className="p-4 text-right text-xs font-black text-slate-400 uppercase tracking-wider">Remained</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredPurchases.length > 0 ? (
                                filteredPurchases.map((purchase) => (
                                    <tr key={purchase.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 pl-6 text-sm font-bold text-slate-500">
                                            {new Date(purchase.date).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-sm font-bold text-slate-800 flex items-center gap-2">
                                            <User size={16} className="text-slate-400" />
                                            {purchase.agentName}
                                        </td>
                                        <td className="p-4 text-sm font-bold text-slate-700">
                                            {purchase.productName}
                                        </td>
                                        <td className="p-4 text-right text-sm font-bold text-slate-800">
                                            {purchase.quantity}
                                        </td>
                                        <td className="p-4 text-right text-sm font-medium text-slate-500">
                                            {currency.symbol}{purchase.unitPrice.toLocaleString()}
                                        </td>
                                        <td className="p-4 text-right text-sm font-bold text-slate-800">
                                            {currency.symbol}{purchase.totalCost.toLocaleString()}
                                        </td>
                                        <td className="p-4 text-right text-sm font-bold text-emerald-600 bg-emerald-50/50 rounded-lg">
                                            {currency.symbol}{purchase.amountPaid.toLocaleString()}
                                        </td>
                                        <td className={`p-4 text-right text-sm font-bold ${purchase.amountRemained >= 0 ? 'text-emerald-600 bg-emerald-50/50' : 'text-red-500 bg-red-50/50'} rounded-lg`}>
                                            {purchase.amountRemained > 0 ? '+' : ''}{currency.symbol}{purchase.amountRemained.toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="p-12 text-center text-slate-400 font-medium">
                                        No purchase records found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot className="bg-slate-50 border-t border-slate-200">
                            <tr>
                                <td colSpan={5} className="p-4 pl-6 text-sm font-black text-slate-600 text-right uppercase tracking-wider">
                                    Grand Totals
                                </td>
                                <td className="p-4 text-right text-sm font-black text-slate-800">
                                    {currency.symbol}{grandTotalCost.toLocaleString()}
                                </td>
                                <td className="p-4 text-right text-sm font-black text-emerald-600">
                                    {currency.symbol}{grandTotalPaid.toLocaleString()}
                                </td>
                                <td className={`p-4 text-right text-sm font-black ${grandTotalRemained >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {grandTotalRemained > 0 ? '+' : ''}{currency.symbol}{grandTotalRemained.toLocaleString()}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Add Purchase Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                <Package className="text-blue-600" />
                                Record New Purchase
                            </h3>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                            >
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Product</label>
                                    <select
                                        required
                                        value={selectedProductId}
                                        onChange={(e) => {
                                            setSelectedProductId(e.target.value);
                                            // Auto-fill price if possible?
                                        }}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        <option value="">Select Product...</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} (Current Stock: {p.quantity})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Agent / Supplier Name</label>
                                    <input
                                        required
                                        type="text"
                                        value={agentName}
                                        onChange={(e) => setAgentName(e.target.value)}
                                        placeholder="e.g. John Doe Wholesalers"
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Quantity</label>
                                    <input
                                        required
                                        type="number"
                                        min="1"
                                        value={quantity}
                                        onChange={(e) => setQuantity(Number(e.target.value))}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Unit Price ({currency.symbol})</label>
                                    <input
                                        required
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={unitPrice}
                                        onChange={(e) => setUnitPrice(Number(e.target.value))}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>

                                <div className="col-span-2 bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex justify-between items-center">
                                    <span className="text-sm font-bold text-slate-600">Total Purchase Cost:</span>
                                    <span className="text-xl font-black text-blue-600">{currency.symbol}{totalCost.toLocaleString()}</span>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Amount Paid</label>
                                    <input
                                        required
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={amountPaid}
                                        onChange={(e) => setAmountPaid(Number(e.target.value))}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Amount Remained</label>
                                    <div className={`w-full p-3 bg-slate-100 border border-slate-200 rounded-xl font-bold ${amountRemained >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {amountRemained > 0 ? '+' : ''}{currency.symbol}{amountRemained.toLocaleString()}
                                    </div>
                                </div>
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
                                    disabled={!selectedProduct}
                                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Save Record
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Purchases;
