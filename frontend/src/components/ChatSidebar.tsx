"use client"

import { Chats, User } from '@/context/Appcontext';
import { useSocket } from '@/context/SocketContext';
import { useCall } from '@/context/CallContext';
import {
  CornerDownRight,
  CornerUpLeft,
  LogOut,
  MessageCircle,
  Plus,
  Search,
  User as UserIcon,
  UserPlus,
  X,
  Star,
  Users,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Video,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import HaveItLogo from './HaveItLogo';
import HaveItNavTabs from './HaveItNavTabs';
import ThemeToggleBtn from './ThemeToggleBtn';
import { ChatListSkeleton } from './Skeleton';

interface ChatSidebarProps {
  sideBarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  showAllUsers: boolean;
  setShowAllUsers: (show: boolean | ((prev: boolean) => boolean)) => void;
  users: User[] | null;
  loggedInUser: User | null;
  chats: Chats[] | null;
  selectedUser: string | null;
  setSelectedUser: (userId: string | null) => void;
  handleLogout: () => void;
  createChat: (user: User) => void;
  onOpenCreateGroup: () => void;
}

const formatChatTime = (isoString?: string) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

type FilterPill = 'all' | 'unread' | 'favorites' | 'groups' | 'calls';

const ChatSidebar = ({
  sideBarOpen,
  setSidebarOpen,
  showAllUsers,
  setShowAllUsers,
  users,
  loggedInUser,
  chats,
  selectedUser,
  setSelectedUser,
  handleLogout,
  createChat,
  onOpenCreateGroup,
}: ChatSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterPill>('all');
  const [favoriteChatIds, setFavoriteChatIds] = useState<string[]>([]);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const { isOnline } = useSocket();
  const { startCall, callLogs, clearCallLogs } = useCall();

  // Load saved favorites
  useEffect(() => {
    try {
      const saved = localStorage.getItem('haveit_fav_chats') || localStorage.getItem('whatsapp_fav_chats');
      if (saved) {
        setFavoriteChatIds(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Close plus menu on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.plus-menu') && !target.closest('.plus-trigger')) {
        setShowPlusMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const toggleFavorite = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    setFavoriteChatIds((prev) => {
      const next = prev.includes(chatId)
        ? prev.filter((id) => id !== chatId)
        : [...prev, chatId];
      localStorage.setItem('haveit_fav_chats', JSON.stringify(next));
      return next;
    });
  };

  // Filter conversations
  const filteredChats = chats
    ?.filter((chat) => Boolean(chat && chat.chat))
    .filter((chat) => {
      const unseenCount = chat?.chat?.unseenCount || 0;
      const chatId = chat?.chat?._id;
      const isGroup = Boolean(chat?.chat?.isGroup || chat?.user?.isGroup);

      if (activeFilter === 'unread' && unseenCount === 0) return false;
      if (activeFilter === 'favorites' && (!chatId || !favoriteChatIds.includes(chatId))) return false;
      if (activeFilter === 'groups' && !isGroup) return false;

      if (!searchQuery.trim()) return true;
      const otherUserName = chat?.user?.groupName || chat?.user?.name || '';
      const messageText = chat?.chat?.latestMessage?.text || '';
      const query = searchQuery.toLowerCase();
      return (
        otherUserName.toLowerCase().includes(query) ||
        messageText.toLowerCase().includes(query)
      );
    });

  const filteredUsers = users?.filter(
    (u) =>
      u?._id !== loggedInUser?._id &&
      (u?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const myAvatarUrl =
    typeof loggedInUser?.avatar === 'string'
      ? loggedInUser.avatar
      : loggedInUser?.avatar?.url || '';

  const unreadChatsCount = (chats || []).filter(
    (c) => (c?.chat?.unseenCount || 0) > 0
  ).length;

  return (
    <aside className="w-full h-full bg-[#111b21] md:border-r md:border-gray-800 flex flex-col select-none overflow-hidden">
      {/* Sidebar Header */}
      <div className="p-3 bg-[#202c33] border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {sideBarOpen && (
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 hover:bg-gray-700/60 rounded-lg transition-colors cursor-pointer mr-1"
                title="Close"
              >
                <X className="w-5 h-5 text-gray-300" />
              </button>
            </div>
          )}

          <Link
            href="/chat"
            className="flex items-center gap-2 hover:opacity-90 transition-opacity"
            title="Have-it"
          >
            <HaveItLogo size={32} glow={false} />
            <span className="text-base font-bold text-white tracking-tight">
              Have<span className="text-[#03cafc]">-it</span>
            </span>
          </Link>
        </div>

        {/* Profile Shortcut */}
        <Link
          href="/profile"
          className="flex items-center gap-2 hover:opacity-85 transition-opacity"
          title="Open Profile Settings"
        >
          <div className="w-8 h-8 rounded-full bg-[#202c33] border border-[#03cafc]/40 flex items-center justify-center overflow-hidden shadow-sm">
            {myAvatarUrl ? (
              <img src={myAvatarUrl} alt={loggedInUser?.name || 'Me'} className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-4 h-4 text-gray-300" />
            )}
          </div>
          <div className="hidden md:block min-w-0">
            <span className="text-xs font-semibold text-white truncate block max-w-[90px]">
              {loggedInUser?.name || 'Profile'}
            </span>
          </div>
        </Link>

        {/* Header Action Controls (Theme Toggle & Plus Menu) */}
        <div className="relative flex items-center gap-1.5">
          <ThemeToggleBtn />

          <button
            className={`plus-trigger p-2 rounded-full transition-all cursor-pointer ${
              showAllUsers
                ? 'bg-rose-600/90 hover:bg-rose-700 text-white'
                : 'bg-[#03cafc] hover:bg-[#029ecc] text-[#0b141a] shadow-md shadow-[#03cafc]/20 active:scale-95'
            }`}
            onClick={() => {
              if (showAllUsers) {
                setShowAllUsers(false);
                setSearchQuery('');
              } else {
                setShowPlusMenu((prev) => !prev);
              }
            }}
            title={showAllUsers ? 'Close User List' : 'Start New Chat or Group'}
          >
            {showAllUsers ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>

          {/* Plus Dropdown Menu */}
          {showPlusMenu && !showAllUsers && (
            <div className="plus-menu absolute right-0 top-full mt-2 w-44 bg-[#202c33] border border-gray-700 rounded-xl shadow-2xl py-1 z-50 text-xs animate-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  setShowPlusMenu(false);
                  onOpenCreateGroup();
                }}
                className="w-full px-3.5 py-2.5 flex items-center gap-2.5 text-gray-200 hover:bg-[#111b21] transition-colors text-left cursor-pointer"
              >
                <Users className="w-4 h-4 text-[#03cafc]" />
                <span>New group</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowPlusMenu(false);
                  setShowAllUsers(true);
                  setSearchQuery('');
                }}
                className="w-full px-3.5 py-2.5 flex items-center gap-2.5 text-gray-200 hover:bg-[#111b21] transition-colors text-left cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-[#03cafc]" />
                <span>New chat</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Navigation Tabs: Chats vs Posts */}
      <HaveItNavTabs unreadChatsCount={unreadChatsCount} />

      {/* Search Input Bar */}
      <div className="px-3 pt-2 pb-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={showAllUsers ? 'Search registered contacts...' : 'Search or start new chat...'}
            className="w-full pl-9 pr-8 py-2 bg-[#202c33] border border-gray-700/60 rounded-xl text-white placeholder-gray-400 text-xs focus:outline-none focus:border-[#03cafc] transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Navigation Pills (All, Unread, Favourites, Groups) */}
      {!showAllUsers && (
        <div className="px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto custom-scroll">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-[#03cafc]/20 text-[#03cafc] font-semibold border border-[#03cafc]/40'
                : 'bg-[#202c33] text-gray-400 hover:text-white border border-transparent'
            }`}
          >
            All
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('unread')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${
              activeFilter === 'unread'
                ? 'bg-[#03cafc]/20 text-[#03cafc] font-semibold border border-[#03cafc]/40'
                : 'bg-[#202c33] text-gray-400 hover:text-white border border-transparent'
            }`}
          >
            <span>Unread</span>
            {unreadChatsCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#03cafc] text-black text-[10px] font-bold inline-flex items-center justify-center">
                {unreadChatsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('favorites')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${
              activeFilter === 'favorites'
                ? 'bg-[#03cafc]/20 text-[#03cafc] font-semibold border border-[#03cafc]/40'
                : 'bg-[#202c33] text-gray-400 hover:text-white border border-transparent'
            }`}
          >
            <Star className="w-3 h-3 text-amber-400" />
            <span>Favourites</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('groups')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${
              activeFilter === 'groups'
                ? 'bg-[#03cafc]/20 text-[#03cafc] font-semibold border border-[#03cafc]/40'
                : 'bg-[#202c33] text-gray-400 hover:text-white border border-transparent'
            }`}
          >
            <Users className="w-3 h-3" />
            <span>Groups</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('calls')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${
              activeFilter === 'calls'
                ? 'bg-[#03cafc]/20 text-[#03cafc] font-semibold border border-[#03cafc]/40'
                : 'bg-[#202c33] text-gray-400 hover:text-white border border-transparent'
            }`}
          >
            <Phone className="w-3 h-3" />
            <span>Calls</span>
          </button>
        </div>
      )}

      {/* Main Conversation List / Contact Selection / Call History */}
      <div className="flex-1 overflow-hidden px-3 py-1">
        {activeFilter === 'calls' && !showAllUsers ? (
          /* CALL LOGS VIEW */
          <div className="space-y-1.5 overflow-y-auto h-full pb-4 custom-scroll">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-[11px] font-semibold text-[#03cafc] uppercase tracking-wider">
                Recent Calls ({callLogs.length})
              </span>
              {callLogs.length > 0 && (
                <button
                  type="button"
                  onClick={clearCallLogs}
                  className="text-[10px] text-gray-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {callLogs.length > 0 ? (
              callLogs.map((log) => {
                const targetUserObj = (users || []).find((u) => u._id === log.targetUserId);

                return (
                  <div
                    key={log.id}
                    className="w-full p-2.5 rounded-xl bg-[#202c33] border border-gray-700/50 flex items-center justify-between group hover:border-[#03cafc]/40 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-11 h-11 rounded-full bg-[#111b21] border border-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {log.targetAvatar ? (
                          <img src={log.targetAvatar} alt={log.targetName} className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-5 h-5 text-gray-300" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-semibold text-white block truncate">
                          {log.targetName}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                          {log.status === 'missed' ? (
                            <PhoneMissed className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                          ) : log.isCaller ? (
                            <PhoneOutgoing className="w-3.5 h-3.5 text-[#03cafc] flex-shrink-0" />
                          ) : (
                            <PhoneIncoming className="w-3.5 h-3.5 text-[#03cafc] flex-shrink-0" />
                          )}
                          <span className="truncate">
                            {formatChatTime(log.timestamp)}
                            {log.duration > 0 && ` • ${log.duration}s`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Call Back Actions */}
                    {targetUserObj && (
                      <div className="flex items-center gap-1 ml-2">
                        {log.isVideo ? (
                          <button
                            type="button"
                            onClick={() => startCall(targetUserObj, true)}
                            className="p-2 hover:bg-[#111b21] rounded-full text-[#03cafc] hover:text-[#70e1fd] transition-colors cursor-pointer"
                            title={`Video call ${log.targetName}`}
                          >
                            <Video className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startCall(targetUserObj, false)}
                            className="p-2 hover:bg-[#111b21] rounded-full text-[#03cafc] hover:text-[#70e1fd] transition-colors cursor-pointer"
                            title={`Voice call ${log.targetName}`}
                          >
                            <Phone className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center text-center h-48 px-4 text-gray-400 text-xs">
                <Phone className="w-8 h-8 text-gray-600 mb-2" />
                <p className="font-semibold text-gray-300">No Call History</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Your audio and video calls will appear here.
                </p>
              </div>
            )}
          </div>
        ) : showAllUsers ? (
          /* Show All Users (New Chat Mode) */
          <div className="space-y-1.5 overflow-y-auto h-full pb-4 custom-scroll">
            <p className="text-[11px] font-semibold text-[#03cafc] uppercase tracking-wider px-2 py-1">
              Select Contact to Message
            </p>
            {users === null ? (
              <ChatListSkeleton count={6} />
            ) : filteredUsers && filteredUsers.length > 0 ? (
              filteredUsers.map((u) => {
                const online = isOnline(u._id);
                const userAvatar =
                  typeof u.avatar === 'string'
                    ? u.avatar
                    : u.avatar?.url || '';

                return (
                  <button
                    key={u._id}
                    className="w-full text-left p-2.5 rounded-xl border border-transparent hover:bg-[#202c33] hover:border-[#03cafc]/30 transition-all cursor-pointer group"
                    onClick={() => createChat(u)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <div className="w-11 h-11 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center overflow-hidden">
                          {userAvatar ? (
                            <img src={userAvatar} alt={u.name} className="w-full h-full object-cover" />
                          ) : (
                            <UserIcon className="w-6 h-6 text-gray-300" />
                          )}
                        </div>
                        {online && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#03cafc] border-2 border-[#111b21] rounded-full shadow-sm" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-white group-hover:text-[#03cafc] transition-colors truncate block text-sm">
                          {u.name || 'User'}
                        </span>
                        <div className="text-xs mt-0.5 truncate text-gray-400">
                          {u.about ? (
                            <span>{u.about}</span>
                          ) : online ? (
                            <span className="text-[#03cafc] font-medium">online</span>
                          ) : (
                            <span className="text-gray-500">offline</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="text-center py-12 text-gray-400 text-xs">
                No users found matching &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        ) : chats === null ? (
          <div className="overflow-y-auto h-full pb-4 custom-scroll">
            <ChatListSkeleton count={7} />
          </div>
        ) : filteredChats && filteredChats.length > 0 ? (
          /* Conversation List */
          <div className="space-y-1 overflow-y-auto h-full pb-4 custom-scroll">
            {filteredChats.map((chat, idx) => {
              const latestMessage = chat?.chat?.latestMessage;
              const chatId = chat?.chat?._id;
              const isSelected = selectedUser === chatId;
              const isSentByMe = latestMessage?.sender === loggedInUser?._id;
              const unseenCount = chat?.chat?.unseenCount || 0;
              const otherUserId = chat?.user?._id;
              const otherUserName = chat?.user?.name || 'Unknown User';
              const otherUserOnline = isOnline(otherUserId);
              const isFavorite = chatId ? favoriteChatIds.includes(chatId) : false;

              const contactAvatar =
                typeof chat?.user?.avatar === 'string'
                  ? chat.user.avatar
                  : chat?.user?.avatar?.url || '';

              const isGroup = Boolean(chat?.chat?.isGroup || chat?.user?.isGroup);
              const displayName = isGroup
                ? chat?.user?.groupName || chat?.user?.name || 'Group Chat'
                : otherUserName;

              return (
                <div
                  key={chatId || `chat-item-${idx}`}
                  onClick={() => {
                    if (chatId) {
                      setSelectedUser(chatId);
                      setSidebarOpen(false);
                    }
                  }}
                  className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer group relative ${
                    isSelected
                      ? 'bg-[#182730] border-l-4 border-l-[#03cafc] border-y border-r border-gray-800/80 shadow-md'
                      : 'hover:bg-[#202c33] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-[#111b21] border border-gray-700 flex items-center justify-center overflow-hidden">
                        {displayName === "Have-it Team" || contactAvatar === "/icon.svg" ? (
                          <div className="w-full h-full flex items-center justify-center p-1.5 bg-[#0b141a]">
                            <HaveItLogo size={34} glow={false} />
                          </div>
                        ) : contactAvatar ? (
                          <img src={contactAvatar} alt={displayName} className="w-full h-full object-cover" />
                        ) : isGroup ? (
                          <Users className="w-6 h-6 text-[#03cafc]" />
                        ) : (
                          <UserIcon className="w-6 h-6 text-gray-300" />
                        )}
                      </div>
                      {otherUserOnline && !isGroup && (
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#03cafc] border-2 border-[#111b21] rounded-full shadow-sm" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1 min-w-0">
                          <span
                            className={`font-semibold text-sm truncate ${
                              isSelected ? 'text-[#03cafc]' : 'text-gray-200'
                            }`}
                          >
                            {displayName}
                          </span>
                          {(chat?.user?.isVerified || displayName === "Have-it Team") && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#03cafc] fill-[#03cafc]/20 shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                          {/* Favorite Pin Star Icon */}
                          <button
                            type="button"
                            onClick={(ev) => chatId && toggleFavorite(ev, chatId)}
                            className={`p-1 rounded-full hover:bg-gray-700/60 transition-opacity ${
                              isFavorite ? 'opacity-100 text-amber-400' : 'opacity-0 group-hover:opacity-100 text-gray-500 hover:text-amber-400'
                            }`}
                            title={isFavorite ? 'Unfavorite chat' : 'Favorite chat'}
                          >
                            <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
                          </button>

                          <span
                            suppressHydrationWarning
                            className="text-[11px] text-gray-400/80"
                          >
                            {formatChatTime(chat?.chat?.updatedAt)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-1">
                        {latestMessage ? (
                          <div className="flex items-center gap-1.5 truncate flex-1">
                            {isSentByMe ? (
                              <CornerUpLeft size={13} className="text-[#03cafc] flex-shrink-0" />
                            ) : (
                              <CornerDownRight size={13} className="text-[#70e1fd] flex-shrink-0" />
                            )}
                            <span className="text-xs text-gray-400 truncate">
                              {latestMessage.text}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 italic">No messages yet</span>
                        )}

                        {unseenCount > 0 && (
                          <div className="bg-[#03cafc] text-[#0b141a] text-[11px] font-extrabold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 flex-shrink-0 shadow-md shadow-[#03cafc]/20">
                            {unseenCount > 99 ? '99+' : unseenCount}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center text-center h-full py-12 px-4">
            <div className="p-4 bg-[#202c33] rounded-full mb-3 shadow-inner">
              <MessageCircle className="w-8 h-8 text-[#03cafc]" />
            </div>
            <p className="text-gray-200 font-semibold text-sm">
              {activeFilter === 'unread'
                ? 'No Unread Chats'
                : activeFilter === 'favorites'
                ? 'No Favourite Chats'
                : activeFilter === 'groups'
                ? 'No Groups Yet'
                : 'No Conversations Yet'}
            </p>
            <p className="text-xs text-gray-400 mt-1 max-w-[220px]">
              {activeFilter === 'favorites'
                ? 'Hover over any chat and click the star icon to pin it here.'
                : 'Start chatting by selecting a contact from your registered users list.'}
            </p>
            {activeFilter === 'all' && (
              <button
                onClick={() => setShowAllUsers(true)}
                className="mt-4 px-4 py-2 bg-[#03cafc] hover:bg-[#029ecc] text-[#0b141a] font-bold rounded-xl text-xs shadow-lg shadow-[#03cafc]/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Start a New Chat</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Sidebar Bottom Bar */}
      <div className="p-3 bg-[#202c33] border-t border-gray-800 space-y-1">
        <Link
          href="/profile"
          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-700/50 transition-colors text-gray-300 hover:text-white"
        >
          <UserIcon className="w-4 h-4 text-[#03cafc]" />
          <span className="text-sm font-medium">Profile & Settings</span>
        </Link>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-rose-400" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default ChatSidebar;
