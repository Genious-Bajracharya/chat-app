import React, { useState } from 'react';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';

export default function ProfileModal({ onClose }) {
  const { user, updateUser } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [status, setStatus] = useState(user?.status || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const save = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.put('/users/me/profile', { username, status, bio });
      updateUser(res.data);
      setSuccess('Profile saved!');
      setTimeout(onClose, 800);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1d27] rounded-2xl p-6 w-96 max-w-full flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold text-lg">Edit Profile</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button>
        </div>

        {/* Avatar placeholder */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
            {(username[0] || '?').toUpperCase()}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-slate-400 text-xs mb-1 block">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={30}
              className="w-full bg-[#252d3d] text-white border border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-slate-400 text-xs mb-1 block">Status</label>
            <input
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              placeholder="e.g. Available 👋"
              maxLength={100}
              className="w-full bg-[#252d3d] text-white placeholder-slate-500 border border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-slate-400 text-xs mb-1 block">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell friends a bit about yourself..."
              maxLength={300}
              rows={3}
              className="w-full bg-[#252d3d] text-white placeholder-slate-500 border border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <p className="text-slate-600 text-xs text-right mt-0.5">{bio.length}/300</p>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
        {success && <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">{success}</p>}

        <div className="flex gap-3">
          <button
            onClick={save}
            disabled={saving || !username.trim()}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
