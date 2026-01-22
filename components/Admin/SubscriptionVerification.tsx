import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { User, SubscriptionTier, UserRole } from '../../types';
import { CreditCard, Check, Crown, Zap, Clock, Smartphone, Trash2, Loader2, UserCircle, ShieldAlert, RefreshCw, Copy, ExternalLink } from 'lucide-react';

interface SubscriptionVerificationProps {
    users: User[];
    currency: any;
    currentUser: User;
    onUpdateUser?: (userId: string, updates: Partial<User>) => void;
}

const SubscriptionVerification: React.FC<SubscriptionVerificationProps> = ({ users, currency, currentUser, onUpdateUser }) => {
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPendingRequests = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('subscription_requests')
                .select('*')
                .eq('status', 'PENDING')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPendingRequests(data || []);
        } catch (err) {
            console.error('Error fetching pending requests:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser.role === UserRole.SUPER_ADMIN) {
            fetchPendingRequests();
        }
    }, [currentUser.role]);

    // Filter to only show admins (shop owners)
    const shopOwners = users.filter(u => u.role === UserRole.ADMIN || u.role === UserRole.SUPER_ADMIN);

    const handleActivateRequest = async (request: any) => {
        const confirmMsg = `Confirm activation of ${request.tier} for ${request.user_name} (Payment from ${request.phone_number})?`;

        if (window.confirm(confirmMsg)) {
            try {
                // 1. Update the User's Profile Subscription
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({ subscription: request.tier })
                    .eq('id', request.user_id);

                if (profileError) throw profileError;

                // 2. Mark the request as APPROVED (or delete it)
                const { error: requestError } = await supabase
                    .from('subscription_requests')
                    .update({ status: 'APPROVED' })
                    .eq('id', request.id);

                if (requestError) throw requestError;

                // 3. Update local state
                setPendingRequests(prev => prev.filter(r => r.id !== request.id));

                alert(`SUCCESS: ${request.user_name}'s account has been upgraded to ${request.tier}.`);

                // Refresh data if possible
                if (onUpdateUser) {
                    onUpdateUser(request.user_id, { subscription: request.tier as SubscriptionTier });
                }
            } catch (err: any) {
                console.error('Activation failed:', err);
                alert('Activation failed: ' + err.message);
            }
        }
    };

    const handleDeleteRequest = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this payment request?')) {
            try {
                const { error } = await supabase
                    .from('subscription_requests')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                setPendingRequests(prev => prev.filter(r => r.id !== id));
            } catch (err: any) {
                console.error('Delete failed:', err);
                alert('Delete failed: ' + err.message);
            }
        }
    };

    const getSubscriptionBadge = (subscription?: string) => {
        switch (subscription) {
            case 'PREMIUM':
                return { label: 'Premium', color: 'bg-purple-500', icon: Crown };
            case 'BASIC':
                return { label: 'Basic', color: 'bg-blue-500', icon: Zap };
            default:
                return { label: 'Free', color: 'bg-slate-400', icon: CreditCard };
        }
    };

    const getTrialStatus = (trialStartedAt?: string) => {
        if (!trialStartedAt) return null;
        const start = new Date(trialStartedAt).getTime();
        const now = new Date().getTime();
        const diffDays = (now - start) / (1000 * 60 * 60 * 24);
        const remaining = Math.max(0, Math.ceil(7 - diffDays));
        return remaining > 0 ? remaining : null;
    };

    return (
        <div className="space-y-8">
            {/* Pending Requests Section */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                            <Clock className="text-amber-500" />
                            Pending Activation Requests
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">Verify received payments and activate plan upgrades</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchPendingRequests}
                            className="p-3 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"
                            title="Refresh Requests"
                        >
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <div className="bg-amber-50 px-4 py-2 rounded-xl">
                            <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">Awaiting Verification</p>
                            <p className="text-2xl font-black text-amber-500">{pendingRequests.length}</p>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading Cloud Requests...</p>
                    </div>
                ) : pendingRequests.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pendingRequests.map(request => (
                            <div key={request.id} className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 space-y-4 hover:border-amber-200 transition-all group relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 -mr-16 -mt-16 rounded-full blur-2xl"></div>

                                <div className="flex items-center justify-between relative z-10">
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${request.tier === 'PREMIUM' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                                        }`}>
                                        {request.tier}
                                    </div>
                                    <button
                                        onClick={() => handleDeleteRequest(request.id)}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <div className="space-y-4 relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                                            <UserCircle size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sender</p>
                                            <p className="font-black text-slate-800">{request.user_name}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm">
                                            <Smartphone size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Phone</p>
                                            <p className="font-black text-slate-800">{request.phone_number}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-slate-800 shadow-sm">
                                            <CreditCard size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</p>
                                            <p className="text-sm font-bold text-slate-600 capitalize">{(request.payment_method || '').toLowerCase().replace('_', ' ')}</p>
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border-2 border-emerald-100 space-y-2 group/ref relative">
                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest text-center">Verify Reference ID</p>
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-lg font-black text-slate-800 font-mono flex-1 text-center truncate select-all">{request.transaction_id || 'N/A'}</p>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(request.transaction_id || '');
                                                    alert('Reference ID Copied!');
                                                }}
                                                className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                                            >
                                                <Copy size={14} />
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-medium text-center">Check your {request.payment_method === 'MPESA' ? 'M-Pesa' : 'Mixx by Yass'} messages for this ID</p>
                                    </div>
                                </div>

                                <div className="pt-2 relative z-10">
                                    <button
                                        onClick={() => handleActivateRequest(request)}
                                        className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 group-hover:transform group-hover:translate-y-[-2px] active:scale-95 shadow-lg shadow-slate-200"
                                    >
                                        <Check size={16} strokeWidth={3} />
                                        Verify & Activate
                                    </button>
                                </div>
                                <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-tighter relative z-10">
                                    Requested: {new Date(request.created_at).toLocaleString()}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                        <Clock size={48} className="mx-auto text-slate-200 mb-3" />
                        <p className="text-slate-400 font-bold">All payments verified. No pending requests.</p>
                    </div>
                )}
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">Shop Owners</h2>
                        <p className="text-sm text-slate-500 mt-1">Current subscription status of all shop owners</p>
                    </div>
                    <div className="bg-blue-50 px-4 py-2 rounded-xl">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total</p>
                        <p className="text-2xl font-black text-blue-600">{shopOwners.length}</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">
                                <th className="px-6 py-4 text-left">Shop Owner</th>
                                <th className="px-6 py-4 text-left">Username</th>
                                <th className="px-6 py-4 text-left">Subscription</th>
                                <th className="px-6 py-4 text-left">Trial Status</th>
                                <th className="px-6 py-4 text-left">Joined Date</th>
                                <th className="px-6 py-4 text-left">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {shopOwners.map(owner => {
                                const badge = getSubscriptionBadge(owner.subscription);
                                const trialRemaining = getTrialStatus(owner.trialStartedAt);
                                const BadgeIcon = badge.icon;
                                const hasActiveSubscription = owner.subscription && owner.subscription !== 'NONE';
                                const isActive = hasActiveSubscription || trialRemaining !== null;

                                return (
                                    <tr key={owner.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black">
                                                    {owner.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800">{owner.name}</p>
                                                    <p className="text-xs text-slate-400">ID: {owner.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="text-sm font-mono text-slate-600">@{owner.username}</span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl ${badge.color} text-white`}>
                                                <BadgeIcon size={14} />
                                                <span className="text-xs font-bold">{badge.label}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            {trialRemaining !== null ? (
                                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                                    <span className="text-xs font-bold">{trialRemaining} days left</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400">No trial</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="text-sm text-slate-600">
                                                {new Date(owner.createdAt).toLocaleDateString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            {isActive ? (
                                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600">
                                                    <Check size={14} strokeWidth={3} />
                                                    <span className="text-xs font-bold">Active</span>
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 text-red-600">
                                                    <span className="text-xs font-bold">Inactive</span>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {shopOwners.length === 0 && (
                    <div className="text-center py-12">
                        <CreditCard size={48} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-400 font-medium">No shop owners registered yet</p>
                    </div>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Premium Subscribers</p>
                    <p className="text-3xl font-black text-purple-600">
                        {shopOwners.filter(o => o.subscription === 'PREMIUM').length}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Basic Subscribers</p>
                    <p className="text-3xl font-black text-blue-600">
                        {shopOwners.filter(o => o.subscription === 'BASIC').length}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Active Trials</p>
                    <p className="text-3xl font-black text-emerald-600">
                        {shopOwners.filter(o => getTrialStatus(o.trialStartedAt) !== null).length}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionVerification;
