
import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../services/supabase';
import { User, UserRole, SubscriptionTier } from '../../types';
import { Plus, Trash2, UserPlus, Shield, User as UserIcon, X, Key, Users, Lock, ChevronDown, ChevronRight } from 'lucide-react';

// Use a secondary client for creation to avoid logging out the admin
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const tempClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

interface UserManagementProps {
  users: User[];
  onUpdate: (users: User[]) => void;
  currentUser: User;
  translations: any;
  isSubscribed: boolean;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, onUpdate, currentUser, translations, isSubscribed }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [expandedAdmins, setExpandedAdmins] = useState<Set<string>>(new Set());

  const isSuperAdmin = currentUser.role === UserRole.SUPER_ADMIN;
  const isAdmin = currentUser.role === UserRole.ADMIN;

  const toggleAdminExpansion = (adminId: string) => {
    const newExpanded = new Set(expandedAdmins);
    if (newExpanded.has(adminId)) {
      newExpanded.delete(adminId);
    } else {
      newExpanded.add(adminId);
    }
    setExpandedAdmins(newExpanded);
  };

  // Group users by their owner (for Super Admin view)
  const groupedUsers = () => {
    if (isSuperAdmin) {
      // Get all admins
      const admins = users.filter(u => u.role === UserRole.ADMIN);
      return admins.map(admin => ({
        admin,
        workers: users.filter(u => u.role === UserRole.SELLER && u.ownerId === admin.id)
      }));
    } else if (isAdmin) {
      // Regular admin only sees their own workers
      return [{
        admin: currentUser,
        workers: users.filter(u => u.role === UserRole.SELLER && u.ownerId === currentUser.id)
      }];
    }
    return [];
  };

  const handleDelete = async (id: string) => {
    if (id === currentUser.id) return alert("Cannot delete your own account.");

    const userToDelete = users.find(u => u.id === id);
    if (!isSuperAdmin && userToDelete?.role === UserRole.ADMIN && userToDelete?.id !== currentUser.id) {
      return alert("You do not have permission to delete other Shop Owners.");
    }

    if (confirm("Permanently remove this account? This will remove their PROFILE. (Note: Auth account requires manual removal in Supabase console for security)")) {
      try {
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error) throw error;
        onUpdate(users.filter(u => u.id !== id));
      } catch (err: any) {
        alert("Failed to delete user profile: " + err.message);
      }
    }
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;

    const formData = new FormData(e.currentTarget);
    const updatedData = {
      name: formData.get('name') as string,
      role: formData.get('role') as UserRole,
    };

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: updatedData.name,
          role: updatedData.role
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      onUpdate(users.map(u => u.id === editingUser.id ? { ...u, ...updatedData } : u));
      setEditingUser(null);
    } catch (err: any) {
      alert("Failed to update user: " + err.message);
    }
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const role = formData.get('role') as UserRole;
    const name = formData.get('name') as string;
    const username = formData.get('username') as string;
    const password = (formData.get('password') as string) || 'password123';

    try {
      // 1. Prepare Auth Email
      const authEmail = username.includes('@')
        ? username.toLowerCase().trim()
        : `${username.toLowerCase().trim().replace(/\s+/g, '')}@stockmaster.local`;

      // 2. Sign Up User (using temp client to keep Admin logged in)
      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: authEmail,
        password: password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // 3. Create Profile
        const newProfile = {
          id: authData.user.id,
          name: name,
          username: username.split('@')[0],
          role: role,
          subscription: SubscriptionTier.NONE,
          trial_started_at: new Date().toISOString(),
          owner_id: role === UserRole.SELLER ? currentUser.id : null
        };

        const { error: profileError } = await supabase
          .from('profiles')
          .insert([newProfile]);

        if (profileError) throw profileError;

        // 4. Update Local State
        const newUser: User = {
          id: newProfile.id,
          name: newProfile.name,
          username: newProfile.username,
          role: newProfile.role,
          createdAt: newProfile.trial_started_at, // using as created_at proxy
          subscription: newProfile.subscription,
          trialStartedAt: newProfile.trial_started_at,
          ownerId: newProfile.owner_id || undefined
        };

        onUpdate([...users, newUser]);
        setIsModalOpen(false);
        alert('User created successfully!');
      }
    } catch (err: any) {
      console.error('Error creating user:', err);
      alert('Failed to create user: ' + err.message);
    }
  };

  const renderUserCard = (user: User, showDelete: boolean = true) => (
    <div key={user.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-blue-500 transition-all">
      <div className={`absolute top-0 right-0 w-1.5 h-full ${user.role === UserRole.ADMIN ? 'bg-blue-600' : 'bg-slate-200'}`}></div>

      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${user.role === UserRole.SUPER_ADMIN ? 'bg-purple-50 text-purple-600' : user.role === UserRole.ADMIN ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
          {user.role === UserRole.SUPER_ADMIN ? <Lock size={24} /> : user.role === UserRole.ADMIN ? <Shield size={24} /> : <UserIcon size={24} />}
        </div>
        {showDelete && user.id !== currentUser.id && (
          <button
            onClick={() => {
              if (!isSubscribed) return alert("Upgrade to Basic to manage users.");
              handleDelete(user.id);
            }}
            className={`p-2 rounded-lg transition-all ${isSubscribed ? 'text-slate-300 hover:text-red-500 hover:bg-red-50' : 'text-slate-100'}`}
            title="Revoke Access"
          >
            {isSubscribed ? <Trash2 size={18} /> : <Lock size={18} />}
          </button>
        )}
      </div>

      <h4 className="font-bold text-slate-800 text-lg tracking-tight">{user.name}</h4>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-sm text-slate-400 font-medium">@{user.username}</span>
        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
        <span className="text-[10px] font-black uppercase text-blue-500">{user.role}</span>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-400">
          <Key size={12} />
          <span className="text-xs font-bold uppercase tracking-tight">Access Active</span>
        </div>
        <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">
          Added {new Date(user.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200">
            <Users size={28} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">{translations.staff || 'Staff Management'}</h3>
            <p className="text-sm text-slate-500">
              {isSuperAdmin ? 'Oversee all shop owners and their workers' : 'Authorize or dismiss staff members from the system'}
            </p>
          </div>
        </div>
        {isSubscribed ? (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3.5 rounded-2xl font-bold text-sm shadow-xl transition-all active:scale-95"
          >
            <UserPlus size={18} /> Register Worker
          </button>
        ) : (
          <div className="flex items-center gap-3 px-6 py-3.5 bg-slate-100 rounded-2xl text-slate-400 border border-slate-200">
            <Lock size={18} />
            <span className="text-sm font-bold uppercase tracking-widest">Upgrade to Add Staff</span>
          </div>
        )}
      </div>

      {/* Grouped User View */}
      <div className="space-y-8">
        {groupedUsers().length > 0 ? (
          groupedUsers().map((group, groupIndex) => (
            <div key={group.admin.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              {/* Shop Header */}
              <div className="px-8 py-5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                    {group.admin.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 tracking-tight">
                      {group.admin.name}'s Shop
                    </h4>
                    <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest">
                      Owner: @{group.admin.username}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-100">
                  <span className="text-xs font-black text-slate-400 uppercase">Staff Count:</span>
                  <span className="text-lg font-black text-slate-800">{group.workers.length}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-slate-50">
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 w-16">Status</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Staff Member</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Position</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Joined</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {/* Render Admin as top row in their own shop table if is Super Admin */}
                    {isSuperAdmin && (
                      <tr className="bg-blue-50/30 group">
                        <td className="px-8 py-4 font-bold text-blue-600 text-xs text-center border-r border-blue-50">OWNER</td>
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="font-bold text-slate-800 tracking-tight">{group.admin.name}</p>
                              <p className="text-xs text-slate-400 font-medium">@{group.admin.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest">ADMIN</span>
                        </td>
                        <td className="px-8 py-4 text-xs text-slate-500 font-bold uppercase">{new Date(group.admin.createdAt).toLocaleDateString()}</td>
                        <td className="px-8 py-4 text-right">
                          <button onClick={() => setEditingUser(group.admin)} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg transition-all"><Users size={16} /></button>
                        </td>
                      </tr>
                    )}

                    {/* Render Workers */}
                    {group.workers.length > 0 ? (
                      group.workers.map((worker) => (
                        <tr key={worker.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-8 py-4">
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-300 mx-auto"></div>
                          </td>
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-400 text-xs">
                                {worker.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 tracking-tight">{worker.name}</p>
                                <p className="text-xs text-slate-400 font-medium">@{worker.username}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-4">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-600">
                              {worker.role}
                            </span>
                          </td>
                          <td className="px-8 py-4">
                            <p className="text-xs text-slate-500 font-semibold uppercase tracking-tight">
                              {new Date(worker.createdAt).toLocaleDateString()}
                            </p>
                          </td>
                          <td className="px-8 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => setEditingUser(worker)} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg transition-all"><Users size={16} /></button>
                              <button onClick={() => handleDelete(worker.id)} className="p-2 text-slate-400 hover:text-red-500 rounded-lg transition-all"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-8 py-8 text-center bg-slate-50/20">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">No sellers hired yet</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-20 text-center">
            <UserIcon size={48} className="mx-auto mb-4 opacity-10" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No shop accounts registered yet</p>
          </div>
        )}

        {/* Super Admins List (Separate section for system oversight) */}
        {isSuperAdmin && users.filter(u => u.role === UserRole.SUPER_ADMIN).length > 0 && (
          <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800">
            <div className="flex items-center gap-3 mb-6">
              <Lock className="text-purple-400" size={20} />
              <h4 className="text-white font-black uppercase tracking-widest text-sm">System Super Administrators</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.filter(u => u.role === UserRole.SUPER_ADMIN).map(sa => (
                <div key={sa.id} className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500 text-white flex items-center justify-center font-bold">
                      {sa.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm tracking-tight">{sa.name}</p>
                      <p className="text-slate-500 text-[10px]">@{sa.username}</p>
                    </div>
                  </div>
                  {sa.id !== currentUser.id && (
                    <button onClick={() => handleDelete(sa.id)} className="p-2 text-slate-500 hover:text-red-400"><Trash2 size={16} /></button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Edit User Details</h3>
              <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Full Legal Name</label>
                <input
                  name="name"
                  defaultValue={editingUser.name}
                  required
                  className="w-full px-5 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Role</label>
                <select
                  name="role"
                  defaultValue={editingUser.role}
                  className="w-full px-5 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold appearance-none"
                >
                  <option value={UserRole.SELLER}>Seller (Worker)</option>
                  <option value={UserRole.ADMIN}>Administrator (Owner)</option>
                  {isSuperAdmin && <option value={UserRole.SUPER_ADMIN}>Super Admin</option>}
                </select>
              </div>
              <div className="pt-6">
                <button type="submit" className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-100 transition-all uppercase tracking-widest text-sm">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Registration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Open Worker Account</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Full Legal Name</label>
                <input name="name" required className="w-full px-5 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold" placeholder="e.g. John Doe" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">System Username</label>
                <input name="username" required className="w-full px-5 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold" placeholder="e.g. jdoe_staff" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Initial Password</label>
                <input name="password" type="password" required className="w-full px-5 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold" placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Designated Role</label>
                <select name="role" className="w-full px-5 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold appearance-none">
                  <option value={UserRole.SELLER}>Seller (Worker)</option>
                  {isSuperAdmin && <option value={UserRole.ADMIN}>Administrator (Owner)</option>}
                </select>
              </div>
              <div className="pt-6">
                <button type="submit" className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-100 transition-all uppercase tracking-widest text-sm">
                  Initialize Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
