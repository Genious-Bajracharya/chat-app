import React, { useState } from 'react';
import api from '../api';

export default function FriendRequests({ pendingReceived, onRespond, onClose }) {
  const [responding, setResponding] = useState({});
  const [error, setError] = useState('');

  const handleRespond = async (requesterId, action) => {
    setResponding((prev) => ({ ...prev, [requesterId]: action }));
    try {
      await api.post('/friends/respond', { requesterId, action });
      onRespond?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to respond to request.');
    } finally {
      setResponding((prev) => ({ ...prev, [requesterId]: null }));
    }
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
          <div className="flex items-center gap-2">
            <h2 className="text-white font-semibold">Friend Requests</h2>
            {pendingReceived.length > 0 && (
              <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingReceived.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-3 text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        <div className="px-5 py-4 max-h-80 overflow-y-auto scrollbar-thin">
          {pendingReceived.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-8">
              <div className="text-3xl mb-2">🤝</div>
              No pending friend requests
            </div>
          ) : (
            <div className="space-y-3">
              {pendingReceived.map((req) => (
                <div
                  key={req.friendshipId}
                  className="flex items-center justify-between bg-[#252d3d] rounded-xl px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {req.username[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{req.username}</p>
                      <p className="text-slate-500 text-xs">Wants to be friends</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <button
                      onClick={() => handleRespond(req.id, 'accept')}
                      disabled={!!responding[req.id]}
                      className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {responding[req.id] === 'accept' ? '...' : 'Accept'}
                    </button>
                    <button
                      onClick={() => handleRespond(req.id, 'reject')}
                      disabled={!!responding[req.id]}
                      className="bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {responding[req.id] === 'reject' ? '...' : 'Decline'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
