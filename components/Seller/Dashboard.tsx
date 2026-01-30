
import React, { useState, useMemo } from 'react';
import { Product, Sale, User } from '../../types';
import { Search, ShoppingCart, Check, X, CreditCard, Tag, Package, Percent, Filter } from 'lucide-react';
import { formatCurrency } from '../../services/currencyUtils';
import ReceiptModal from '../Shared/ReceiptModal';

interface SellerDashboardProps {
  products: Product[];
  sales: Sale[];
  onSale: (sale: Sale, receiptData?: any) => void;
  currentUser: User;
  currency: any;
  categories: string[];
}

const SellerDashboard: React.FC<SellerDashboardProps> = ({ products, sales, onSale, currentUser, currency, categories }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  // Cart State with extended properties
  interface CartItem {
    cartId: string; // Unique ID for the cart line item
    product: Product;
    qty: number; // Number of units/packs
    unitType: string; // 'Single', 'Dozen', etc.
    packSize: number; // Units per pack (1 for Single)
    unitPrice: number; // Price per pack/unit
  }

  const [cart, setCart] = useState<CartItem[]>([]);
  const [showReport, setShowReport] = useState(false);

  // Pack Selection Modal State
  const [isPackModalOpen, setIsPackModalOpen] = useState(false);
  const [selectedProductForPack, setSelectedProductForPack] = useState<Product | null>(null);

  // Receipt & Payment State
  const [showReceipt, setShowReceipt] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money' | 'card'>('cash');
  const [lastReceiptData, setLastReceiptData] = useState<any>(null);

  // Load saved cart on mount
  // Load saved cart on mount
  React.useEffect(() => {
    const saved = localStorage.getItem('sm_cart_backup_v2'); // Changed key to avoid collision with old format
    if (saved) {
      try {
        setCart(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load saved cart", e);
      }
    }
  }, []);

  // Save cart on change
  React.useEffect(() => {
    localStorage.setItem('sm_cart_backup_v2', JSON.stringify(cart));
  }, [cart]);

  const dailyStats = useMemo(() => {
    const getLocalDateString = (dateInput: string | Date = new Date()) => {
      const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    };

    const todayStr = getLocalDateString();
    const todaysSales = sales.filter(s => getLocalDateString(s.timestamp) === todayStr);
    const totalRevenue = todaysSales.reduce((acc, s) => acc + s.totalPrice, 0);
    const totalProfit = todaysSales.reduce((acc, s) => acc + s.profit, 0);
    return { todaysSales, totalRevenue, totalProfit };
  }, [sales]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const getDiscountedPrice = (product: Product) => {
    if (!product.discount) return product.sellPrice;
    return product.sellPrice * (1 - product.discount / 100);
  };

  const addToCart = (product: Product) => {
    if (product.quantity <= 0) return alert("Out of stock!");

    const cartId = `${product.id}-Single-1`;
    const price = getDiscountedPrice(product);

    setCart(prev => {
      const existing = prev.find(item => item.cartId === cartId);
      if (existing) {
        // Check stock (total units)
        const currentTotalUnits = prev.reduce((sum, item) => item.product.id === product.id ? sum + (item.qty * item.packSize) : sum, 0);
        if (currentTotalUnits + 1 > product.quantity) {
          alert("Cannot add more than available stock!");
          return prev;
        }
        return prev.map(item => item.cartId === cartId ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, {
        cartId,
        product,
        qty: 1,
        unitType: 'Single',
        packSize: 1,
        unitPrice: price
      }];
    });
  };

  const addPackToCart = (product: Product, unitType: string, packSize: number, packPrice: number, quantity: number) => {
    const totalUnits = packSize * quantity;

    // Stock Check
    const currentCartUnits = cart.reduce((sum, item) => item.product.id === product.id ? sum + (item.qty * item.packSize) : sum, 0);

    if (currentCartUnits + totalUnits > product.quantity) {
      alert(`Insufficient stock! You need ${totalUnits} units but only have ${product.quantity - currentCartUnits} available.`);
      return;
    }

    const cartId = `${product.id}-${unitType}-${packSize}-${packPrice}`; // Unique ID including price if different

    setCart(prev => {
      const existing = prev.find(item => item.cartId === cartId);
      if (existing) {
        return prev.map(item => item.cartId === cartId ? { ...item, qty: item.qty + quantity } : item);
      }
      return [...prev, {
        cartId,
        product,
        qty: quantity,
        unitType,
        packSize,
        unitPrice: packPrice
      }];
    });
    setIsPackModalOpen(false);
  };

  const updateCartQty = (cartId: string, newQty: number) => {
    const item = cart.find(i => i.cartId === cartId);
    if (!item) return;

    // Calculate total units used by OTHER items of same product
    const otherItemsUnits = cart.filter(i => i.cartId !== cartId && i.product.id === item.product.id)
      .reduce((sum, i) => sum + (i.qty * i.packSize), 0);

    const requiredUnits = newQty * item.packSize;

    if (otherItemsUnits + requiredUnits > item.product.quantity) {
      alert(`Insufficient stock! Max available: ${Math.floor((item.product.quantity - otherItemsUnits) / item.packSize)} packs`);
      return;
    }

    if (newQty <= 0) {
      removeFromCart(cartId);
      return;
    }

    setCart(prev => prev.map(i => i.cartId === cartId ? { ...i, qty: newQty } : i));
  };

  const removeFromCart = (cartId: string) => {
    setCart(prev => prev.filter(item => item.cartId !== cartId));
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.unitPrice * item.qty), 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;

    const receiptId = Math.random().toString(36).substr(2, 9).toUpperCase(); // Simple ID generation
    const timestamp = new Date().toISOString();

    const receiptItems: any[] = [];

    // Process each item
    cart.forEach(item => {
      const finalPrice = item.unitPrice; // Already set in cart
      const totalPrice = finalPrice * item.qty;
      // Cost is based on SINGLE units bought
      const totalUnits = item.qty * item.packSize;
      const totalCost = item.product.buyPrice * totalUnits;

      const sale: Sale = {
        id: Math.random().toString(36).substr(2, 9),
        productId: item.product.id,
        productName: item.product.name,
        quantity: totalUnits, // Store TOTAL UNITS for inventory
        unitPrice: finalPrice / item.packSize, // Effective unit price
        totalPrice: totalPrice,
        totalCost: totalCost,
        profit: totalPrice - totalCost,
        timestamp: timestamp,
        sellerId: currentUser.id,
        sellerName: currentUser.name,
        receiptId: receiptId,
        paymentMethod: paymentMethod,
        metadata: {
          unitType: item.unitType,
          packSize: item.packSize,
          packPrice: item.unitPrice,
          packQuantity: item.qty
        }
      };

      onSale(sale, null);

      receiptItems.push({
        name: `${item.product.name} ${item.unitType !== 'Single' ? `(${item.unitType})` : ''}`,
        quantity: item.qty, // Display Pack Qty
        price: finalPrice
      });
    });

    // Prepare Receipt Data
    const receiptData = {
      shopName: "Stock Master Store",
      receiptId,
      date: timestamp,
      items: receiptItems,
      total: cartTotal,
      paymentMethod,
      sellerName: currentUser.name
    };

    setLastReceiptData(receiptData);
    setShowReceipt(true);
    setCart([]);
    localStorage.removeItem('sm_cart_backup_v2');
  };

  const formatPrice = (val: number) => {
    return formatCurrency(val, currency);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 relative">
      <div className="xl:col-span-2 space-y-6">
        {/* Search and Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Search size={20} />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
            />
          </div>
          <div className="flex items-center justify-center px-4 bg-blue-50 text-blue-600 font-bold rounded-2xl border border-blue-100 whitespace-nowrap">
            v1.1 (Unit Update)
          </div>

          <div className="overflow-x-auto pb-2 md:pb-0 hide-scrollbar flex gap-2">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-6 py-4 rounded-2xl font-bold whitespace-nowrap transition-all ${selectedCategory === 'All'
                ? 'bg-slate-800 text-white shadow-lg shadow-slate-200'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
            >
              All Items
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-6 py-4 rounded-2xl font-bold whitespace-nowrap transition-all ${selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map(product => {
            const hasDiscount = (product.discount || 0) > 0;
            const finalPrice = getDiscountedPrice(product);

            return (
              <div
                key={product.id}
                onClick={() => addToCart(product)}
                className={`p-4 bg-white rounded-2xl border border-slate-100 shadow-sm cursor-pointer hover:shadow-md transition-all group relative ${product.quantity <= 0 ? 'opacity-60 grayscale cursor-not-allowed' : ''
                  }`}
              >
                {hasDiscount && (
                  <div className="absolute top-2 right-2 bg-orange-500 text-white text-[10px] font-black px-2 py-1 rounded-lg flex items-center gap-1 z-10 animate-pulse">
                    <Percent size={10} /> {product.discount}% OFF
                  </div>
                )}
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-slate-800 line-clamp-1">{product.name}</h4>
                    <p className="text-xs text-slate-400">{product.category}</p>
                  </div>
                </div>

                <div className="flex items-end justify-between mt-2">
                  <div>
                    {hasDiscount && (
                      <span className="text-[10px] text-slate-400 line-through block">
                        {formatPrice(product.sellPrice)}
                      </span>
                    )}
                    <div className="text-lg font-black text-blue-600">
                      {formatPrice(finalPrice)}
                    </div>
                  </div>

                  <div className={`text-[10px] font-bold px-2 py-1 rounded-full ${product.quantity <= product.minThreshold
                    ? 'bg-red-50 text-red-600'
                    : 'bg-emerald-50 text-emerald-600'
                    }`}>
                    {product.quantity} left
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProductForPack(product);
                    setIsPackModalOpen(true);
                  }}
                  className="absolute top-2 left-2 p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-blue-600 transition-colors z-20"
                  title="Sell in Packs (Dozen, Crate, etc.)"
                >
                  <Package size={16} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 flex flex-col h-[calc(100vh-100px)] sticky top-8">
        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <ShoppingCart className="text-blue-500" /> Current Order
        </h3>

        <div className="flex-1 space-y-4 overflow-y-auto mb-6 pr-2 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="text-center py-24 text-slate-400">
              <Package size={48} className="mx-auto mb-4 opacity-20" />
              <p>Select items to start selling</p>
            </div>
          ) : (
            cart.map(item => {
              const finalPrice = getDiscountedPrice(item.product);
              return (
                <div className="group p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h5 className="text-sm font-bold text-slate-700">
                        {item.product.name}
                        {item.unitType !== 'Single' && <span className="text-xs text-blue-500 ml-1">({item.unitType})</span>}
                      </h5>
                      <p className="text-xs font-bold text-blue-600">
                        {formatPrice(item.unitPrice)}
                        <span className="text-slate-400 font-normal"> / {item.unitType === 'Single' ? 'unit' : 'pack'}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.cartId)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 px-2 py-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Qty</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.qty}
                        onChange={(e) => updateCartQty(item.cartId, parseFloat(e.target.value) || 0)}
                        className="w-16 font-bold text-slate-800 outline-none text-right bg-transparent"
                      />
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Total</p>
                      <span className="font-black text-slate-800">{formatPrice(item.qty * item.unitPrice)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="space-y-3 pt-6 border-t border-slate-100 bg-white">
          <div className="flex justify-between text-sm text-slate-500">
            <span>Subtotal</span>
            <span>{formatPrice(cartTotal)}</span>
          </div>

          {/* Payment Method Selection */}
          <div className="grid grid-cols-3 gap-2 mt-2">
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`p-2 rounded-xl text-xs font-bold border transition-all ${paymentMethod === 'cash' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
            >
              CASH
            </button>
            <button
              onClick={() => setPaymentMethod('mobile_money')}
              className={`p-2 rounded-xl text-xs font-bold border transition-all ${paymentMethod === 'mobile_money' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
            >
              MOBILE
            </button>
            <button
              onClick={() => setPaymentMethod('card')}
              className={`p-2 rounded-xl text-xs font-bold border transition-all ${paymentMethod === 'card' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
            >
              CARD
            </button>
          </div>

          <div className="flex justify-between text-2xl font-black text-slate-900 pt-2">
            <span>Total</span>
            <span>{formatPrice(cartTotal)}</span>
          </div>
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-xl shadow-slate-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
          >
            <CreditCard size={20} />
            CHECKOUT ({paymentMethod.replace('_', ' ').toUpperCase()})
          </button>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <button
              onClick={() => {
                localStorage.setItem('sm_cart_backup_v2', JSON.stringify(cart));
                alert("Progress saved!");
              }}
              className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 text-sm"
            >
              <Check size={16} /> Save Progress
            </button>
            <button
              onClick={() => setShowReport(true)}
              className="bg-red-50 text-red-600 hover:bg-red-100 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 text-sm"
            >
              <X size={16} /> Close & Report
            </button>
          </div>
        </div>
      </div>

      {showReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Tag className="text-blue-400" /> Daily Report
              </h3>
              <button onClick={() => setShowReport(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                {dailyStats.todaysSales.map((sale: any) => (
                  <div key={sale.id} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{sale.productName}</p>
                      <p className="text-xs text-slate-400">{new Date(sale.timestamp).toLocaleTimeString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-600">+{formatPrice(sale.profit)}</p>
                      <p className="text-[10px] text-slate-400 uppercase">Profit</p>
                    </div>
                  </div>
                ))}

                {dailyStats.todaysSales.length === 0 && (
                  <p className="text-center text-slate-400 py-8 italic">No sales recorded today.</p>
                )}
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500 font-medium">Sales Count</span>
                <span className="font-bold text-slate-800">{dailyStats.todaysSales.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500 font-medium">Total Daily Revenue</span>
                <span className="text-lg font-bold text-blue-600">{formatPrice(dailyStats.totalRevenue)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-200 pt-3">
                <span className="text-lg font-bold text-slate-800">Total Daily Profit</span>
                <span className="text-2xl font-black text-emerald-600">{formatPrice(dailyStats.totalProfit)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal Integration */}
      {lastReceiptData && (
        <ReceiptModal
          isOpen={showReceipt}
          onClose={() => setShowReceipt(false)}
          saleData={lastReceiptData}
          currency={currency}
        />
      )}

      {/* Pack Selection Modal */}
      {isPackModalOpen && selectedProductForPack && (
        <PackSelectionModal
          product={selectedProductForPack}
          currency={currency}
          onClose={() => setIsPackModalOpen(false)}
          onAdd={addPackToCart}
        />
      )}
    </div>
  );
};

// Sub-component for Pack Selection
const PackSelectionModal = ({ product, currency, onClose, onAdd }: any) => {
  const [unitType, setUnitType] = useState('Dozen');
  const [packSize, setPackSize] = useState(12);
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(product.sellPrice * 12);

  // Auto-update price when pack size changes if user hasn't customized it? 
  // For now, just reset to unit*packsize when packsize changes
  React.useEffect(() => {
    setPrice(product.sellPrice * packSize);
  }, [packSize, product.sellPrice]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(product, unitType, packSize, price, quantity);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-black text-slate-800">Sell {product.name}</h3>
            <p className="text-sm text-slate-500">Add Pack to Cart</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Unit Type</label>
            <select
              value={unitType}
              onChange={(e) => {
                const type = e.target.value;
                setUnitType(type);
                if (type === 'Dozen') setPackSize(12);
                else if (type === 'Crate') setPackSize(24);
                else if (type === 'Carton') setPackSize(10);
              }}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
            >
              <option value="Dozen">Dozen</option>
              <option value="Crate">Crate</option>
              <option value="Carton">Carton</option>
              <option value="Custom">Custom</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Units / Pack</label>
              <input
                type="number"
                min="1"
                value={packSize}
                onChange={(e) => setPackSize(Number(e.target.value))}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Pack Qty</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Price Per Pack ({currency.symbol})</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-emerald-600"
            />
          </div>

          <div className="pt-2">
            <div className="flex justify-between text-sm mb-4">
              <span className="text-slate-500">Total Units:</span>
              <span className="font-bold text-slate-800">{quantity * packSize} units</span>
            </div>
            <button
              type="submit"
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 transition-all active:scale-95"
            >
              Add to Cart - {formatCurrency(price * quantity, currency)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SellerDashboard;
