import React, { useState } from 'react';
import { User, UserRole, SubscriptionTier } from '../../types';
import { Lock, ShieldCheck, KeyRound, Mail, MessageCircle, Users } from 'lucide-react';
import { supabase } from '../../services/supabase';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isForgotPassword) {
        if (!email) throw new Error('Please enter your email address.');

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;

        alert('Check your email for the password reset link!');
        setIsForgotPassword(false);
        return;
      }

      // Login Logic: Allow Username or Email
      // If logging in, use the 'username' field which might contain an email
      // If signing up, use the explicit 'email' field

      let authEmail = '';

      if (isSignUp) {
        if (!email) throw new Error('Email is required for sign up.');
        authEmail = email.toLowerCase().trim();
      } else {
        // Login Phase
        // 'username' state holds the input value (Username or Email)
        const input = username.trim();
        authEmail = input.includes('@')
          ? input.toLowerCase()
          : `${input.toLowerCase().replace(/\s+/g, '')}@stockmaster.local`;
      }

      console.log(`Attempting auth with: ${authEmail}`);

      if (isSignUp) {
        // 1. Sign Up with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: authEmail,
          password,
        });

        if (authError) throw authError;

        if (authData.user) {
          // 2. Create Profile entry
          const newProfile = {
            id: authData.user.id,
            name: fullName,
            username: username.split('@')[0],
            role: UserRole.ADMIN,
            subscription: SubscriptionTier.NONE,
            trial_started_at: new Date().toISOString(),
            // We could store email in profile too if needed, but it's in auth.users
          };

          const { error: profileError } = await supabase
            .from('profiles')
            .insert([newProfile]);

          if (profileError) {
            console.error('Profile creation error:', profileError);
            throw new Error('Account created but profile setup failed. ' + profileError.message);
          }

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
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password,
        });

        if (authError) throw authError;

        if (authData.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();

          if (profileError) throw profileError;
          if (!profile) throw new Error('User profile not found.');

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
            {isForgotPassword ? <Mail size={36} strokeWidth={2.5} /> : <ShieldCheck size={36} strokeWidth={2.5} />}
          </div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">STOCK MASTER</h2>
          <p className="text-slate-500 mt-2 font-medium">
            {isForgotPassword ? 'Recover your account' : isSignUp ? 'Create your Shop Owner account' : 'Business Intelligence & Inventory'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Forgot Password Flow */}
          {isForgotPassword ? (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <Mail size={18} />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium"
                  required
                />
              </div>
              <p className="text-xs text-slate-400 mt-2 px-1">We'll send a password reset link to this email.</p>
            </div>
          ) : (
            // Login / SignUp Flow
            <>
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

              {/* Email Field - Only for Sign Up */}
              {isSignUp && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                      <Mail size={18} />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium"
                      required={isSignUp}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                  {isSignUp ? 'Username' : 'Username or Email'}
                </label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <Users size={18} />
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={isSignUp ? "Choose a username" : "Enter username or email"}
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Password</label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => { setIsForgotPassword(true); setError(''); }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
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
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-xl shadow-slate-200 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                {isForgotPassword ? <Mail size={18} /> : <Lock size={18} />}
                {isForgotPassword ? 'Send Reset Link' : isSignUp ? 'Create Account' : 'Secure Access'}
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              if (isForgotPassword) {
                setIsForgotPassword(false);
                setError('');
              } else {
                setIsSignUp(!isSignUp);
                setError('');
              }
            }}
            className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
          >
            {isForgotPassword
              ? 'Back to Login'
              : isSignUp
                ? 'Already have an account? Log in'
                : 'New Shop Owner? Create account'}
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
