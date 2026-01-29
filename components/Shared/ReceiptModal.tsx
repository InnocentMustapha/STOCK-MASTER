
import React, { useRef } from 'react';
import { Sale } from '../../types';
import { useReactToPrint } from 'react-to-print';
import { X, Printer, CheckCircle } from 'lucide-react';
import { formatCurrency } from '../../services/currencyUtils';

interface ReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    saleData: {
        shopName: string;
        receiptId: string;
        date: string;
        items: {
            name: string;
            quantity: number;
            price: number;
        }[];
        total: number;
        paymentMethod: string;
        sellerName: string;
    };
    currency: any;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, saleData, currency }) => {
    const componentRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
    });

    if (!isOpen) return null;

    const format = (amount: number) => formatCurrency(amount, currency);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header Actions */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <CheckCircle className="text-emerald-500" size={20} />
                        Sale Completed
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-100/50 flex flex-col items-center">

                    {/* Receipt Preview */}
                    <div ref={componentRef} className="bg-white p-6 shadow-sm border border-slate-200 w-full max-w-sm mx-auto text-sm font-mono leading-relaxed">
                        {/* Store Header */}
                        <div className="text-center mb-6">
                            <h1 className="text-xl font-black uppercase text-slate-900 mb-1">{saleData.shopName}</h1>
                            <p className="text-slate-500 text-xs text-center">Receipt #: {saleData.receiptId}</p>
                            <p className="text-slate-500 text-xs">{new Date(saleData.date).toLocaleString()}</p>
                        </div>

                        {/* Separator */}
                        <div className="border-b-2 border-dashed border-slate-300 my-4"></div>

                        {/* Items */}
                        <div className="space-y-2 mb-4">
                            <div className="flex justify-between font-bold text-slate-900 pb-2 border-b border-slate-100">
                                <span className="w-1/2">Item</span>
                                <span className="w-1/4 text-center">Qty</span>
                                <span className="w-1/4 text-right">Amt</span>
                            </div>
                            {saleData.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-start text-slate-700">
                                    <span className="w-1/2 break-words pr-2">{item.name}</span>
                                    <span className="w-1/4 text-center">x{item.quantity}</span>
                                    <span className="w-1/4 text-right">{format(item.price * item.quantity)}</span>
                                </div>
                            ))}
                        </div>

                        {/* Separator */}
                        <div className="border-b-2 border-dashed border-slate-300 my-4"></div>

                        {/* Totals */}
                        <div className="space-y-1 text-slate-800">
                            <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span>{format(saleData.total)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-500">
                                <span>Tax (0%)</span>
                                <span>{format(0)}</span>
                            </div>
                            <div className="flex justify-between font-black text-lg mt-2 pt-2 border-t border-slate-100">
                                <span>TOTAL</span>
                                <span>{format(saleData.total)}</span>
                            </div>
                        </div>

                        {/* Payment Info */}
                        <div className="mt-4 pt-4 border-t border-dashed border-slate-300 text-center">
                            <p className="text-xs uppercase font-bold text-slate-500 mb-1">Payment Method</p>
                            <p className="font-bold text-slate-800 uppercase">{saleData.paymentMethod.replace('_', ' ')}</p>
                        </div>

                        {/* Footer */}
                        <div className="mt-8 text-center space-y-2">
                            <p className="font-bold text-slate-800">Thank You!</p>
                            <p className="text-xs text-slate-500">Please visit us again.</p>
                            <p className="text-[10px] text-slate-300 mt-4">Served by: {saleData.sellerName}</p>
                        </div>

                    </div>

                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-100 bg-white grid grid-cols-2 gap-4">
                    <button
                        onClick={onClose}
                        className="py-3 px-4 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        Close
                    </button>
                    <button
                        onClick={handlePrint}
                        className="py-3 px-4 rounded-xl bg-blue-600 font-bold text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <Printer size={20} />
                        Print Receipt
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReceiptModal;
