import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, DollarSign } from 'lucide-react';

interface CurrencyConverterProps {
    currencies: any[];
}

const CurrencyConverter: React.FC<CurrencyConverterProps> = ({ currencies }) => {
    const [amount, setAmount] = useState<number>(1);
    const [fromCurrency, setFromCurrency] = useState('USD');
    const [toCurrency, setToCurrency] = useState('TZS');

    // Ensure defaults are valid if currencies change or load late
    useEffect(() => {
        if (currencies.length > 0) {
            if (!currencies.find(c => c.id === fromCurrency)) setFromCurrency(currencies[0].id);
            if (!currencies.find(c => c.id === toCurrency)) setToCurrency(currencies.length > 1 ? currencies[1].id : currencies[0].id);
        }
    }, [currencies]);

    const handleSwap = () => {
        setFromCurrency(toCurrency);
        setToCurrency(fromCurrency);
    };

    const calculateConversion = () => {
        const fromRate = currencies.find(c => c.id === fromCurrency)?.rate || 1;
        const toRate = currencies.find(c => c.id === toCurrency)?.rate || 1;
        // Base is USD (rate 1).
        // Convert from -> USD -> to
        // Amount / fromRate * toRate
        // e.g. 2500 TZS (rate 2500) -> 1 USD -> 0.92 EUR (rate 0.92)
        // 2500 / 2500 * 0.92 = 0.92
        return (amount / fromRate) * toRate;
    };

    const result = calculateConversion();
    const toSymbol = currencies.find(c => c.id === toCurrency)?.symbol;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <DollarSign className="text-blue-600" size={20} />
                Currency Exchange
            </h3>

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Amount</label>
                    <input
                        type="number"
                        min="0"
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>

                <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-end">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">From</label>
                        <select
                            value={fromCurrency}
                            onChange={(e) => setFromCurrency(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                        >
                            {currencies.map(c => (
                                <option key={c.id} value={c.id}>{c.id} - {c.name}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handleSwap}
                        className="p-3 mb-0.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                    >
                        <ArrowRightLeft size={18} />
                    </button>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">To</label>
                        <select
                            value={toCurrency}
                            onChange={(e) => setToCurrency(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                        >
                            {currencies.map(c => (
                                <option key={c.id} value={c.id}>{c.id} - {c.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                    <p className="text-xs text-slate-400 font-medium mb-1">Converted Amount</p>
                    <div className="text-2xl font-black text-slate-800 break-words">
                        {toSymbol} {result.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                        Rate: 1 {fromCurrency} = {(calculateConversion() / amount).toFixed(4)} {toCurrency}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CurrencyConverter;
