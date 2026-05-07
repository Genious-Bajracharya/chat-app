import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [impersonatingId, setImpersonatingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [suspendingId, setSuspendingId] = useState(null);
  const [confirmSuspendId, setConfirmSuspendId] = useState(null);
  const { user, logout, impersonate } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = async (targetUser) => {
    if (targetUser.id === user.id) return;

    setImpersonatingId(targetUser.id);
    try {
      await impersonate(targetUser.id);
      navigate('/chat');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to impersonate user.');
      setImpersonatingId(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSuspend = async (targetUser) => {
    setSuspendingId(targetUser.id);
    try {
      const endpoint = targetUser.status === 'suspended' ? 'unsuspend' : 'suspend';
      await api.post(`/admin/users/${targetUser.id}/${endpoint}`);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUser.id
            ? { ...u, status: targetUser.status === 'suspended' ? null : 'suspended' }
            : u
        )
      );
      setConfirmSuspendId(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user status.');
    } finally {
      setSuspendingId(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-[#1a1d27]">
      {/* Top nav */}
      <header className="bg-[#1e2330] border-b border-slate-700/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💬</span>
            <div>
              <h1 className="text-lg font-bold text-white">ChatApp Admin</h1>
              <p className="text-xs text-slate-400">Control Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-400">
              Signed in as{' '}
              <span className="text-indigo-400 font-medium">{user?.username}</span>
            </div>
            <button
              onClick={handleLogout}
              className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#1e2330] rounded-xl p-5 border border-slate-700/50">
            <p className="text-slate-400 text-sm">Total Users</p>
            <p className="text-3xl font-bold text-white mt-1">{users.length}</p>
          </div>
          <div className="bg-[#1e2330] rounded-xl p-5 border border-slate-700/50">
            <p className="text-slate-400 text-sm">Online Now</p>
            <p className="text-3xl font-bold text-green-400 mt-1">
              {users.filter((u) => u.is_online).length}
            </p>
          </div>
          <div className="bg-[#1e2330] rounded-xl p-5 border border-slate-700/50">
            <p className="text-slate-400 text-sm">Admins</p>
            <p className="text-3xl font-bold text-indigo-400 mt-1">
              {users.filter((u) => u.role === 'admin').length}
            </p>
          </div>
        </div>

        {/* Users table */}
        <div className="bg-[#1e2330] rounded-2xl border border-slate-700/50 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-700/50 flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-lg font-semibold text-white">Registered Users</h2>
            <input
              type="text"
              placeholder="Search by username or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#252d3d] text-white placeholder-slate-500 border border-slate-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
            />
          </div>

          {error && (
            <div className="mx-6 mt-4 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-slate-400">Loading users...</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-3">
                      User
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-3">
                      Email
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-3">
                      Role
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-3">
                      Status
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-3">
                      Country
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-3">
                      Device
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-3">
                      Last Login
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-3">
                      Joined
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center text-slate-400 py-12">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr
                        key={u.id}
                        className={`hover:bg-slate-700/10 transition-colors ${u.status === 'suspended' ? 'opacity-60' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                              {u.username[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-white font-medium text-sm">{u.username}</p>
                                {u.status === 'suspended' && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
                                    Suspended
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-500 text-xs">ID: {u.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-300 text-sm">{u.email}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              u.role === 'admin'
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                : 'bg-slate-600/30 text-slate-400 border border-slate-600/30'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                              u.is_online ? 'text-green-400' : 'text-slate-500'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                u.is_online ? 'bg-green-400' : 'bg-slate-500'
                              }`}
                            />
                            {u.is_online ? 'Online' : 'Offline'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-300 text-sm">
                          <span className="bg-slate-700/30 text-slate-200 px-2.5 py-1 rounded-md text-xs">
                            {u.registration_country || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-300 text-sm">
                          <span className="text-xs" title={u.device_info}>
                            {u.device_info ? u.device_info.split(' on ')[0] : '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-sm">
                          {formatDateTime(u.last_login_at)}
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-sm">
                          {formatDate(u.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {u.id === user?.id ? (
                              <span className="text-slate-500 text-xs italic">You</span>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleImpersonate(u)}
                                  disabled={impersonatingId === u.id || u.status === 'suspended'}
                                  className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:text-amber-300 text-xs font-medium px-2 py-1 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={u.status === 'suspended' ? 'Cannot impersonate suspended users' : ''}
                                >
                                  {impersonatingId === u.id ? '...' : 'Login'}
                                </button>
                                <button
                                  onClick={() => setConfirmSuspendId(u.id)}
                                  disabled={suspendingId === u.id}
                                  className={`text-xs font-medium px-2 py-1 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                    u.status === 'suspended'
                                      ? 'bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 hover:text-green-300'
                                      : 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300'
                                  }`}
                                >
                                  {suspendingId === u.id ? '...' : u.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Suspension confirmation modal */}
        {confirmSuspendId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmSuspendId(null)} />
            <div className="relative bg-[#1e2330] rounded-2xl shadow-2xl border border-slate-700/50 w-full max-w-sm">
              <div className="px-6 py-5 border-b border-slate-700/50">
                <h3 className="text-white font-semibold text-lg">Confirm Action</h3>
              </div>
              <div className="px-6 py-4">
                {(() => {
                  const targetUser = users.find((u) => u.id === confirmSuspendId);
                  const isSuspended = targetUser?.status === 'suspended';
                  return (
                    <p className="text-slate-300 text-sm">
                      {isSuspended
                        ? `Unsuspend ${targetUser?.username}? They will be able to login again.`
                        : `Suspend ${targetUser?.username}? They won't be able to login until unsuspended.`}
                    </p>
                  );
                })()}
              </div>
              <div className="px-6 py-4 border-t border-slate-700/50 flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmSuspendId(null)}
                  className="px-4 py-2 text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-700/30 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const targetUser = users.find((u) => u.id === confirmSuspendId);
                    handleSuspend(targetUser);
                  }}
                  disabled={suspendingId === confirmSuspendId}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    users.find((u) => u.id === confirmSuspendId)?.status === 'suspended'
                      ? 'bg-green-600 hover:bg-green-500 text-white'
                      : 'bg-red-600 hover:bg-red-500 text-white'
                  }`}
                >
                  {suspendingId === confirmSuspendId ? 'Please wait...' : users.find((u) => u.id === confirmSuspendId)?.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
