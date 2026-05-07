import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSocket } from '../socket';
import api from '../api';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import UserSearch from '../components/UserSearch';
import FriendRequests from '../components/FriendRequests';
import ProfileModal from '../components/ProfileModal';

export default function Chat() {
  const [friends, setFriends] = useState([]);
  const [pendingReceived, setPendingReceived] = useState([]);
  const [pendingSent, setPendingSent] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const { user, logout, impersonating, adminUser, exitImpersonation, isAdmin } = useAuth();
  const navigate = useNavigate();

  const fetchFriends = useCallback(async () => {
    try {
      const response = await api.get('/friends');
      setFriends(response.data.friends);
      setPendingReceived(response.data.pendingReceived);
      setPendingSent(response.data.pendingSent);

      // Update selectedFriend with fresh data if still selected
      if (selectedFriend) {
        const updated = response.data.friends.find((f) => f.id === selectedFriend.id);
        if (updated) setSelectedFriend(updated);
      }
    } catch (err) {
      console.error('Failed to fetch friends:', err);
    }
  }, [selectedFriend?.id]);

  useEffect(() => {
    fetchFriends();
  }, []);

  // Socket real-time online/offline updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleUserOnline = ({ userId }) => {
      setFriends((prev) =>
        prev.map((f) => (f.id === userId ? { ...f, is_online: 1 } : f))
      );
      setSelectedFriend((prev) =>
        prev?.id === userId ? { ...prev, is_online: 1 } : prev
      );
    };

    const handleUserOffline = ({ userId }) => {
      setFriends((prev) =>
        prev.map((f) => (f.id === userId ? { ...f, is_online: 0 } : f))
      );
      setSelectedFriend((prev) =>
        prev?.id === userId ? { ...prev, is_online: 0 } : prev
      );
    };

    socket.on('user_online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);

    return () => {
      socket.off('user_online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleExitImpersonation = () => {
    exitImpersonation();
    navigate('/admin');
  };

  const handleSelectFriend = (friend) => {
    setSelectedFriend(friend);
    setMobileShowChat(true);
  };

  const handleMobileBack = () => {
    setMobileShowChat(false);
  };

  const handleFriendRequestSent = () => {
    fetchFriends();
  };

  const handleFriendRequestResponded = () => {
    fetchFriends();
    setShowRequests(false);
  };

  return (
    <div className="h-screen flex flex-col bg-[#1a1d27] overflow-hidden">
      {/* Impersonation Banner */}
      {impersonating && (
        <div className="bg-amber-500 text-amber-900 px-4 py-2.5 flex items-center justify-between flex-shrink-0 z-10">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-semibold">
              You are viewing as <strong>{user?.username}</strong> (Admin session)
            </span>
          </div>
          <button
            onClick={handleExitImpersonation}
            className="bg-amber-900/20 hover:bg-amber-900/30 text-amber-900 text-sm font-semibold px-4 py-1 rounded-lg transition-colors border border-amber-900/30"
          >
            Exit &rarr; Return to Admin
          </button>
        </div>
      )}

      {/* Admin nav link (for non-impersonating admin) */}
      {isAdmin && !impersonating && (
        <div className="bg-indigo-900/40 border-b border-indigo-700/30 px-4 py-2 flex items-center justify-between flex-shrink-0">
          <span className="text-indigo-300 text-xs font-medium">Admin mode active</span>
          <Link
            to="/admin"
            className="text-indigo-300 hover:text-indigo-200 text-xs font-medium underline transition-colors"
          >
            Go to Admin Dashboard &rarr;
          </Link>
        </div>
      )}

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: full screen on mobile when chat not open, always visible on md+ */}
        <div className={`${mobileShowChat ? 'hidden' : 'flex'} md:flex w-full md:w-72 flex-shrink-0`}>
          <Sidebar
            friends={friends}
            pendingReceived={pendingReceived.length}
            selectedFriend={selectedFriend}
            onSelectFriend={handleSelectFriend}
            onSearchOpen={() => setShowSearch(true)}
            onRequestsOpen={() => setShowRequests(true)}
            onProfileOpen={() => setShowProfile(true)}
            onLogout={handleLogout}
          />
        </div>

        {/* Chat: full screen on mobile when open, fills remaining on md+ */}
        <div className={`${mobileShowChat ? 'flex' : 'hidden'} md:flex flex-1 min-w-0`}>
          <ChatWindow
            friend={selectedFriend}
            onBack={handleMobileBack}
          />
        </div>
      </div>

      {/* Modals */}
      {showSearch && (
        <UserSearch
          onClose={() => setShowSearch(false)}
          onFriendRequestSent={handleFriendRequestSent}
        />
      )}

      {showRequests && (
        <FriendRequests
          pendingReceived={pendingReceived}
          onRespond={handleFriendRequestResponded}
          onClose={() => setShowRequests(false)}
        />
      )}

      {showProfile && (
        <ProfileModal onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
}
