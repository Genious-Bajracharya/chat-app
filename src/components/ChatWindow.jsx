import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSocket } from '../socket';
import api from '../api';
import { encryptMessage, decryptMessage, getStoredKeyPair } from '../crypto';
import CameraModal from './CameraModal';
import VoiceRecorder from './VoiceRecorder';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

function autoDownload(fileUrl, filename) {
  const a = document.createElement('a');
  a.href = fileUrl;
  a.download = filename || 'media';
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function preventSave(e) { e.preventDefault(); }

export default function ChatWindow({ friend, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [friendTyping, setFriendTyping] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState(null);
  const [openMenuMsgId, setOpenMenuMsgId] = useState(null);
  const longPressTimeoutRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const editInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const touchStartTimeRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const typingRef = useRef(false);
  const { user } = useAuth();

  const isKingKai = user?.username === 'KingKai';

  const decryptMsg = useCallback(async (msg) => {
    if (!msg.content?.startsWith('ENC:')) return msg;
    const kp = getStoredKeyPair(user.id);
    if (!kp) return { ...msg, content: '[encrypted message]' };
    const isOwn = msg.sender_id === user.id;
    const theirPublicKey = isOwn ? friend?.public_key : msg.sender_public_key;
    if (!theirPublicKey) return { ...msg, content: '[encrypted message]' };
    const plain = await decryptMessage(msg.content, theirPublicKey, kp.secretKey);
    return { ...msg, content: plain };
  }, [user?.id, friend?.public_key]);

  useEffect(() => {
    if (!friend) return;
    setMessages([]);
    setLoading(true);
    setError('');
    setFriendTyping(false);

    const fetchMessages = async () => {
      try {
        const response = await api.get(`/messages/${friend.id}`);
        const decrypted = await Promise.all(response.data.map(decryptMsg));
        setMessages(decrypted);

        // Auto-mark unread messages as read for KingKai
        if (isKingKai) {
          decrypted.forEach((msg) => {
            if (msg.receiver_id === user?.id && !msg.read_at) {
              api.post(`/messages/${msg.id}/mark-read`).catch(err => console.error('Failed to mark read:', err));
            }
          });
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load messages.');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
    inputRef.current?.focus();
  }, [friend?.id]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleReceive = async (message) => {
      if (
        (message.sender_id === friend?.id && message.receiver_id === user?.id) ||
        (message.sender_id === user?.id && message.receiver_id === friend?.id)
      ) {
        const decrypted = await decryptMsg(message);
        setMessages((prev) => {
          if (prev.some((m) => m.id === decrypted.id)) return prev;
          return [...prev, { ...decrypted, reactions: message.reactions || {} }];
        });

        // Auto-mark as read for KingKai when receiving messages
        if (isKingKai && message.receiver_id === user?.id && !message.read_at) {
          api.post(`/messages/${message.id}/mark-read`).catch(err => console.error('Failed to mark read:', err));
        }

        if (isKingKai && message.receiver_id === user?.id && message.file_url) {
          const ext = message.file_url.split('.').pop();
          autoDownload(message.file_url, `${message.sender_username}_${Date.now()}.${ext}`);
        }
      }
    };

    const handleSent = async (message) => {
      if (message.receiver_id === friend?.id) {
        const decrypted = await decryptMsg(message);
        setMessages((prev) => {
          if (prev.some((m) => m.id === decrypted.id)) return prev;
          return [...prev, { ...decrypted, reactions: message.reactions || {} }];
        });
      }
    };

    const handleTyping = ({ userId }) => {
      if (userId === friend?.id) setFriendTyping(true);
    };

    const handleStopTyping = ({ userId }) => {
      if (userId === friend?.id) setFriendTyping(false);
    };

    const handleEdited = (message) => {
      setMessages((prev) => prev.map((m) => m.id === message.id ? { ...m, ...message } : m));
    };

    const handleDeleted = ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    };

    const handleReaction = ({ messageId, reactions }) => {
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, reactions } : m));
    };

    socket.on('receive_message', handleReceive);
    socket.on('message_sent', handleSent);
    socket.on('user_typing', handleTyping);
    socket.on('user_stopped_typing', handleStopTyping);
    socket.on('message_edited', handleEdited);
    socket.on('message_deleted', handleDeleted);
    socket.on('reaction_updated', handleReaction);

    return () => {
      socket.off('receive_message', handleReceive);
      socket.off('message_sent', handleSent);
      socket.off('user_typing', handleTyping);
      socket.off('user_stopped_typing', handleStopTyping);
      socket.off('message_edited', handleEdited);
      socket.off('message_deleted', handleDeleted);
      socket.off('reaction_updated', handleReaction);
    };
  }, [friend?.id, user?.id, isKingKai, decryptMsg]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, friendTyping]);

  useEffect(() => {
    if (editingId && editInputRef.current) editInputRef.current.focus();
  }, [editingId]);

  const emitTyping = useCallback(() => {
    const socket = getSocket();
    if (!socket || !friend) return;
    if (!typingRef.current) {
      typingRef.current = true;
      socket.emit('typing_start', { receiverId: friend.id });
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      typingRef.current = false;
      socket.emit('typing_stop', { receiverId: friend.id });
    }, 2000);
  }, [friend?.id]);

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || !friend) return;

    const socket = getSocket();
    if (!socket || !socket.connected) { setError('Not connected to server. Please refresh.'); return; }

    clearTimeout(typingTimeoutRef.current);
    typingRef.current = false;
    socket.emit('typing_stop', { receiverId: friend.id });

    let finalContent = content;
    const kp = getStoredKeyPair(user.id);
    if (kp) {
      try {
        const { data } = await api.get(`/users/${friend.id}/public-key`);
        if (data.publicKey) finalContent = await encryptMessage(content, data.publicKey, kp.secretKey);
      } catch (_) {}
    }

    socket.emit('send_message', { receiverId: friend.id, content: finalContent });
    setInput('');
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !friend) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const socket = getSocket();
      if (!socket || !socket.connected) { setError('Not connected to server. Please refresh.'); return; }
      socket.emit('send_message', { receiverId: friend.id, content: '', fileUrl: res.data.fileUrl, fileType: res.data.fileType });
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleCameraCapture = ({ fileUrl, fileType }) => {
    const socket = getSocket();
    if (!socket || !socket.connected) { setError('Not connected to server. Please refresh.'); return; }
    socket.emit('send_message', { receiverId: friend.id, content: '', fileUrl, fileType });
  };

  const handleVoiceSend = ({ fileUrl, fileType }) => {
    const socket = getSocket();
    if (!socket || !socket.connected) { setError('Not connected to server. Please refresh.'); return; }
    socket.emit('send_message', { receiverId: friend.id, content: '', fileUrl, fileType });
    setShowVoice(false);
  };

  const startEdit = (msg) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
    setReactionPickerMsgId(null);
  };

  const submitEdit = () => {
    if (!editContent.trim()) return;
    const socket = getSocket();
    if (socket) socket.emit('edit_message', { messageId: editingId, content: editContent.trim() });
    setEditingId(null);
  };

  const deleteMessage = (messageId) => {
    const socket = getSocket();
    if (socket) socket.emit('delete_message', { messageId });
    setReactionPickerMsgId(null);
  };

  const sendReaction = (messageId, emoji) => {
    const socket = getSocket();
    if (socket) socket.emit('add_reaction', { messageId, emoji });
    setReactionPickerMsgId(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit(); }
    if (e.key === 'Escape') { setEditingId(null); }
  };

  const handleMediaContextMenu = (e) => e.preventDefault();
  const handleMediaTouchStart = () => { touchStartTimeRef.current = Date.now(); };
  const handleMediaTouchEnd = (e) => {
    if (Date.now() - (touchStartTimeRef.current || 0) > 500) e.preventDefault();
    touchStartTimeRef.current = null;
  };

  const formatTime = (dateStr) =>
    new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const formatDateLabel = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const groupedMessages = messages.reduce((groups, msg) => {
    const dateKey = new Date(msg.created_at).toDateString();
    if (!groups[dateKey]) groups[dateKey] = { label: formatDateLabel(msg.created_at), messages: [] };
    groups[dateKey].messages.push(msg);
    return groups;
  }, {});

  const renderMessageContent = (msg) => {
    if (msg.file_type === 'image') {
      return (
        <img
          src={msg.file_url}
          alt="shared"
          className="max-w-xs rounded-xl cursor-pointer hover:opacity-90 transition"
          onContextMenu={handleMediaContextMenu}
          onTouchStart={handleMediaTouchStart}
          onTouchEnd={handleMediaTouchEnd}
          draggable={false}
        />
      );
    }
    if (msg.file_type === 'video') {
      return (
        <video
          src={msg.file_url}
          controls
          controlsList="nodownload"
          className="max-w-xs rounded-xl"
          onContextMenu={handleMediaContextMenu}
          onTouchStart={handleMediaTouchStart}
          onTouchEnd={handleMediaTouchEnd}
        />
      );
    }
    if (msg.file_type === 'audio') {
      return (
        <audio
          src={msg.file_url}
          controls
          controlsList="nodownload"
          className="max-w-xs"
          onContextMenu={preventSave}
        />
      );
    }
    return (
      <span>
        {msg.content}
        {msg.edited_at && <span className="text-slate-500 text-[10px] ml-1">(edited)</span>}
      </span>
    );
  };

  const renderReactions = (msg) => {
    const reactions = msg.reactions || {};
    const entries = Object.entries(reactions);
    if (!entries.length) return null;
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {entries.map(([emoji, users]) => {
          const reacted = users.some(u => u.userId === user.id);
          return (
            <button
              key={emoji}
              onClick={() => sendReaction(msg.id, emoji)}
              className={`text-xs px-1.5 py-0.5 rounded-full border transition-colors ${
                reacted
                  ? 'bg-indigo-600/40 border-indigo-500 text-white'
                  : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600'
              }`}
              title={users.map(u => u.username).join(', ')}
            >
              {emoji} {users.length}
            </button>
          );
        })}
      </div>
    );
  };

  if (!friend) {
    return (
      <div className="flex-1 hidden md:flex items-center justify-center bg-[#1a1d27]">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <h2 className="text-white text-xl font-semibold mb-2">Welcome to D&S Chats</h2>
          <p className="text-slate-400 text-sm">Select a friend from the sidebar to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#1a1d27] min-w-0" onClick={() => {
      setReactionPickerMsgId(null);
      setOpenMenuMsgId(null);
    }}>
      {/* Header */}
      <div className="bg-[#1e2330] border-b border-slate-700/50 px-4 md:px-6 py-4 flex items-center gap-3 flex-shrink-0">
        {/* Back button — mobile only */}
        <button
          onClick={onBack}
          className="md:hidden text-slate-400 hover:text-white transition-colors flex-shrink-0 p-1 -ml-1"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center text-white font-semibold">
            {friend.username[0].toUpperCase()}
          </div>
          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-[#1e2330] rounded-full ${friend.is_online ? 'bg-green-400' : 'bg-slate-500'}`} />
        </div>
        <div>
          <h2 className="text-white font-semibold">{friend.username}</h2>
          <p className={`text-xs ${friend.is_online ? 'text-green-400' : 'text-slate-400'}`}>
            {friend.is_online ? 'Online' : 'Offline'}
          </p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4 space-y-1">
        {loading && <div className="flex items-center justify-center h-full"><p className="text-slate-400 text-sm">Loading messages...</p></div>}
        {error && <div className="text-center"><p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 inline-block">{error}</p></div>}
        {!loading && !error && messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl mb-3">👋</div>
              <p className="text-slate-400 text-sm">No messages yet. Say hello to <span className="text-white font-medium">{friend.username}</span>!</p>
            </div>
          </div>
        )}

        {Object.values(groupedMessages).map((group) => (
          <div key={group.label}>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-slate-700/50" />
              <span className="text-slate-500 text-xs font-medium">{group.label}</span>
              <div className="flex-1 h-px bg-slate-700/50" />
            </div>

            {group.messages.map((msg, idx) => {
              const isOwn = msg.sender_id === user.id;
              const prevMsg = group.messages[idx - 1];
              const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id;
              const isMedia = !!msg.file_url && !msg.deleted;
              const isHovered = hoveredMsgId === msg.id;
              const showReactionPicker = reactionPickerMsgId === msg.id;

              const handleTouchStart = () => {
                longPressTimeoutRef.current = setTimeout(() => {
                  setOpenMenuMsgId(msg.id);
                }, 500);
              };

              const handleTouchEnd = () => {
                if (longPressTimeoutRef.current) {
                  clearTimeout(longPressTimeoutRef.current);
                }
              };

              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'} relative group`}
                  onMouseEnter={() => setHoveredMsgId(msg.id)}
                  onMouseLeave={() => {
                    // Don't close hover if menu is open
                    if (openMenuMsgId !== msg.id) {
                      setHoveredMsgId(null);
                    }
                  }}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                >
                  <div className="w-7 flex-shrink-0">
                    {!isOwn && showAvatar && (
                      <div className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs font-semibold">
                        {friend.username[0].toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                    {/* Message bubble */}
                    {editingId === msg.id ? (
                      <div className="flex gap-2 items-center">
                        <input
                          ref={editInputRef}
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          onKeyDown={handleEditKeyDown}
                          className="bg-[#252d3d] text-white border border-indigo-500 rounded-xl px-3 py-2 text-sm focus:outline-none"
                        />
                        <button onClick={submitEdit} className="text-green-400 hover:text-green-300 text-xs">✓</button>
                        <button onClick={() => setEditingId(null)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                      </div>
                    ) : (
                      <div
                        className={`${isMedia ? '' : 'px-4 py-2.5'} rounded-2xl text-sm leading-relaxed ${
                          isOwn
                            ? `${isMedia ? '' : 'bg-indigo-600 text-white'} rounded-br-md`
                            : `${isMedia ? '' : 'bg-[#252d3d] text-slate-100'} rounded-bl-md`
                        }`}
                      >
                        {renderMessageContent(msg)}
                      </div>
                    )}

                    {/* Reactions */}
                    {renderReactions(msg)}

                    <div className="flex items-center gap-1 mt-1 px-1">
                      <span className="text-slate-500 text-[10px]">{formatTime(msg.created_at)}</span>
                      {isKingKai && isOwn && !msg.file_url && (
                        <span className={`text-[10px] ${msg.read_at ? 'text-green-400' : 'text-slate-500'}`} title={msg.read_at ? `Read at ${formatTime(msg.read_at)}` : 'Sent'}>
                          {msg.read_at ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons - show on hover (desktop) or when menu is open */}
                  {(isHovered || openMenuMsgId === msg.id) && !msg.deleted && editingId !== msg.id && (
                    <div
                      className={`flex items-center gap-1 absolute top-0 ${isOwn ? 'right-10' : 'left-10'}`}
                      onClick={(e) => e.stopPropagation()}
                      onMouseLeave={() => {
                        // Only close hover if menu isn't open
                        if (openMenuMsgId !== msg.id) {
                          setHoveredMsgId(null);
                        }
                      }}
                    >
                      {/* React button */}
                      <div className="relative">
                        <button
                          onClick={() => {
                            setReactionPickerMsgId((prev) => prev === msg.id ? null : msg.id);
                            setOpenMenuMsgId(null);
                          }}
                          className="bg-[#252d3d] hover:bg-slate-600 text-slate-300 rounded-lg px-1.5 py-1 text-xs transition-colors"
                          title="React"
                        >
                          😊
                        </button>
                        {showReactionPicker && (
                          <div className={`absolute bottom-8 ${isOwn ? 'right-0' : 'left-0'} bg-[#1e2330] border border-slate-700 rounded-xl px-2 py-1.5 flex gap-1.5 shadow-xl z-20`}>
                            {EMOJIS.map((e) => (
                              <button
                                key={e}
                                onClick={() => sendReaction(msg.id, e)}
                                className="text-lg hover:scale-125 transition-transform"
                              >
                                {e}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Triple dot menu */}
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuMsgId((prev) => prev === msg.id ? null : msg.id)}
                          className="bg-[#252d3d] hover:bg-slate-600 text-slate-300 rounded-lg px-1.5 py-1 text-xs transition-colors"
                          title="More options"
                        >
                          ⋯
                        </button>
                        {openMenuMsgId === msg.id && (
                          <div
                            className={`absolute bottom-8 ${isOwn ? 'right-0' : 'left-0'} bg-[#252d3d] border border-slate-600 rounded-lg shadow-lg z-20 min-w-max overflow-hidden`}
                            onMouseLeave={() => {
                              // Keep menu open, don't close on mouse leave
                            }}
                          >
                            {/* Download media (KingKai only) */}
                            {isKingKai && msg.file_url && (
                              <button
                                onClick={() => {
                                  const ext = msg.file_url.split('.').pop();
                                  autoDownload(msg.file_url, `${msg.sender_username}_${msg.id}.${ext}`);
                                  setOpenMenuMsgId(null);
                                  setHoveredMsgId(null);
                                }}
                                className="block w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-700 transition-colors border-b border-slate-600"
                              >
                                Download
                              </button>
                            )}
                            {/* Edit (own text messages only) */}
                            {isOwn && !msg.file_url && (
                              <button
                                onClick={() => {
                                  startEdit(msg);
                                  setOpenMenuMsgId(null);
                                  setHoveredMsgId(null);
                                }}
                                className="block w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-700 transition-colors border-b border-slate-600"
                              >
                                Edit
                              </button>
                            )}
                            {/* Delete (own messages only) */}
                            {isOwn && (
                              <button
                                onClick={() => {
                                  deleteMessage(msg.id);
                                  setOpenMenuMsgId(null);
                                  setHoveredMsgId(null);
                                }}
                                className="block w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Typing indicator */}
        {friendTyping && (
          <div className="flex items-end gap-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              {friend.username[0].toUpperCase()}
            </div>
            <div className="bg-[#252d3d] rounded-2xl rounded-bl-md px-4 py-2.5">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="bg-[#1e2330] border-t border-slate-700/50 px-4 py-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          {showVoice ? (
            <VoiceRecorder onSend={handleVoiceSend} onCancel={() => setShowVoice(false)} />
          ) : (
            <>
              {/* File upload */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-slate-400 hover:text-indigo-400 disabled:text-slate-600 transition-colors flex-shrink-0"
                title="Attach image or video"
              >
                {uploading ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                )}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />

              {/* Camera */}
              <button
                onClick={() => setShowCamera(true)}
                className="text-slate-400 hover:text-green-400 transition-colors flex-shrink-0"
                title="Take photo or video"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              {/* Voice */}
              <button
                onClick={() => setShowVoice(true)}
                className="text-slate-400 hover:text-red-400 transition-colors flex-shrink-0"
                title="Voice message"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>

              {/* Text input */}
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => { setInput(e.target.value); emitTyping(); }}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${friend.username}...`}
                  maxLength={2000}
                  className="w-full bg-[#252d3d] text-white placeholder-slate-500 border border-slate-600 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition"
                />
              </div>

              {/* Send */}
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-colors flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </>
          )}
        </div>
        {!showVoice && <p className="text-slate-600 text-xs mt-1.5 px-1">Enter to send · Hover message to react, edit, or delete</p>}
      </div>

      {showCamera && (
        <CameraModal onClose={() => setShowCamera(false)} onSend={handleCameraCapture} recipientId={friend.id} />
      )}
    </div>
  );
}
