import React, { useState } from 'react';
import { User, UserRole, SubscriptionTier } from '../../types';
import { Lock, ShieldCheck, KeyRound, Mail, MessageCircle, Users } from 'lucide-react';
import { supabase } from '../../services/supabase';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [signUpMethod, setSignUpMethod] = useState<'phone' | 'email'>('phone');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
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
        if (!email && !phone) throw new Error('Please enter your email or phone.');

        let identifier = email || phone;
        alert(`Password recovery instructions sent to ${identifier}. (Simulation)`);
        setIsForgotPassword(false);
        return;
      }

      // Auth Logic
      let authEmail = '';

      if (isSignUp) {
        if (signUpMethod === 'email') {
          if (!email) throw new Error('Email is required.');
          authEmail = email.toLowerCase().trim();
        } else {
          if (!phone) throw new Error('Phone number is required.');
          const cleanPhone = phone.replace(/\D/g, '');
          authEmail = `${cleanPhone}@stockmaster.local`;
        }
      } else {
        // Login Phase
        // Identify if input is Phone (digits) or Email (@)
        // We use 'username' state for the login input
        const input = username.trim();

        const isPhone = /^\d+$/.test(input.replace(/\D/g, '')) && input.length > 6 && !input.includes('@');

        if (isPhone) {
          const cleanPhone = input.replace(/\D/g, '');
          authEmail = `${cleanPhone}@stockmaster.local`;
        } else if (input.includes('@')) {
          // Likely an email (either real or stockmaster.local)
          // But if they type 'john@example.com', we use it. 
          // If they type just username 'john', we construct pseudo-email
          authEmail = input.toLowerCase();
        } else {
          // Username login
          authEmail = `${input.toLowerCase().replace(/\s+/g, '')}@stockmaster.local`;
        }
      }

      console.log(`Attempting auth with: ${authEmail}`);

      let userAuth = null;
      let isNewUser = false;

      if (isSignUp) {
        // 1. Try Sign Up
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: authEmail,
          password,
        });

        if (authError) {
          // Handle "User already registered"
          if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
            console.log('User exists, attempting login...');
            const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
              email: authEmail,
              password,
            });

            if (loginError) throw new Error('Account exists but password was incorrect. Please Log In.');

            userAuth = loginData.user;
            isNewUser = false; // Existing user, so we check/repair profile
          } else {
            throw authError;
          }
        } else {
          userAuth = authData.user;
          isNewUser = true; // New user, create profile
        }
      } else {
        // LOGIN
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password,
        });
        if (authError) throw authError;
        userAuth = authData.user;
        isNewUser = false;
      }

      // 2. Profile Management
      if (userAuth) {
        if (isNewUser) {
          const newProfile = {
            id: userAuth.id,
            name: fullName,
            username: username || (signUpMethod === 'email' ? email.split('@')[0] : phone),
            phone: signUpMethod === 'phone' ? phone : undefined,
            role: UserRole.ADMIN,
            subscription: SubscriptionTier.NONE,
            trial_started_at: new Date().toISOString(),
          };

          const { error: profileError } = await supabase.from('profiles').insert([newProfile]);
          if (profileError) {
            console.error('Profile creation error:', profileError);
            // If conflict, maybe it already exists? treat as repair needed?
            // For now throw, or could fall through to repair check.
            throw new Error('Account created but profile setup failed: ' + profileError.message);
          }

          onLogin({
            id: newProfile.id,
            name: newProfile.name,
            username: newProfile.username,
            role: newProfile.role,
            createdAt: new Date().toISOString(),
            subscription: newProfile.subscription,
            trialStartedAt: newProfile.trial_started_at,
            phone: newProfile.phone
          });

        } else {
          // Check / Repair Profile
          const { data: profile, error: profileFetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userAuth.id)
            .single();

          if (!profile) {
            // Self-Repair
            console.log('Profile missing. Attempting repair...');
            const repairProfile = {
              id: userAuth.id,
              name: fullName || 'Shop Owner',
              username: username || userAuth.email?.split('@')[0] || 'user',
              role: UserRole.ADMIN,
              subscription: SubscriptionTier.NONE,
              trial_started_at: new Date().toISOString(),
              phone: phone || undefined
            };

            const { error: repairError } = await supabase.from('profiles').insert([repairProfile]);
            if (repairError) throw new Error('Profile missing and passed repair failed. Contact Support.');

            onLogin({
              id: repairProfile.id,
              name: repairProfile.name,
              username: repairProfile.username,
              role: repairProfile.role,
              createdAt: new Date().toISOString(),
              subscription: repairProfile.subscription,
              trialStartedAt: repairProfile.trial_started_at,
              phone: repairProfile.phone
            });
            return;
          }

          if (profileFetchError) throw profileFetchError;

          onLogin({
            id: profile.id,
            name: profile.name,
            username: profile.username,
            role: profile.role as UserRole,
            createdAt: profile.created_at,
            subscription: profile.subscription as SubscriptionTier,
            trialStartedAt: profile.trial_started_at,
            phone: profile.phone
          });
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
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="bg-blue-600 p-4 rounded-2xl mb-4 text-white shadow-lg shadow-blue-200">
            {isForgotPassword ? <Lock size={36} strokeWidth={2.5} /> : <ShieldCheck size={36} strokeWidth={2.5} />}
          </div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">STOCK MASTER</h2>
          <p className="text-slate-500 mt-2 font-medium">
            {isForgotPassword ? 'Reset Password' : isSignUp ? 'Create Shop Account' : 'Business Intelligence'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Method Toggle for SignUp */}
          {isSignUp && !isForgotPassword && (
            <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => setSignUpMethod('phone')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all ${signUpMethod === 'phone' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Phone Number
              </button>
              <button
                type="button"
                onClick={() => setSignUpMethod('email')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all ${signUpMethod === 'email' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Email Address
              </button>
            </div>
          )}

          {/* Forgot Password Flow */}
          {isForgotPassword ? (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
              <div className="bg-slate-50 p-4 rounded-xl text-center">
                <p className="text-sm text-slate-600">Enter your registered email or phone number to receive reset instructions.</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email or Phone</label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <Users size={18} />
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setEmail(e.target.value.includes('@') ? e.target.value : '');
                      setPhone(!e.target.value.includes('@') ? e.target.value : '');
                    }}
                    placeholder="e.g. 0712345678 or name@example.com"
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium"
                    required
                  />
                </div>
              </div>
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

              {/* SignUp: Conditional Fields */}
              {isSignUp ? (
                signUpMethod === 'phone' ? (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Phone Number</label>
                    <div className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                        <MessageCircle size={18} />
                      </span>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 0712345678"
                        className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium"
                        required={isSignUp}
                      />
                    </div>
                  </div>
                ) : (
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
                )
              ) : (
                // Login Input (Phone, Email, or Username)
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                    Phone, Email or Username
                  </label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                      <Users size={18} />
                    </span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter phone, email or username"
                      className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium"
                      required
                    />
                  </div>
                </div>
              )}

              {isSignUp && (
                // Clean up Username field for signup (optional)
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Username (Optional)</label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                      <Users size={18} />
                    </span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Choose a username"
                      className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium"
                    />
                  </div>
                </div>
              )}

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
                {isForgotPassword ? <MessageCircle size={18} /> : <Lock size={18} />}
                {isForgotPassword ? 'Send Recovery Code' : isSignUp ? 'Create Account' : 'Secure Access'}
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
