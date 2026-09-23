import React from 'react';
import { UserProfile } from '../types';
import { User, Mail, Shield, Calendar, Edit2, Save, X, Loader2 } from 'lucide-react';
import { safeDate } from '../lib/utils';
import { updateUser } from '../lib/db';

interface ProfileViewProps {
  user: UserProfile;
  onUpdate: (updated: Partial<UserProfile>) => void;
}

export default function ProfileView({ user, onUpdate }: ProfileViewProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: user.name,
    email: user.email,
  });

  const handleSave = async () => {
    try {
      setLoading(true);
      await updateUser(user.id, formData);
      onUpdate(formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Waan ka xumahay, cilad ayaa dhacday inta lagu guda jiray cusboonaysiinta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Your Profile</h2>
        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-colors"
          >
            <Edit2 size={16} />
            <span>Edit Profile</span>
          </button>
        ) : (
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setIsEditing(false)}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
            >
              <X size={16} />
              <span>Cancel</span>
            </button>
            <button 
              onClick={handleSave}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 disabled:opacity-50 transition-colors shadow-lg shadow-indigo-600/20"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>Save Changes</span>
            </button>
          </div>
        )}
      </div>
      
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 md:p-12 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500" />
        
        <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8 mb-12">
          <div className="w-32 h-32 bg-indigo-50 rounded-[40px] flex items-center justify-center text-indigo-600 shadow-inner">
            <User size={64} />
          </div>
          <div className="text-center md:text-left pt-4">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    className="text-2xl font-bold text-slate-900 bg-slate-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none w-full"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-3xl font-black text-slate-900 mb-1">{user.name}</h3>
                <div className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold uppercase tracking-widest">
                  {user.role}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-slate-400 mb-2">
              <Mail size={16} />
              <span className="text-xs font-bold uppercase tracking-widest">Email Address</span>
            </div>
            {isEditing ? (
              <input
                type="email"
                className="text-slate-700 font-medium bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none w-full"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            ) : (
              <p className="text-slate-700 font-semibold bg-slate-50 px-4 py-3 rounded-2xl inline-block">{user.email}</p>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-slate-400 mb-2">
              <Shield size={16} />
              <span className="text-xs font-bold uppercase tracking-widest">Access Level</span>
            </div>
            <p className="text-slate-700 font-semibold bg-slate-50 px-4 py-3 rounded-2xl inline-block capitalize">{user.role}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-slate-400 mb-2">
              <Calendar size={16} />
              <span className="text-xs font-bold uppercase tracking-widest">Joined Date</span>
            </div>
            <p className="text-slate-700 font-semibold bg-slate-50 px-4 py-3 rounded-2xl inline-block">
              {safeDate(user.createdAt).toLocaleDateString(undefined, { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
