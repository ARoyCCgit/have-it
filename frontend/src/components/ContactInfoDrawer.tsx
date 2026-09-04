"use client"

import React, { useState } from 'react';
import { Message } from '@/types/chat';
import { User } from '@/context/Appcontext';
import {
  X,
  User as UserIcon,
  Image as ImageIcon,
  Mic,
  Link as LinkIcon,
  Bell,
  BellOff,
  Shield,
  Ban,
  Clock,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import AudioPlayer from './AudioPlayer';
import HaveItLogo from './HaveItLogo';

interface ContactInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  messages: Message[] | null;
  loggedInUserId?: string;
}

export const ContactInfoDrawer: React.FC<ContactInfoDrawerProps> = ({
  isOpen,
  onClose,
  user,
  messages,
  loggedInUserId,
}) => {
  const [activeTab, setActiveTab] = useState<'media' | 'audio' | 'links'>('media');
  const [isMuted, setIsMuted] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  // Extract shared media
  const sharedMedia = (messages || []).filter(
    (m) => !m.isDeleted && !m.deletedForEveryone && m.messageType === 'image' && m.image?.url
  );

  // Extract shared audio
  const sharedAudio = (messages || []).filter(
    (m) => !m.isDeleted && !m.deletedForEveryone && m.messageType === 'audio' && m.audio?.url
  );

  // Extract shared links
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const sharedLinks: { url: string; text?: string; time: string }[] = [];
  (messages || []).forEach((m) => {
    if (!m.isDeleted && !m.deletedForEveryone && m.text) {
      const matches = m.text.match(urlRegex);
      if (matches) {
        matches.forEach((url) => {
          sharedLinks.push({
            url,
            text: m.text,
            time: m.createdAt,
          });
        });
      }
    }
  });

  const avatarUrl =
    typeof user.avatar === 'string'
      ? user.avatar
      : user.avatar?.url || '';

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      toast.success(next ? 'Notifications muted' : 'Notifications unmuted');
      return next;
    });
  };

  const toggleBlock = () => {
    setIsBlocked((prev) => {
      const next = !prev;
      toast.success(next ? `Blocked ${user.name}` : `Unblocked ${user.name}`);
      return next;
    });
  };

  return (
    <>
      {/* Full-size Image Preview Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-150 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl">
            <img src={previewImage} alt="Preview" className="w-full h-full object-contain" />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* Slide-over Drawer Panel */}
      <div
        className={`
          w-80 sm:w-96 bg-[#111b21] border-l border-gray-800
          h-full flex flex-col z-30 select-none shadow-2xl flex-shrink-0
          animate-in slide-in-from-right duration-200
        `}
      >
        {/* Drawer Header */}
        <div className="bg-[#202c33] border-b border-gray-800 px-4 py-3.5 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-gray-700/60 rounded-full text-gray-300 hover:text-white transition-colors cursor-pointer"
            title="Close Info"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-base font-semibold text-white">Contact Info</h2>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="flex-1 overflow-y-auto custom-scroll space-y-3 pb-8">
          
          {/* User Profile Card */}
          <div className="bg-[#202c33] p-6 flex flex-col items-center justify-center text-center shadow-sm">
            <div
              onClick={() => avatarUrl && setPreviewImage(avatarUrl)}
              className={`w-28 h-28 rounded-full overflow-hidden border-4 border-[#03cafc]/40 bg-[#111b21] flex items-center justify-center shadow-lg shadow-[#03cafc]/10 ${
                avatarUrl ? 'cursor-pointer hover:opacity-90' : ''
              }`}
            >
              {user.name === "Have-it Team" || avatarUrl === "/icon.svg" ? (
                <div className="w-full h-full flex items-center justify-center p-2 bg-[#0b141a]">
                  <HaveItLogo size={72} glow={true} />
                </div>
              ) : avatarUrl ? (
                <img src={avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-14 h-14 text-gray-400" />
              )}
            </div>

            <div className="flex items-center justify-center gap-1.5 mt-3 max-w-full">
              <h3 className="text-lg font-bold text-white truncate">
                {user.name}
              </h3>
              {(user.isVerified || user.name === "Have-it Team") && (
                <CheckCircle2 className="w-4 h-4 text-[#03cafc] fill-[#03cafc]/20 shrink-0" />
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-full">{user.email}</p>
          </div>

          {/* About Bio Section */}
          <div className="bg-[#202c33] p-4 shadow-sm">
            <span className="text-[11px] font-semibold text-[#03cafc] uppercase tracking-wider block mb-1">
              About
            </span>
            <p className="text-sm text-gray-200 leading-relaxed">
              {user.about || 'Hey there! I am using Have-it.'}
            </p>
          </div>

          {/* Media, Audio & Links Tab Container */}
          <div className="bg-[#202c33] p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#03cafc] uppercase tracking-wider">
                Media, Links and Docs
              </span>
              <span className="text-xs text-gray-400">
                {sharedMedia.length + sharedAudio.length + sharedLinks.length} items
              </span>
            </div>

            {/* Tab Selector */}
            <div className="flex bg-[#111b21] p-1 rounded-xl gap-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('media')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'media'
                    ? 'bg-[#03cafc]/20 text-[#03cafc] font-semibold border border-[#03cafc]/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Media ({sharedMedia.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('audio')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'audio'
                    ? 'bg-[#03cafc]/20 text-[#03cafc] font-semibold border border-[#03cafc]/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Audio ({sharedAudio.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('links')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'links'
                    ? 'bg-[#03cafc]/20 text-[#03cafc] font-semibold border border-[#03cafc]/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Links ({sharedLinks.length})</span>
              </button>
            </div>

            {/* Tab Content Display */}
            <div className="min-h-[120px]">
              {/* Media Tab */}
              {activeTab === 'media' && (
                sharedMedia.length > 0 ? (
                  <div className="grid grid-cols-3 gap-1.5 max-h-56 overflow-y-auto custom-scroll p-1">
                    {sharedMedia.map((m) => (
                      <div
                        key={m._id}
                        onClick={() => m.image?.url && setPreviewImage(m.image.url)}
                        className="relative aspect-square rounded-lg overflow-hidden bg-black/40 border border-gray-700/60 group cursor-pointer"
                      >
                        <img
                          src={m.image?.url}
                          alt="Shared media"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-gray-400">
                    No photos shared in this chat yet.
                  </div>
                )
              )}

              {/* Audio Tab */}
              {activeTab === 'audio' && (
                sharedAudio.length > 0 ? (
                  <div className="space-y-2 max-h-56 overflow-y-auto custom-scroll p-1">
                    {sharedAudio.map((m) => (
                      <div
                        key={m._id}
                        className="bg-[#111b21] p-2 rounded-xl border border-gray-700/50"
                      >
                        <AudioPlayer
                          src={m.audio!.url}
                          duration={m.audio?.duration}
                          isSentByMe={m.sender === loggedInUserId}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-gray-400">
                    No voice notes exchanged yet.
                  </div>
                )
              )}

              {/* Links Tab */}
              {activeTab === 'links' && (
                sharedLinks.length > 0 ? (
                  <div className="space-y-2 max-h-56 overflow-y-auto custom-scroll p-1">
                    {sharedLinks.map((item, idx) => (
                      <a
                        key={`link-${idx}`}
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block p-2.5 bg-[#111b21] hover:bg-[#182229] border border-gray-700/50 rounded-xl text-xs transition-colors group"
                      >
                        <div className="flex items-center justify-between text-[#03cafc] font-medium">
                          <span className="truncate flex-1">{item.url}</span>
                          <ExternalLink className="w-3.5 h-3.5 ml-1.5 flex-shrink-0 opacity-70 group-hover:opacity-100" />
                        </div>
                        {item.text && (
                          <p className="text-[11px] text-gray-400 truncate mt-1">{item.text}</p>
                        )}
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-gray-400">
                    No links shared in this conversation.
                  </div>
                )
              )}
            </div>
          </div>

          {/* Privacy & Settings */}
          <div className="bg-[#202c33] shadow-sm divide-y divide-gray-800 text-xs">
            {/* Mute Notifications */}
            <button
              type="button"
              onClick={toggleMute}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-700/30 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                {isMuted ? (
                  <BellOff className="w-4 h-4 text-amber-400" />
                ) : (
                  <Bell className="w-4 h-4 text-[#03cafc]" />
                )}
                <div>
                  <span className="text-sm font-medium text-white block">Mute notifications</span>
                  <span className="text-[11px] text-gray-400 block">
                    {isMuted ? 'Muted' : 'Unmuted'}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>

            {/* Disappearing Messages */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-[#03cafc]" />
                <div>
                  <span className="text-sm font-medium text-white block">Disappearing messages</span>
                  <span className="text-[11px] text-gray-400 block">Off</span>
                </div>
              </div>
            </div>

            {/* Encryption notice */}
            <div className="p-4 flex items-center gap-3 text-gray-300">
              <Shield className="w-4 h-4 text-[#03cafc] flex-shrink-0" />
              <div>
                <span className="text-xs font-semibold text-white block">Encryption</span>
                <span className="text-[11px] text-gray-400 block leading-relaxed">
                  Messages and calls are end-to-end encrypted. Tap to verify.
                </span>
              </div>
            </div>

            {/* Block Contact Action */}
            <button
              type="button"
              onClick={toggleBlock}
              className="w-full p-4 flex items-center gap-3 hover:bg-rose-950/30 text-rose-400 transition-colors text-left cursor-pointer"
            >
              <Ban className="w-4 h-4" />
              <span className="text-sm font-medium">
                {isBlocked ? `Unblock ${user.name}` : `Block ${user.name}`}
              </span>
            </button>
          </div>

        </div>
      </div>
    </>
  );
};

export default ContactInfoDrawer;
