import React from 'react';
import { Plus, Search, Trash2, UserPlus } from 'lucide-react';
import { UserProfile, UserRole } from '../types';

interface UserManagerProps {
  users: UserProfile[];
  onAdd: (uid: string, profile: Partial<UserProfile>) => Promise<void>;
  onUpdate: (id: string, profile: Partial<UserProfile>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function UserManager({ users, onAdd, onUpdate, onDelete }: UserManagerProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<UserProfile | null>(null);
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    password: '',
    address: '',
    role: 'staff' as UserRole
  });

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: user.password || '',
      address: user.address || '',
      role: user.role || 'staff'
    });
  };

  const handleCancel = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      address: '',
      role: 'staff'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingUser) {
        await onUpdate(editingUser.id, formData);
      } else {
        const tempId = `user_${Math.random().toString(36).substr(2, 9)}`;
        await onAdd(tempId, {
          ...formData,
          locationIds: [],
        });
      }
      handleCancel();
    } catch (error) {
      console.error('Error saving user:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Users Management</h2>
      
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Side: Add User Form */}
        <div className="lg:w-1/3">
          <div className="bg-white rounded-[24px] shadow-sm border border-slate-200 overflow-hidden p-8 transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">{editingUser ? 'Edit User' : 'Add New User'}</h3>
              {editingUser && (
                <button 
                  onClick={handleCancel}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest"
                >
                  Cancel
                </button>
              )}
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">User Name</label>
                <input
                  type="text"
                  required
                  placeholder="Enter Name"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">User Email</label>
                <input
                  type="email"
                  required
                  placeholder="Enter Email"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
                <input
                  type="password"
                  required
                  placeholder="*******"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">User Address</label>
                <input
                  type="text"
                  placeholder="Enter Address"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Role</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-4 ${editingUser ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'} text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50`}
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {editingUser ? <Plus size={20} className="rotate-45" /> : <UserPlus size={20} />}
                    <span>{editingUser ? 'Update User' : 'Add User'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: User List */}
        <div className="lg:w-2/3">
          <div className="bg-white rounded-[24px] shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search users..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50/50 border border-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/30">
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredUsers.map((user, idx) => (
                    <tr key={user.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-600 font-medium">{idx + 1}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">{user.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{user.email}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{user.role}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-3">
                          <button
                            onClick={() => handleEdit(user)}
                            className="text-emerald-600 hover:text-emerald-800 font-bold text-sm transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onDelete(user.id)}
                            className="text-emerald-600 hover:text-emerald-800 font-bold text-sm transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
