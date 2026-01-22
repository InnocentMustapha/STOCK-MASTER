import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { SubscriptionTier, User, UserRole } from '../../types';
import { SUBSCRIPTION_PRICES, convertTZS } from '../../constants';
import { Check, Zap, Crown, CreditCard, ShieldCheck, Smartphone, MessageSquare, Timer, Sparkles, Loader2, X, PhoneCall, History, ShieldAlert } from 'lucide-react';

interface SubscriptionProps {
  currentUser: User;
  onUpgrade: (tier: SubscriptionTier) => void;
  currency: any;
  trialRemaining: number;
  isTrialActive: boolean;
}

type PaymentMethod = 'MPESA' | 'MIXX_BY_YASS';

const Subscription: React.FC<SubscriptionProps> = ({ currentUser, onUpgrade, currency, trialRemaining, isTrialActive }) => {
  const currentTier = currentUser.subscription || SubscriptionTier.NONE;
  const [processing, setProcessing] = useState<SubscriptionTier | null>(null);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [userPhone, setUserPhone] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [showPaymentSelection, setShowPaymentSelection] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchPendingRequest = async () => {
      setLoadingRequests(true);
      try {
        const { data, error } = await supabase
          .from('subscription_requests')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('status', 'PENDING')
          .maybeSingle();

        if (error) throw error;
        setPendingRequest(data);
      } catch (err) {
        console.error('Error fetching pending request:', err);
      } finally {
        setLoadingRequests(false);
      }
    };

    if (currentUser.id) {
      fetchPendingRequest();

      const channel = supabase
        .channel(`subscription-requests-${currentUser.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'subscription_requests',
          filter: `user_id=eq.${currentUser.id}`
        }, (payload) => {
          if (payload.eventType === 'DELETE' || (payload.new && (payload.new as any).status !== 'PENDING')) {
            setPendingRequest(null);
          } else if (payload.new) {
            setPendingRequest(payload.new);
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUser.id]);

  const plans = [
    {
      id: SubscriptionTier.NONE,
      name: 'Starter',
      price: 0,
      icon: <ShieldCheck className="text-slate-400" />,
      features: ['View Dashboard', 'View Inventory', 'Process Sales (Worker)', 'Free for Sellers'],
      color: 'slate'
    },
    {
      id: SubscriptionTier.BASIC,
      name: 'Basic Business',
      price: SUBSCRIPTION_PRICES.BASIC,
      icon: <Zap className="text-blue-500" />,
      features: ['Add/Edit Products', 'Register Workers', 'Basic Sales Reports', 'Stock Alerts'],
      color: 'blue'
    },
    {
      id: SubscriptionTier.PREMIUM,
      name: 'Premium Enterprise',
      price: SUBSCRIPTION_PRICES.PREMIUM,
      icon: <Crown className="text-amber-500" />,
      features: ['AI Inventory Insights', 'Advanced Financial Reports', 'Profit/Loss Analytics', 'Unlimited History'],
      color: 'amber'
    }
  ];

  const handleStartActivation = (tier: SubscriptionTier) => {
    setSelectedTier(tier);
    setShowPaymentSelection(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedTier || !paymentMethod || !userPhone || !paymentReference) {
      alert('Please fill in all details including your payment phone number and transaction reference.');
      return;
    }

    setProcessing(selectedTier);
    setIsSubmitting(true);

    const newRequest = {
      user_id: currentUser.id,
      user_name: currentUser.name,
      tier: selectedTier,
      payment_method: paymentMethod,
      phone_number: userPhone,
      transaction_id: paymentReference,
      status: 'PENDING',
      is_push_triggered: false,
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('subscription_requests')
        .insert([newRequest])
        .select()
        .single();

      if (error) throw error;

      setProcessing(null);
      setShowPaymentSelection(false);
      setPendingRequest(data);
      setSelectedTier(null);
      setPaymentMethod(null);
      setUserPhone('');
      setPaymentReference('');
      alert(`Payment Reference Submitted!\n\nReference: ${paymentReference}\n\nThe Super Admin will verify this code against their records and activate your ${selectedTier} plan shortly.`);
    } catch (err: any) {
      console.error('Submission error:', err);
      let errorMsg = err.message;
      if (err.message.includes('relation "subscription_requests" does not exist')) {
        errorMsg = "Database Error: The 'subscription_requests' table is missing. Please run the SQL provided in the instructions.";
      }
      alert(`COULD NOT SUBMIT REFERENCE\n\nError: ${errorMsg}`);
    } finally {
      setProcessing(null);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {currentUser.role === UserRole.SUPER_ADMIN && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-100 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
          <div className="flex items-center gap-6 z-10">
            <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md">
              <ShieldAlert size={32} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-2xl font-black tracking-tight">Developer Access Active</h3>
              <p className="text-blue-50 font-medium">As a Super Admin, you have full access to all features without subscription requirements.</p>
            </div>
          </div>
          <div className="bg-white/10 px-6 py-4 rounded-3xl border border-white/20 backdrop-blur-md z-10">
            <p className="text-xs font-black uppercase tracking-widest text-blue-100 mb-1">Role</p>
            <p className="font-bold flex items-center gap-2">
              <Sparkles size={16} /> Super Admin Privilege
            </p>
          </div>
        </div>
      )}
      {pendingRequest && (
        <div className="bg-amber-50 border-2 border-amber-200 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg shadow-amber-100/50 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-amber-500 shadow-sm border border-amber-100">
              <History size={32} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Activation Pending</h3>
              <p className="text-slate-500 font-medium">Your request for <span className="text-amber-600 font-bold">{pendingRequest.tier}</span> is being verified by the Super Admin.</p>
            </div>
          </div>
          <div className="bg-white px-6 py-4 rounded-3xl border border-amber-100 flex items-center gap-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Payment from</p>
              <p className="font-bold text-slate-700">{pendingRequest.phone_number}</p>
            </div>
            <div className="w-px h-8 bg-slate-100"></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
              <p className="text-xs font-black text-amber-500 uppercase">Verifying</p>
            </div>
          </div>
        </div>
      )}
      {isTrialActive && currentUser.role !== UserRole.SUPER_ADMIN && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-100 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
          <div className="flex items-center gap-6 z-10">
            <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md">
              <Timer size={32} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-2xl font-black tracking-tight">7-Day Free Trial Active</h3>
              <p className="text-emerald-50 font-medium">You are currently enjoying full Premium access. {trialRemaining} days remaining.</p>
            </div>
          </div>
          <div className="bg-white/10 px-6 py-4 rounded-3xl border border-white/20 backdrop-blur-md z-10">
            <p className="text-xs font-black uppercase tracking-widest text-emerald-100 mb-1">Status</p>
            <p className="font-bold flex items-center gap-2">
              <Sparkles size={16} /> All Features Unlocked
            </p>
          </div>
        </div>
      )}

      <div className="text-center max-w-2xl mx-auto space-y-4">
        <h2 className="text-4xl font-black text-slate-800 tracking-tight">Scale Your Business</h2>
        <p className="text-slate-500 font-medium">Choose a plan that fits your shop's growth. Manual payment verification is processed instantly.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-white p-8 rounded-[2.5rem] border-2 transition-all duration-300 ${currentTier === plan.id
              ? 'border-blue-500 shadow-2xl shadow-blue-100 scale-105 z-10'
              : 'border-slate-100 hover:border-slate-200'
              }`}
          >
            {currentTier === plan.id && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                Current Active Plan
              </div>
            )}

            <div className="flex items-center gap-4 mb-8">
              <div className={`p-4 rounded-3xl bg-${plan.color}-50`}>
                {React.cloneElement(plan.icon as React.ReactElement, { size: 32 })}
              </div>
              <div>
                <h4 className="font-black text-slate-800 text-xl">{plan.name}</h4>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter">Monthly Billing</p>
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-900">
                  {currency.symbol}{convertTZS(plan.price, currency.id).toLocaleString(undefined, { maximumFractionDigits: plan.price === 0 ? 0 : 2 })}
                </span>
                <span className="text-slate-400 font-bold text-sm">/month</span>
              </div>
            </div>

            <ul className="space-y-4 mb-10">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-sm font-semibold text-slate-600">
                  <div className={`mt-0.5 p-0.5 rounded-full ${currentTier === plan.id ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <Check size={12} strokeWidth={4} />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleStartActivation(plan.id)}
              disabled={currentUser.role === UserRole.SUPER_ADMIN || currentTier === plan.id || processing !== null || pendingRequest !== null}
              className={`w-full py-5 rounded-3xl font-black transition-all flex items-center justify-center gap-2 active:scale-95 ${currentTier === plan.id || currentUser.role === UserRole.SUPER_ADMIN
                ? 'bg-slate-100 text-slate-400 cursor-default'
                : plan.id === SubscriptionTier.PREMIUM
                  ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-200'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-100'
                } ${pendingRequest ? 'opacity-50 grayscale' : ''}`}
            >
              {processing === plan.id ? (
                <Loader2 size={18} className="animate-spin" />
              ) : currentUser.role === UserRole.SUPER_ADMIN ? 'Manage System' : currentTier === plan.id ? 'Active' : pendingRequest ? 'Activation Pending' : (
                <>
                  <CreditCard size={18} />
                  Activate & Upgrade
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Payment Selection Modal */}
      {showPaymentSelection && selectedTier && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 md:p-12 space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-slate-800">Activate {selectedTier}</h3>
                  <p className="text-slate-500 font-medium">Choose your preferred payment method</p>
                </div>
                <button
                  onClick={() => {
                    setShowPaymentSelection(false);
                    setPaymentMethod(null);
                  }}
                  className="p-3 hover:bg-slate-100 rounded-2xl transition-colors"
                >
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setPaymentMethod('MPESA')}
                  className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-3 text-center ${paymentMethod === 'MPESA'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-lg shadow-emerald-100'
                    : 'border-slate-100 hover:border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl ${paymentMethod === 'MPESA' ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-100 text-emerald-500 shadow-sm'
                    }`}>
                    M
                  </div>
                  <div>
                    <span className="block font-black uppercase tracking-widest text-[10px]">Method</span>
                    <span className="font-bold">M-pesa</span>
                  </div>
                  {paymentMethod === 'MPESA' && <Check size={20} className="mt-auto" strokeWidth={3} />}
                </button>

                <button
                  onClick={() => setPaymentMethod('MIXX_BY_YASS')}
                  className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-3 text-center ${paymentMethod === 'MIXX_BY_YASS'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-lg shadow-blue-100'
                    : 'border-slate-100 hover:border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl ${paymentMethod === 'MIXX_BY_YASS' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-100 text-blue-600 shadow-sm'
                    }`}>
                    Y
                  </div>
                  <div>
                    <span className="block font-black uppercase tracking-widest text-[10px]">Method</span>
                    <span className="font-bold">Mixx by Yass</span>
                  </div>
                  {paymentMethod === 'MIXX_BY_YASS' && <Check size={20} className="mt-auto" strokeWidth={3} />}
                </button>
              </div>

              {paymentMethod && (
                <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 space-y-8 animate-in slide-in-from-bottom-4 duration-300">
                  <div className="space-y-4">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Step 1: Follow these instructions on your phone</p>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-4 shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-lg">1</div>
                        <p className="font-bold text-slate-700">Dial <span className="text-blue-600 font-black">{paymentMethod === 'MPESA' ? '*150*00#' : '*150*01#'}</span></p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-lg">2</div>
                        <p className="font-bold text-slate-700">Choose <span className="text-slate-900 font-black">"Send Money"</span></p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-lg">3</div>
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Send to number</p>
                          <p className="font-black text-xl text-slate-900 leading-none">{paymentMethod === 'MPESA' ? '0742370293' : '0678159460'}</p>
                          <p className="text-xs font-bold text-emerald-600 mt-1">Name: Innocent Mustapha</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-lg">4</div>
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Enter amount</p>
                          <p className="font-black text-xl text-blue-600 leading-none">
                            {currency.symbol}{convertTZS(plans.find(p => p.id === selectedTier)?.price || 0, currency.id).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Step 2: Submit payment details</p>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Your M-Pesa/Mixx Number</label>
                        <input
                          type="tel"
                          value={userPhone}
                          onChange={(e) => setUserPhone(e.target.value)}
                          placeholder="07XXXXXXXX"
                          className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 focus:outline-none font-bold text-slate-800 transition-colors"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Transaction Ref / Reference ID</label>
                        <input
                          type="text"
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value.toUpperCase())}
                          placeholder="e.g. QX789234"
                          className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 focus:outline-none font-bold text-slate-800 transition-colors uppercase"
                          required
                        />
                        <p className="text-[10px] text-slate-400 font-medium px-1 italic text-center">Copy the ID from your transaction message</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleConfirmPayment}
                    disabled={!userPhone || !paymentReference || isSubmitting}
                    className={`w-full py-5 rounded-[2rem] font-black text-white shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 ${!userPhone || !paymentReference || isSubmitting
                      ? 'bg-slate-300 shadow-none cursor-not-allowed'
                      : 'bg-slate-900 hover:bg-slate-800 shadow-slate-200'
                      }`}
                  >
                    {isSubmitting ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck size={18} />
                        Confirm Payment Reference
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Instructions Section */}
      <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Smartphone className="text-emerald-500" />
              Manual Payment Details
            </h3>
            <p className="text-slate-500 font-medium">Please use the following numbers to complete your payment. Once paid, submit your request above for Super Admin verification.</p>
          </div>
          <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-2xl">
            <ShieldCheck size={18} className="text-blue-500" />
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Manual Verification</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex items-center gap-6 group hover:border-emerald-200 hover:bg-emerald-50/30 transition-all">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-emerald-500 font-black text-xl border border-slate-100">
              M
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pay via M-Pesa</p>
              <h4 className="text-2xl font-black text-slate-800 tracking-tight group-hover:text-emerald-600 transition-colors">0742370293</h4>
              <p className="text-xs font-bold text-slate-500 mt-1">Recipient: Innocent Mustapha</p>
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex items-center gap-6 group hover:border-blue-200 hover:bg-blue-50/30 transition-all">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-blue-600 font-black text-xl border border-slate-100">
              Y
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pay via Mixx by Yass</p>
              <h4 className="text-2xl font-black text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors">0678159460</h4>
              <p className="text-xs font-bold text-slate-500 mt-1">Recipient: Innocent Mustapha</p>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-slate-400">
            <MessageSquare size={16} />
            <p className="text-xs font-bold">After payment, send your proof of payment via WhatsApp for permanent verification.</p>
          </div>
          <a
            href="https://wa.me/255678159460"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-black text-emerald-600 hover:text-emerald-700 underline underline-offset-4 decoration-2"
          >
            Open WhatsApp to Send Proof
          </a>
        </div>
      </div>

      <div className="bg-blue-50 p-8 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 border border-blue-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h5 className="font-bold text-slate-800">Secure Billing</h5>
            <p className="text-sm text-slate-500">Your payments are verified manually by the Super Admin once you submit your request.</p>
          </div>
        </div>
        <p className="text-xs font-bold text-blue-400 bg-white px-4 py-2 rounded-xl">All prices converted from Base TZS rate</p>
      </div>
    </div>
  );
};

export default Subscription;
