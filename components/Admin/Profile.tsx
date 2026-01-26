import React, { useState } from 'react';
import { User } from '../../types';
import { supabase } from '../../services/supabase';
import { User as UserIcon, Phone, Store, Camera, Save, Loader } from 'lucide-react';

interface ProfileProps {
    currentUser: User | null;
    onUpdateUser: (user: User) => void;
}

const Profile: React.FC<ProfileProps> = ({ currentUser, onUpdateUser }) => {
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [name, setName] = useState(currentUser?.name || '');
    const [phone, setPhone] = useState(currentUser?.phone || '');
    // const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || null); // Need to update type first? no, assume user has no avatarUrl yet on type, just handle locally or cast.
    // Actually, I should update User type eventually. For now, I'll store it in local state and try to save to DB.

    // Quick fix: user type doesn't have avatarUrl. I will treat it as potentially compatible if I cast or ignore TS for a sec, 
    // OR I should use a new state and not rely on currentUser.avatarUrl yet.
    const [localAvatar, setLocalAvatar] = useState<string | null>(null);

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);

            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('You must select an image to upload.');
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${currentUser?.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            // Get Public URL
            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

            if (data) {
                setLocalAvatar(data.publicUrl);

                // Save to Profile immediately
                if (currentUser) {
                    const { error: updateError } = await supabase
                        .from('profiles')
                        .update({ avatar_url: data.publicUrl })
                        .eq('id', currentUser.id);

                    if (updateError) throw updateError;

                    // Notify Parent
                    onUpdateUser({ ...currentUser, avatarUrl: data.publicUrl } as any);
                    alert('Profile photo uploaded successfully!');
                }
            }

        } catch (error: any) {
            console.error('Error uploading avatar:', error);
            alert('Error uploading avatar: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;
        setLoading(true);

        try {
            // Update Profile in DB
            const { error } = await supabase
                .from('profiles')
                .update({
                    name: name,
                    phone: phone,
                })
                .eq('id', currentUser.id);

            if (error) throw error;

            // Update Local State
            onUpdateUser({
                ...currentUser,
                name: name,
                phone: phone,
                // Preserve avatar if it was set
                ...(localAvatar ? { avatarUrl: localAvatar } : {})
            } as any);

            alert('Profile updated successfully!');
        } catch (err: any) {
            console.error('Error updating profile:', err);
            alert('Failed to update profile: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">Shop Profile</h1>
                <p className="text-slate-500 font-medium">Manage your account settings and shop details.</p>
            </div>

            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200 border border-slate-100 overflow-hidden">
                {/* Header / Banner */}
                <div className="h-32 bg-gradient-to-r from-blue-600 to-blue-800 relative">
                    <div className="absolute -bottom-10 left-8">
                        <div className="w-24 h-24 rounded-full bg-white p-1 shadow-lg relative group">
                            <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center text-slate-300 relative overflow-hidden border border-slate-200">
                                {localAvatar || (currentUser as any)?.avatarUrl ? (
                                    <img
                                        src={localAvatar || (currentUser as any)?.avatarUrl}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <UserIcon size={40} />
                                )}

                                {/* Overlay for Image Upload */}
                                <label
                                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                                    htmlFor="avatar-upload"
                                >
                                    {uploading ? <Loader size={24} className="animate-spin" /> : <Camera size={24} />}
                                </label>
                                <input
                                    type="file"
                                    id="avatar-upload"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                    disabled={uploading}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-14 px-8 pb-8">
                    <form onSubmit={handleSave} className="space-y-6 max-w-lg">

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Shop / Owner Name</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                    <Store size={18} />
                                </span>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold text-slate-700"
                                    placeholder="Enter shop or owner name"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Phone Number</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                    <Phone size={18} />
                                </span>
                                <input
                                    type="text"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold text-slate-700"
                                    placeholder="e.g. 0712345678"
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {loading ? <Loader size={18} className="animate-spin" /> : <Save size={18} />}
                                Save Changes
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
};

export default Profile;
