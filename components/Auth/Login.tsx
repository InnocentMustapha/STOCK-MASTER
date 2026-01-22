import React, { useState } from 'react';
import { User, UserRole, SubscriptionTier } from '../../types';
import { Lock, ShieldCheck, KeyRound, Mail, MessageCircle, Users } from 'lucide-react';
import { supabase } from '../../services/supabase';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Supabase requires an email. We'll use a pseudo-email if a username is entered.
      // e.g. "admin" -> "admin@stockmaster.local"
      const authEmail = username.includes('@')
        ? username.toLowerCase().trim()
        : `${username.toLowerCase().trim().replace(/\s+/g, '')}@stockmaster.local`;

      console.log(`Attempting login with: ${authEmail}`);

      if (isSignUp) {
        // 1. Sign Up with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: authEmail,
          password,
        });

        if (authError) throw authError;

        if (authData.user) {
          // 2. Create Profile entry
          // We default to SELLER role for new signups
          const newProfile = {
            id: authData.user.id,
            name: fullName,
            username: username.split('@')[0], // Use the entered username (stripping domain if they typed email)
            role: UserRole.ADMIN, // Default role for new signups is Shop Owner
            subscription: SubscriptionTier.NONE,
            trial_started_at: new Date().toISOString(),
          };

          const { error: profileError } = await supabase
            .from('profiles')
            .insert([newProfile]);

          if (profileError) {
            console.error('Profile creation error:', profileError);
            throw new Error('Account created but profile setup failed. ' + profileError.message);
          }

          // 3. Log them in (trigger onLogin)
          // Map snake_case DB fields to camelCase User type
          const user: User = {
            id: newProfile.id,
            name: newProfile.name,
            username: newProfile.username,
            role: newProfile.role,
            createdAt: new Date().toISOString(),
            subscription: newProfile.subscription,
            trialStartedAt: newProfile.trial_started_at
          };

          onLogin(user);
        }
      } else {
        // LOGIN LOGIC
        // 1. Sign In
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password,
        });

        if (authError) throw authError;

        if (authData.user) {
          // 2. Fetch Profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();

          if (profileError) throw profileError;
          if (!profile) throw new Error('User profile not found.');

          // Map snake_case DB fields to camelCase User type
          const user: User = {
            id: profile.id,
            name: profile.name,
            username: profile.username,
            role: profile.role as UserRole,
            createdAt: profile.created_at,
            subscription: profile.subscription as SubscriptionTier,
            trialStartedAt: profile.trial_started_at
          };

          onLogin(user);
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500 rounded-full blur-[120px]"></div>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md z-10">
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="bg-blue-600 p-4 rounded-2xl mb-4 text-white shadow-lg shadow-blue-200">
            <ShieldCheck size={36} strokeWidth={2.5} />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">STOCK MASTER</h2>
          <p className="text-slate-500 mt-2 font-medium">{isSignUp ? 'Create your Shop Owner account' : 'Business Intelligence & Inventory'}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {isSignUp && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <ShieldCheck size={18} />
                </span>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Username</label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                <Users size={18} />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Password</label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                <KeyRound size={18} />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-xl shadow-slate-200 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <Lock size={18} />
                {isSignUp ? 'Create Account' : 'Secure Access'}
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
          >
            {isSignUp ? 'Already have an account? Log in' : 'New Shop Owner? Create account'}
          </button>
        </div>

        <div className="mt-10 pt-8 border-t border-slate-100 text-center space-y-2">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
            Certified Management System • v2.0
          </p>
        </div>
      </div>

      {/* Developer Footer on Login Screen */}
      <div className="mt-8 z-10 text-center">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Developed by</p>
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-col items-center">
            <h4 className="text-white font-black tracking-tight text-lg">INNOCENT MUSTAPHA</h4>
            <div className="flex items-center gap-2 text-slate-400 text-xs mt-1">
              <Mail size={12} className="text-blue-400" />
              <a href="mailto:innocentmustapha36@gmail.com" className="hover:text-white transition-colors">
                innocentmustapha36@gmail.com
              </a>
            </div>
          </div>

          <a
            href="https://wa.me/255678159460"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-xl text-xs font-bold border border-emerald-500/20 transition-all active:scale-95"
          >
            <MessageCircle size={16} />
            WhatsApp Support
          </a>

          <p className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.3em] mt-4">
            © {new Date().getFullYear()} STOCK MASTER. All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
