
import React, { useState } from 'react';
import { Plus, Search, Calendar, Filter, Download, DollarSign, User, Package, CreditCard, AlertCircle, Trash2 } from 'lucide-react';
import { Product } from '../../types';
import { getLocalDateISO } from '../../utils/dateUtils';
import { formatCurrency } from '../../services/currencyUtils';

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
    categories: string[];
    currency: any;
    onAddPurchase: (purchase: any) => Promise<void>;
    onDeletePurchase: (id: string, purchaseData: any) => Promise<void>; // Added onDeletePurchase
    className?: string; // Add className prop
}

const Purchases: React.FC<PurchasesProps> = ({ expenses, products, categories, currency, onAddPurchase, onDeletePurchase, className }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Form State
    const [productInput, setProductInput] = useState(''); // Text input for product
    const [agentName, setAgentName] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [unitPrice, setUnitPrice] = useState(0);
    const [amountPaid, setAmountPaid] = useState(0);

    // New Fields for Product Creation
    const [category, setCategory] = useState(categories && categories.length > 0 ? categories[0] : 'Uncategorized');
    const [sellingPrice, setSellingPrice] = useState(0);

    // Derived Values
    // Try to find matching existing product by name (case insensitive)
    const matchingProduct = products.find(p => p.name.toLowerCase() === productInput.toLowerCase());

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
        if (!productInput) return;

        const newPurchase = {
            category: 'STOCK',
            date: getLocalDateISO(),
            amount: amountPaid,
            description: `Stock Purchase: ${productInput}`,
            metadata: {
                type: 'PURCHASE',
                productId: matchingProduct?.id, // Use ID if found, otherwise undefined (App.tsx will skip usage update)
                productName: productInput,      // Always use the typed name
                category: matchingProduct ? matchingProduct.category : category, // Use existing or new category
                sellingPrice: matchingProduct ? matchingProduct.price : sellingPrice, // Use existing or new price
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
        setProductInput('');
        setAgentName('');
        setQuantity(1);
        setUnitPrice(0);
        setAmountPaid(0);
        setSellingPrice(0);
        setCategory(categories && categories.length > 0 ? categories[0] : 'Uncategorized');
    };

    const format = (val: number) => formatCurrency(val, currency);

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
                                <th className="p-4 text-right text-xs font-black text-slate-400 uppercase tracking-wider">Action</th>
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
                                            {format(purchase.unitPrice)}
                                        </td>
                                        <td className="p-4 text-right text-sm font-bold text-slate-800">
                                            {format(purchase.totalCost)}
                                        </td>
                                        <td className="p-4 text-right text-sm font-bold text-emerald-600 bg-emerald-50/50 rounded-lg">
                                            {format(purchase.amountPaid)}
                                        </td>
                                        <td className={`p-4 text-right text-sm font-bold ${purchase.amountRemained >= 0 ? 'text-emerald-600 bg-emerald-50/50' : 'text-red-500 bg-red-50/50'} rounded-lg`}>
                                            {purchase.amountRemained > 0 ? '+' : ''}{format(purchase.amountRemained)}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => {
                                                    if (window.confirm('Are you sure you want to delete this purchase? detailed records and stock will be reverted.')) {
                                                        onDeletePurchase(purchase.id, purchase);
                                                    }
                                                }}
                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                title="Delete Record"
                                            >
                                                <Trash2 size={16} />
                                            </button>
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
                                    {format(grandTotalCost)}
                                </td>
                                <td className="p-4 text-right text-sm font-black text-emerald-600">
                                    {format(grandTotalPaid)}
                                </td>
                                <td className={`p-4 text-right text-sm font-black ${grandTotalRemained >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {grandTotalRemained > 0 ? '+' : ''}{format(grandTotalRemained)}
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
                                    <div className="relative">
                                        <input
                                            required
                                            list="product-suggestions"
                                            type="text"
                                            value={productInput}
                                            onChange={(e) => setProductInput(e.target.value)}
                                            placeholder="Type product name..."
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        />
                                        <datalist id="product-suggestions">
                                            {products.map(p => (
                                                <option key={p.id} value={p.name}>Current Stock: {p.quantity}</option>
                                            ))}
                                        </datalist>
                                        {matchingProduct && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                                                Linked (Stock: {matchingProduct.quantity})
                                            </div>
                                        )}
                                        {!matchingProduct && productInput && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                                                New / Untracked
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1 pl-1">
                                        Select from list to update stock, or type new to just record expense.
                                    </p>
                                </div>

                                {/* New Product Fields: Category and Selling Price */}
                                {!matchingProduct && productInput && (
                                    <>
                                        <div className="animate-in fade-in slide-in-from-top-4 duration-300 col-span-2 grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 border-dashed">
                                            <div className="col-span-2 text-xs font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                <Plus size={14} className="text-blue-500" />
                                                New Product Details
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
                                                <select
                                                    value={category}
                                                    onChange={(e) => setCategory(e.target.value)}
                                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                                >
                                                    {categories.map((c: string) => (
                                                        <option key={c} value={c}>{c}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Selling Price ({currency.symbol})</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    required={!matchingProduct}
                                                    value={sellingPrice}
                                                    onChange={(e) => setSellingPrice(Number(e.target.value))}
                                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

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
                                    <span className="text-xl font-black text-blue-600">{format(totalCost)}</span>
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
                                        {amountRemained > 0 ? '+' : ''}{format(amountRemained)}
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
                                    disabled={!productInput}
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
