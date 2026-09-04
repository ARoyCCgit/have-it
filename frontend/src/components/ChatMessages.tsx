"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Message, Reaction, ReplyTo } from '@/types/chat';
import { User, chat_service } from '@/context/Appcontext';
import {
  Check,
  CheckCheck,
  CornerUpLeft,
  MoreVertical,
  Pencil,
  Trash2,
  Ban,
  Copy,
  Smile,
} from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import AudioPlayer from './AudioPlayer';
import HaveItLogo from './HaveItLogo';
import { MessageStreamSkeleton } from './Skeleton';

interface ChatMessagesProps {
  selectedUser: string | null;
  messages: Message[] | null;
  loggedInUser: User | null;
  activeUser?: User | null;
  users?: User[] | null;
  onReply: (reply: ReplyTo) => void;
  onEdit: (message: Message) => void;
  onReactionUpdated: (messageId: string, reactions: Reaction[]) => void;
  onMessageDeleted: (messageId: string, deleteType: string) => void;
}

const formatTime = (isoString?: string) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const SENDER_COLORS = [
  'text-[#03cafc]',
  'text-sky-400',
  'text-cyan-300',
  'text-teal-400',
  'text-purple-400',
  'text-amber-400',
  'text-pink-400',
  'text-indigo-400',
  'text-rose-400',
];

const getSenderColor = (senderId: string) => {
  let hash = 0;
  for (let i = 0; i < senderId.length; i++) {
    hash = senderId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % SENDER_COLORS.length;
  return SENDER_COLORS[idx];
};

const ChatMessages: React.FC<ChatMessagesProps> = ({
  selectedUser,
  messages,
  loggedInUser,
  activeUser,
  users,
  onReply,
  onEdit,
  onReactionUpdated,
  onMessageDeleted,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [activeMenuMessageId, setActiveMenuMessageId] = useState<string | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);

  // Close menus on outside click without interfering with menu triggers
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.message-action-menu') && !target.closest('.message-action-trigger')) {
        setActiveMenuMessageId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Deduplicate messages by _id
  const uniqueMessages = useMemo(() => {
    if (!messages) return [];
    const seen = new Set();
    return messages.filter((message) => {
      if (seen.has(message._id)) {
        return false;
      }
      seen.add(message._id);
      return true;
    });
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedUser, uniqueMessages.length]);

  const scrollToMessage = (messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-[#03cafc]', 'ring-offset-2', 'ring-offset-[#0b141a]');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-[#03cafc]', 'ring-offset-2', 'ring-offset-[#0b141a]');
      }, 1500);
    }
  };

  const getSenderDisplayName = (senderId: string) => {
    if (senderId === loggedInUser?._id) return 'You';
    // If inside group, search group members first
    if (activeUser?.isGroup && activeUser.users) {
      const member = activeUser.users.find((u) => u._id === senderId);
      if (member) return member.name;
    }
    if (activeUser && activeUser._id === senderId) return activeUser.name;
    const foundUser = users?.find((u) => u._id === senderId);
    if (foundUser) return foundUser.name;
    return 'Contact';
  };

  const handleReact = async (messageId: string, emoji: string) => {
    const token = Cookies.get('token');
    try {
      const { data } = await axios.post(
        `${chat_service}/api/v1/chat/message/${messageId}/reaction`,
        { emoji },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (data && data.reactions) {
        onReactionUpdated(messageId, data.reactions);
      }
    } catch (error: unknown) {
      console.error('Error reacting to message:', error);
      toast.error('Failed to react');
    }
  };

  const handleDelete = async (messageId: string, deleteType: 'everyone' | 'me') => {
    const token = Cookies.get('token');
    try {
      await axios.delete(`${chat_service}/api/v1/chat/message/${messageId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        data: { deleteType },
      });
      onMessageDeleted(messageId, deleteType);
      toast.success(deleteType === 'everyone' ? 'Deleted for everyone' : 'Deleted for you');
    } catch (error: unknown) {
      console.error('Error deleting message:', error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Failed to delete message');
    }
  };

  return (
    <div className="flex-1 overflow-hidden overflow-x-hidden relative flex flex-col justify-end w-full max-w-full">
      <div className="h-full overflow-y-auto overflow-x-hidden p-3 sm:p-4 space-y-4 custom-scroll w-full max-w-full">
        {!selectedUser ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20 animate-in fade-in duration-300">
            <HaveItLogo size={80} glow={true} />
            <h3 className="text-xl font-bold text-white mt-5">
              Welcome to <span className="text-[#03cafc]">Have-it</span>
            </h3>
            <p className="text-xs text-gray-400 mt-2 max-w-sm leading-relaxed">
              Real-time, end-to-end encrypted messaging designed for web, mobile, and desktop. Select a conversation to begin.
            </p>
          </div>
        ) : messages === null ? (
          <MessageStreamSkeleton />
        ) : uniqueMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <p className="text-xs bg-[#111b21] border border-[#03cafc]/30 text-gray-300 px-4 py-2 rounded-full shadow-md">
              🔒 <span className="text-[#03cafc] font-semibold">Have-it Security:</span> Messages and calls are end-to-end encrypted.
            </p>
            <p className="text-gray-400 text-sm mt-4">No messages yet. Say hello! 👋</p>
          </div>
        ) : (
          <>
            {uniqueMessages.map((e) => {
              const isSendByMe = e.sender === loggedInUser?._id;
              const isDeleted = e.deletedForEveryone || e.isDeleted;
              const isHovered = hoveredMessageId === e._id;
              const isMenuOpen = activeMenuMessageId === e._id;
              const senderDisplayName = getSenderDisplayName(e.sender);

              return (
                <div
                  id={`msg-${e._id}`}
                  key={e._id}
                  onMouseEnter={() => setHoveredMessageId(e._id)}
                  onMouseLeave={() => setHoveredMessageId(null)}
                  className={`flex items-end gap-1.5 ${
                    isSendByMe ? 'justify-end' : 'justify-start'
                  } group relative transition-all w-full max-w-full`}
                >
                  {/* Floating Action Menu Button on Hover (Never overflows horizontal bounds) */}
                  {!isDeleted && (isHovered || isMenuOpen) && (
                    <div
                      className={`flex items-center bg-[#202c33] border border-gray-700/80 rounded-full px-1 py-0.5 shadow-lg animate-in fade-in zoom-in-90 duration-100 mb-1 flex-shrink-0 z-10 ${
                        isSendByMe ? 'order-first' : 'order-last'
                      }`}
                    >
                      {/* Reaction Trigger Button (Opens 6 emoji quick row) */}
                      <div className="relative group/react">
                        <button
                          type="button"
                          className="text-gray-400 hover:text-[#03cafc] p-1 hover:bg-gray-800 rounded-full transition-colors cursor-pointer"
                          title="React to message"
                        >
                          <Smile className="w-3.5 h-3.5" />
                        </button>

                        {/* Quick Reaction Popup */}
                        <div className="hidden group-hover/react:flex items-center gap-1 absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-[#1f2c34] border border-gray-700 rounded-full px-2 py-1 shadow-2xl z-50 animate-in zoom-in-95 duration-100">
                          {QUICK_REACTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleReact(e._id, emoji)}
                              className="text-base hover:scale-125 transition-transform p-0.5 cursor-pointer"
                              title={`React with ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Quote Reply Trigger Button */}
                      <button
                        type="button"
                        onClick={() =>
                          onReply({
                            messageId: e._id,
                            senderId: e.sender,
                            senderName: senderDisplayName,
                            text: e.text,
                            messageType: e.messageType,
                            imageUrl: e.image?.url,
                          })
                        }
                        className="text-gray-400 hover:text-[#03cafc] p-1 hover:bg-gray-800 rounded-full transition-colors ml-0.5 cursor-pointer"
                        title="Reply to message"
                      >
                        <CornerUpLeft className="w-3.5 h-3.5" />
                      </button>

                      {/* Dropdown Options Trigger Button */}
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.preventDefault();
                          ev.stopPropagation();
                          setActiveMenuMessageId((prev) => (prev === e._id ? null : e._id));
                        }}
                        className={`message-action-trigger p-1 rounded-full transition-colors cursor-pointer ${
                          isMenuOpen ? 'text-[#03cafc] bg-gray-800' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                        title="More options"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Context Dropdown Menu */}
                  {isMenuOpen && (
                    <div
                      onClick={(ev) => ev.stopPropagation()}
                      className={`message-action-menu absolute top-0 ${
                        isSendByMe ? 'right-0 sm:right-6' : 'left-0 sm:left-6'
                      } z-50 w-48 bg-[#202c33] border border-gray-700 rounded-xl shadow-2xl overflow-hidden py-1 text-xs select-none animate-in fade-in zoom-in-95 duration-100`}
                    >
                      {/* Reply Option */}
                      <button
                        type="button"
                        onClick={() => {
                          onReply({
                            messageId: e._id,
                            senderId: e.sender,
                            senderName: senderDisplayName,
                            text: e.text,
                            messageType: e.messageType,
                            imageUrl: e.image?.url,
                          });
                          setActiveMenuMessageId(null);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-200 hover:bg-[#111b21] transition-colors text-left cursor-pointer"
                      >
                        <CornerUpLeft className="w-4 h-4 text-[#03cafc]" />
                        <span>Reply</span>
                      </button>

                      {/* Copy Text Option */}
                      {e.text && !isDeleted && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(e.text || '');
                            toast.success('Copied to clipboard');
                            setActiveMenuMessageId(null);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-200 hover:bg-[#111b21] transition-colors text-left cursor-pointer"
                        >
                          <Copy className="w-4 h-4 text-[#03cafc]" />
                          <span>Copy message</span>
                        </button>
                      )}

                      {/* Edit Option (Own text messages only) */}
                      {isSendByMe && e.messageType === 'text' && !isDeleted && (
                        <button
                          type="button"
                          onClick={() => {
                            onEdit(e);
                            setActiveMenuMessageId(null);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-200 hover:bg-[#111b21] transition-colors text-left cursor-pointer"
                        >
                          <Pencil className="w-4 h-4 text-amber-400" />
                          <span>Edit</span>
                        </button>
                      )}

                      {/* Delete for everyone Option (Own messages only) */}
                      {isSendByMe && !isDeleted && (
                        <button
                          type="button"
                          onClick={() => {
                            handleDelete(e._id, 'everyone');
                            setActiveMenuMessageId(null);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-400 hover:bg-[#111b21] transition-colors text-left cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 text-rose-400" />
                          <span>Delete for everyone</span>
                        </button>
                      )}

                      {/* Delete for me Option */}
                      <button
                        type="button"
                        onClick={() => {
                          handleDelete(e._id, 'me');
                          setActiveMenuMessageId(null);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-300 hover:bg-[#111b21] transition-colors text-left cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 text-gray-400" />
                        <span>Delete for me</span>
                      </button>
                    </div>
                  )}

                  {/* Message Bubble Container */}
                  <div
                    className={`rounded-2xl p-2.5 max-w-[88%] sm:max-w-md shadow-md transition-all relative ${
                      isDeleted
                        ? 'bg-[#182229] border border-gray-800 text-gray-400 italic'
                        : isSendByMe
                        ? 'bg-[#0c3647] text-white rounded-br-none border border-[#03cafc]/35 shadow-[0_2px_12px_rgba(3,202,252,0.12)]'
                        : 'bg-[#202c33] text-gray-100 rounded-bl-none border border-gray-700/60'
                    }`}
                  >
                    {/* Group Sender Display Name */}
                    {!isSendByMe && activeUser?.isGroup && !isDeleted && (
                      <span
                        className={`text-[11px] font-bold block mb-0.5 px-1 truncate ${getSenderColor(
                          e.sender
                        )}`}
                      >
                        {senderDisplayName}
                      </span>
                    )}

                    {/* Render Deleted State */}
                    {isDeleted ? (
                      <div className="flex items-center gap-2 py-1 px-1">
                        <Ban className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">This message was deleted</span>
                      </div>
                    ) : (
                      <>
                        {/* Quoted / Reply Preview Banner */}
                        {e.replyTo && (
                          <div
                            onClick={() => scrollToMessage(e.replyTo!.messageId)}
                            className="mb-1.5 p-2 rounded-lg bg-black/25 border-l-4 border-[#03cafc] text-xs cursor-pointer hover:bg-black/35 transition-colors"
                          >
                            <span className="font-semibold text-[#70e1fd] block truncate">
                              {e.replyTo.senderId === loggedInUser?._id
                                ? 'You'
                                : e.replyTo.senderName && e.replyTo.senderName !== 'Participant'
                                ? e.replyTo.senderName
                                : getSenderDisplayName(e.replyTo.senderId)}
                            </span>
                            <p className="text-gray-300 truncate mt-0.5">
                              {e.replyTo.messageType === 'image'
                                ? '📷 Photo'
                                : e.replyTo.messageType === 'audio'
                                ? '🎤 Voice message'
                                : e.replyTo.text || 'Message'}
                            </p>
                          </div>
                        )}

                        {/* Render Image Attachment */}
                        {e.messageType === 'image' && e.image && (
                          <div className="relative group mb-1.5 overflow-hidden rounded-xl bg-black/20">
                            <img
                              src={e.image.url}
                              alt="Shared attachment"
                              className="max-w-full max-h-72 w-auto object-cover rounded-xl hover:scale-[1.01] transition-transform cursor-pointer"
                              onClick={() => window.open(e.image?.url, '_blank')}
                            />
                          </div>
                        )}

                        {/* Render Audio Note Player */}
                        {e.messageType === 'audio' && e.audio && (
                          <AudioPlayer
                            src={e.audio.url}
                            duration={e.audio.duration}
                            isSentByMe={isSendByMe}
                          />
                        )}

                        {/* Render Text Content */}
                        {e.text && (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words px-1">
                            {e.text}
                          </p>
                        )}
                      </>
                    )}

                    {/* Footer: Timestamp, Edited Tag & Status Ticks */}
                    <div className="flex items-center justify-end gap-1 mt-1 select-none text-[10px] text-gray-300/80 px-1">
                      {e.isEdited && !isDeleted && (
                        <span className="text-[10px] text-amber-300/90 italic mr-0.5">
                          edited
                        </span>
                      )}
                      <span suppressHydrationWarning>{formatTime(e.createdAt)}</span>
                      {isSendByMe && !isDeleted && (
                        <span>
                          {e.seen ? (
                            <CheckCheck className="w-3.5 h-3.5 text-[#03cafc] inline" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-gray-300 inline" />
                          )}
                        </span>
                      )}
                    </div>

                    {/* Reaction Badges Pill */}
                    {!isDeleted && e.reactions && e.reactions.length > 0 && (
                      <div className="absolute -bottom-3 right-2 flex items-center gap-0.5 bg-[#1f2c34] border border-gray-700/80 rounded-full px-1.5 py-0.5 shadow-md text-xs cursor-pointer hover:scale-105 transition-transform">
                        {Array.from(new Set(e.reactions.map((r) => r.emoji))).map((emoji) => (
                          <span key={emoji}>{emoji}</span>
                        ))}
                        {e.reactions.length > 1 && (
                          <span className="text-[10px] text-gray-300 font-bold ml-0.5">
                            {e.reactions.length}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </>
        )}
      </div>
    </div>
  );
};

export default ChatMessages;
