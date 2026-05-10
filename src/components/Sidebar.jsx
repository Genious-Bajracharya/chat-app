import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import DSLogo from './DSLogo';
import ComingSoonModal from './ComingSoonModal';

export default function Sidebar({
  friends,
  pendingReceived,
  selectedFriend,
  onSelectFriend,
  onSearchOpen,
  onRequestsOpen,
  onProfileOpen,
  onLogout
}) {
  const { user } = useAuth();
  const [showComingSoon, setShowComingSoon] = useState(false);

  return (
    <div className="w-full md:w-72 flex-shrink-0 bg-[#1e2330] flex flex-col border-r border-slate-700/50 h-full">
      {/* App header */}
      <div className="px-5 py-4 border-b border-slate-700/50">
        <div className="flex items-center gap-2 mb-4">
          <DSLogo size={32} />
          <h1 className="text-white font-bold text-lg">D&S Chats</h1>
        </div>

        {/* Current user info */}
        <div className="flex items-center gap-3 bg-[#252d3d] rounded-xl px-3 py-2.5">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-[#252d3d] rounded-full" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm font-medium truncate">{user?.username}</p>
            <p className="text-slate-500 text-xs truncate">{user?.status || user?.email}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-b border-slate-700/30 flex gap-2 flex-wrap">
        <button
          onClick={onSearchOpen}
          className="flex-1 flex items-center justify-center gap-1.5 bg-[#252d3d] hover:bg-[#2d3748] text-slate-300 hover:text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Find People
        </button>

        <button
          onClick={onRequestsOpen}
          className="relative flex items-center justify-center gap-1.5 bg-[#252d3d] hover:bg-[#2d3748] text-slate-300 hover:text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Requests
          {pendingReceived > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {pendingReceived > 9 ? '9+' : pendingReceived}
            </span>
          )}
        </button>

        <button
          onClick={() => setShowComingSoon(true)}
          className="flex-1 flex items-center justify-center gap-1.5 bg-[#252d3d] hover:bg-[#2d3748] text-slate-300 hover:text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
          title="View upcoming features"
        >
          <span>🚀</span>
          Coming Soon
        </button>
      </div>

      {/* Friends list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-2">
        <div className="px-4 py-2">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
            Friends — {friends.length}
          </p>
        </div>

        {friends.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-slate-500 text-sm">No friends yet</p>
            <p className="text-slate-600 text-xs mt-1">Search for people to add</p>
          </div>
        ) : (
          friends.map((friend) => (
            <button
              key={friend.id}
              onClick={() => onSelectFriend(friend)}
              className={`w-full flex items-center gap-3 px-4 py-3 md:py-2.5 hover:bg-[#252d3d] transition-colors text-left ${
                selectedFriend?.id === friend.id ? 'bg-[#252d3d]' : ''
              }`}
            >
              {/* Avatar with online indicator */}
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center text-white font-semibold">
                  {friend.username[0].toUpperCase()}
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-[#1e2330] rounded-full ${
                    friend.is_online ? 'bg-green-400' : 'bg-slate-500'
                  }`}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium truncate ${
                    selectedFriend?.id === friend.id ? 'text-white' : 'text-slate-200'
                  }`}
                >
                  {friend.username}
                </p>
                <p className={`text-xs ${friend.is_online ? 'text-green-400' : 'text-slate-500'}`}>
                  {friend.is_online ? 'Online' : 'Offline'}
                </p>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Bottom actions */}
      <div className="px-4 py-3 border-t border-slate-700/50 flex flex-col gap-1">
        <button
          onClick={onProfileOpen}
          className="w-full flex items-center gap-2 text-slate-400 hover:text-indigo-400 text-sm py-2 px-3 rounded-lg hover:bg-indigo-500/10 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Edit Profile
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 text-slate-400 hover:text-red-400 text-sm py-2 px-3 rounded-lg hover:bg-red-500/10 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>

      {/* Coming Soon Modal */}
      <ComingSoonModal isOpen={showComingSoon} onClose={() => setShowComingSoon(false)} />
    </div>
  );
}
