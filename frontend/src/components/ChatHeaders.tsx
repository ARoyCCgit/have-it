"use client"

import { User, useAppData } from '@/context/Appcontext';
import { useSocket } from '@/context/SocketContext';
import {
  ChevronLeft,
  Menu,
  MoreVertical,
  Phone,
  Search,
  User as UserIcon,
  Video,
  Volume2,
  VolumeX,
  Info,
  Users,
  CheckCircle2,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import HaveItLogo from './HaveItLogo';

import { useCall } from '@/context/CallContext';

interface ChatHeaderProps {
  user: User | null;
  setSidebarOpen: (open: boolean) => void;
  onBack?: () => void;
  isTyping: boolean;
  onOpenContactInfo: () => void;
  onToggleSearch: () => void;
  isSearchOpen: boolean;
}

const ChatHeaders = ({
  user,
  setSidebarOpen,
  onBack,
  isTyping,
  onOpenContactInfo,
  onToggleSearch,
  isSearchOpen,
}: ChatHeaderProps) => {
  const { isOnline } = useSocket();
  const { soundEnabled, setSoundEnabled } = useAppData();
  const { startCall, callStatus } = useCall();
  const [showMenu, setShowMenu] = useState(false);

  const online = isOnline(user?._id);
  const avatarUrl =
    typeof user?.avatar === 'string'
      ? user.avatar
      : user?.avatar?.url || '';

  // Close menu on click outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.header-menu') && !target.closest('.header-menu-trigger')) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleStartCall = (isVideo: boolean) => {
    if (!user) return;
    if (user.isGroup) {
      alert('Group calling will be available in an upcoming update.');
      return;
    }
    startCall(user, isVideo);
  };

  return (
    <div className="bg-[#202c33] border-b border-gray-800 px-2 sm:px-4 py-2.5 flex items-center justify-between z-20 select-none shadow-sm flex-shrink-0 relative">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        {/* Mobile Back Button (returns to chat list) */}
        {user && onBack && (
          <button
            className="md:hidden p-1.5 -ml-1 text-[#03cafc] hover:bg-gray-700/60 rounded-xl transition-colors cursor-pointer flex-shrink-0"
            onClick={onBack}
            title="Back to all chats"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Fallback menu toggle when no active user */}
        {!user && (
          <button
            className="md:hidden p-1.5 hover:bg-gray-700/60 rounded-lg text-gray-300 transition-colors cursor-pointer"
            onClick={() => setSidebarOpen(true)}
            title="Open Chats"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {user ? (
          /* Clickable Contact / Group Profile header */
          <div
            onClick={onOpenContactInfo}
            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer hover:opacity-90 transition-opacity"
            title={user.isGroup ? "Click to view group info" : "Click to view contact info"}
          >
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-[#111b21] border border-gray-600 flex items-center justify-center overflow-hidden">
                {user.name === "Have-it Team" || avatarUrl === "/icon.svg" ? (
                  <div className="w-full h-full flex items-center justify-center p-1 bg-[#0b141a]">
                    <HaveItLogo size={28} glow={false} />
                  </div>
                ) : avatarUrl ? (
                  <img src={avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : user.isGroup ? (
                  <Users className="w-5 h-5 text-[#03cafc]" />
                ) : (
                  <UserIcon className="w-6 h-6 text-gray-300" />
                )}
              </div>
              {online && !user.isGroup && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#03cafc] border-2 border-[#202c33] rounded-full shadow-sm" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <h2 className="text-sm sm:text-base font-semibold text-white truncate leading-tight">
                  {user.groupName || user.name}
                </h2>
                {(user.isVerified || user.name === "Have-it Team") && (
                  <CheckCircle2 className="w-4 h-4 text-[#03cafc] fill-[#03cafc]/20 shrink-0" />
                )}
              </div>
              <div className="text-xs truncate mt-0.5">
                {isTyping ? (
                  <span className="text-[#03cafc] font-medium animate-pulse">typing...</span>
                ) : user.isGroup ? (
                  <span className="text-gray-400">
                    {user.users && user.users.length > 0
                      ? user.users.map((u) => u.name).join(', ')
                      : 'Group Chat'}
                  </span>
                ) : online ? (
                  <span className="text-[#03cafc] font-medium">online</span>
                ) : (
                  <span className="text-gray-400">
                    {user.about ? `${user.about}` : 'offline'}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <HaveItLogo size={36} glow={false} />
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Have<span className="text-[#03cafc]">-it</span> Web</h2>
              <p className="text-xs text-gray-400">Select a chat to begin</p>
            </div>
          </div>
        )}
      </div>

      {user && (
        <div className="flex items-center gap-0.5 sm:gap-1 text-gray-400">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              soundEnabled ? 'hover:text-[#03cafc] hover:bg-gray-700/60' : 'text-amber-400/80 hover:bg-gray-700/60'
            }`}
            title={soundEnabled ? 'Mute notification sounds' : 'Unmute notification sounds'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* In-Chat Message Search Button */}
          <button
            type="button"
            onClick={onToggleSearch}
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              isSearchOpen
                ? 'text-[#03cafc] bg-gray-700/60'
                : 'hover:text-white hover:bg-gray-700/60'
            }`}
            title="Search in conversation"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Video Call Button */}
          {!user.isGroup && (
            <button
              type="button"
              onClick={() => handleStartCall(true)}
              disabled={callStatus !== 'idle'}
              className="p-2 hover:bg-gray-700/60 rounded-full text-gray-400 hover:text-[#03cafc] disabled:opacity-40 transition-colors cursor-pointer"
              title="Start Video Call"
            >
              <Video className="w-4 h-4" />
            </button>
          )}

          {/* Voice Call Button */}
          {!user.isGroup && (
            <button
              type="button"
              onClick={() => handleStartCall(false)}
              disabled={callStatus !== 'idle'}
              className="p-2 hover:bg-gray-700/60 rounded-full text-gray-400 hover:text-[#03cafc] disabled:opacity-40 transition-colors cursor-pointer"
              title="Start Voice Call"
            >
              <Phone className="w-4 h-4" />
            </button>
          )}

          {/* Menu Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu((prev) => !prev)}
              className="header-menu-trigger p-2 hover:bg-gray-700/60 rounded-full hover:text-white transition-colors cursor-pointer"
              title="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="header-menu absolute right-0 top-full mt-1 w-48 bg-[#202c33] border border-gray-700 rounded-xl shadow-2xl overflow-hidden py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    onOpenContactInfo();
                    setShowMenu(false);
                  }}
                  className="w-full px-3.5 py-2.5 flex items-center gap-2.5 text-gray-200 hover:bg-[#111b21] transition-colors text-left cursor-pointer"
                >
                  <Info className="w-4 h-4 text-[#03cafc]" />
                  <span>Contact info</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onToggleSearch();
                    setShowMenu(false);
                  }}
                  className="w-full px-3.5 py-2.5 flex items-center gap-2.5 text-gray-200 hover:bg-[#111b21] transition-colors text-left cursor-pointer"
                >
                  <Search className="w-4 h-4 text-[#03cafc]" />
                  <span>Search messages</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSoundEnabled((prev) => !prev);
                    setShowMenu(false);
                  }}
                  className="w-full px-3.5 py-2.5 flex items-center gap-2.5 text-gray-200 hover:bg-[#111b21] transition-colors text-left cursor-pointer"
                >
                  {soundEnabled ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4 text-[#03cafc]" />}
                  <span>{soundEnabled ? 'Mute sounds' : 'Unmute sounds'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatHeaders;

