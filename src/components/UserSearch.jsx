import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import Toast from './Toast';

export default function UserSearch({ onClose, onFriendRequestSent }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState({});
  const [toast, setToast] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const searchUsers = async () => {
    if (!query.trim()) {
      setToast({ message: 'Please enter a username', type: 'warning' });
      return;
    }

    setLoading(true);
    setResults([]);
    try {
      const response = await api.get(`/users/search?q=${encodeURIComponent(query.trim())}`);
      setResults(response.data);
      if (response.data.length === 0) {
        setToast({ message: `No users found for "${query}"`, type: 'info' });
      }
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Search failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (userId) => {
    setSending((prev) => ({ ...prev, [userId]: true }));
    try {
      await api.post('/friends/request', { addresseeId: userId });
      setResults((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, friendStatus: 'pending', isRequester: true } : u
        )
      );
      setToast({ message: 'Friend request sent!', type: 'success' });
      onFriendRequestSent?.();
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Failed to send request', type: 'error' });
    } finally {
      setSending((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const getFriendStatusBadge = (user) => {
    if (!user.friendStatus) {
      return (
        <button
          onClick={() => sendFriendRequest(user.id)}
          disabled={sending[user.id]}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          {sending[user.id] ? 'Sending...' : 'Add Friend'}
        </button>
      );
    }

    if (user.friendStatus === 'accepted') {
      return (
        <span className="inline-flex items-center gap-1 text-green-400 text-xs font-medium">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Friends
        </span>
      );
    }

    if (user.friendStatus === 'pending') {
      if (user.isRequester) {
        return (
          <span className="text-slate-400 text-xs font-medium">Request sent</span>
        );
      } else {
        return (
          <span className="text-amber-400 text-xs font-medium">Pending</span>
        );
      }
    }

    return null;
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter') searchUsers();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#1e2330] rounded-2xl shadow-2xl border border-slate-700/50 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
          <h2 className="text-white font-semibold">Find People</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search input */}
        <div className="px-5 pt-4 pb-3">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search by username..."
              className="flex-1 bg-[#252d3d] text-white placeholder-slate-500 border border-slate-600 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            />
            <button
              onClick={searchUsers}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium px-4 py-2.5 rounded-xl transition-colors"
            >
              {loading ? '...' : 'Search'}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="px-5 pb-4 max-h-72 overflow-y-auto scrollbar-thin">
          {results.length > 0 && (
            <div className="space-y-2">
              {results.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between bg-[#252d3d] rounded-xl p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                      {u.username[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{u.username}</p>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${u.is_online ? 'bg-green-400' : 'bg-slate-500'}`}
                        />
                        <p className="text-slate-400 text-xs">{u.is_online ? 'Online' : 'Offline'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-3">
                    {getFriendStatusBadge(u)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="text-center text-slate-400 text-sm py-6">
              No results found
            </div>
          )}

          {!loading && !query && (
            <div className="text-center text-slate-500 text-sm py-6">
              Enter a username and press Search
            </div>
          )}
        </div>

        {/* Toast notification */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
            duration={3000}
          />
        )}
      </div>
    </div>
  );
}
