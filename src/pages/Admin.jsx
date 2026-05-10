import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import DSLogo from '../components/DSLogo';

export default function Admin() {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [impersonatingId, setImpersonatingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [suspendingId, setSuspendingId] = useState(null);
  const [confirmSuspendId, setConfirmSuspendId] = useState(null);
  const [resolvingReportId, setResolvingReportId] = useState(null);
  const [confirmResolveReport, setConfirmResolveReport] = useState(null);
  const { user, logout, impersonate } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else {
      fetchReports();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/users');
      setUsers(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/reports');
      setReports(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load reports.');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveReport = async (reportId, action) => {
    setResolvingReportId(reportId);
    try {
      await api.post(`/admin/reports/${reportId}/resolve`, { action });
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId ? { ...r, status: 'resolved' } : r
        )
      );
      setConfirmResolveReport(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resolve report.');
    } finally {
      setResolvingReportId(null);
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
            <DSLogo size={36} />
            <div>
              <h1 className="text-lg font-bold text-white">D&S Chats Admin</h1>
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
        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-slate-700/50">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'users'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'reports'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            Reports ({reports.filter((r) => r.status === 'pending').length})
          </button>
        </div>

        {/* Stats cards */}
        {activeTab === 'users' && (
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
        )}

        {/* Users table */}
        {activeTab === 'users' && (
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
        )}

        {/* Reports view */}
        {activeTab === 'reports' && (
        <div className="bg-[#1e2330] rounded-2xl border border-slate-700/50 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-700/50">
            <h2 className="text-lg font-semibold text-white">User Reports</h2>
            <p className="text-slate-400 text-sm mt-1">{reports.filter((r) => r.status === 'pending').length} pending · {reports.filter((r) => r.status === 'resolved').length} resolved</p>
          </div>

          {error && (
            <div className="mx-6 mt-4 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-slate-400">Loading reports...</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-3">
                      Reported User
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-3">
                      Reporter
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-3">
                      Reason
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-3">
                      Status
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-3">
                      Reported At
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {reports.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-slate-400 py-12">
                        No reports yet.
                      </td>
                    </tr>
                  ) : (
                    reports.map((r) => (
                      <tr
                        key={r.id}
                        className={`hover:bg-slate-700/10 transition-colors ${r.status === 'resolved' ? 'opacity-60' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                              {r.reported_username[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-white font-medium text-sm">{r.reported_username}</p>
                              <p className="text-slate-500 text-xs">{r.reported_email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-slate-300 text-sm">{r.reporter_username}</p>
                            <p className="text-slate-500 text-xs">{r.reporter_email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-slate-300 text-sm max-w-xs truncate" title={r.reason}>{r.reason}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              r.status === 'pending'
                                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                                : 'bg-green-500/20 text-green-300 border border-green-500/30'
                            }`}
                          >
                            {r.status === 'pending' ? '🔔 Pending' : '✓ Resolved'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-sm">
                          {formatDateTime(r.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          {r.status === 'pending' ? (
                            <button
                              onClick={() => setConfirmResolveReport(r.id)}
                              disabled={resolvingReportId === r.id}
                              className="bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 hover:text-orange-300 text-xs font-medium px-2 py-1 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {resolvingReportId === r.id ? '...' : 'Review'}
                            </button>
                          ) : (
                            <span className="text-slate-500 text-xs">Closed by {r.admin_username}</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}

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

        {/* Report resolution modal */}
        {confirmResolveReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmResolveReport(null)} />
            <div className="relative bg-[#1e2330] rounded-2xl shadow-2xl border border-slate-700/50 w-full max-w-sm">
              <div className="px-6 py-5 border-b border-slate-700/50">
                <h3 className="text-white font-semibold text-lg">Resolve Report</h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                {(() => {
                  const report = reports.find((r) => r.id === confirmResolveReport);
                  return (
                    <>
                      <div>
                        <p className="text-slate-400 text-xs uppercase tracking-wide font-medium mb-1">Reported User</p>
                        <p className="text-white font-medium">{report?.reported_username}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs uppercase tracking-wide font-medium mb-1">Reason</p>
                        <p className="text-slate-300 text-sm">{report?.reason}</p>
                      </div>
                      <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-3">
                        <p className="text-slate-300 text-sm">
                          Choose an action to resolve this report:
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className="px-6 py-4 border-t border-slate-700/50 flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmResolveReport(null)}
                  className="px-4 py-2 text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-700/30 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleResolveReport(confirmResolveReport, 'dismiss')}
                  disabled={resolvingReportId === confirmResolveReport}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-600 hover:bg-slate-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resolvingReportId === confirmResolveReport ? '...' : 'Dismiss'}
                </button>
                <button
                  onClick={() => {
                    const report = reports.find((r) => r.id === confirmResolveReport);
                    if (report) {
                      // First suspend the user
                      handleSuspend({ id: report.reported_user_id });
                      // Then resolve the report
                      handleResolveReport(confirmResolveReport, 'suspend');
                    }
                  }}
                  disabled={resolvingReportId === confirmResolveReport}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resolvingReportId === confirmResolveReport ? '...' : 'Suspend & Resolve'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
