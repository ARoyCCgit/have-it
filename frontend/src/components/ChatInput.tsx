"use client"

import React, { useState, useRef, ChangeEvent, KeyboardEvent, useEffect } from 'react';
import {
  Send,
  Paperclip,
  X,
  Loader2,
  Smile,
  Mic,
  Trash2,
  Check,
  CornerUpLeft,
  Pencil,
} from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import { chat_service } from '@/context/Appcontext';
import { useSocket } from '@/context/SocketContext';
import { Message, ReplyTo } from '@/types/chat';
import EmojiPicker from './EmojiPicker';

import { User } from '@/context/Appcontext';

interface ChatInputProps {
  chatId: string | null;
  activeUser?: User | null;
  groupMembers?: User[];
  onMessageSent: (newMessage: Message) => void;
  replyingTo: ReplyTo | null;
  onCancelReply: () => void;
  editingMessage: Message | null;
  onCancelEdit: () => void;
  onMessageEdited: (updatedMessage: Message) => void;
}

const formatRecordingTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const ChatInput: React.FC<ChatInputProps> = ({
  chatId,
  activeUser,
  groupMembers,
  onMessageSent,
  replyingTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  onMessageEdited,
}) => {
  const [text, setText] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Mention State
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [showMentionPopover, setShowMentionPopover] = useState(false);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const { emitTyping, emitStopTyping } = useSocket();

  // Populate text when editing
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text || '');
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [editingMessage]);

  // Click outside to close emoji picker
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, JPEG, GIF, WEBP)');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error('Image size must be less than 15MB');
      return;
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
    if (chatId) {
      emitTyping(chatId);
    }
  };

  // Start Voice Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
        setRecordingTime(elapsed);
      }, 500);
    } catch (err) {
      console.error('Microphone access error:', err);
      toast.error('Could not access microphone');
    }
  };

  // Cancel Voice Recording
  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    setIsRecording(false);
    setRecordingTime(0);
    audioChunksRef.current = [];
  };

  // Send Recorded Audio
  const sendRecordedAudio = async () => {
    if (!mediaRecorderRef.current || !chatId) return;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    const calculatedDuration = Math.max(
      1,
      Math.round((Date.now() - (recordingStartTimeRef.current || Date.now())) / 1000)
    );

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      if (audioBlob.size === 0) return;

      const audioFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, {
        type: 'audio/webm',
      });

      setSending(true);
      const token = Cookies.get('token');

      try {
        const formData = new FormData();
        formData.append('chatId', chatId);
        formData.append('file', audioFile);
        formData.append('duration', calculatedDuration.toString());
        if (replyingTo) {
          formData.append('replyTo', JSON.stringify(replyingTo));
        }

        const { data } = await axios.post(`${chat_service}/api/v1/chat/message`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });

        if (data && data.message) {
          onMessageSent(data.message);
        }
        if (replyingTo) {
          onCancelReply();
        }
      } catch (error: unknown) {
        console.error('Error sending audio note:', error);
        toast.error('Failed to send voice message');
      } finally {
        setSending(false);
        setIsRecording(false);
        setRecordingTime(0);
        audioChunksRef.current = [];
      }
    };

    mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    mediaRecorderRef.current.stop();
  };

  // Handle Send Message or Edit Message
  const handleSendMessage = async () => {
    if (!chatId) {
      toast.error('No chat selected');
      return;
    }

    const trimmedText = text.trim();
    if (!trimmedText && !selectedImage) {
      return;
    }

    // Handle Edit Mode
    if (editingMessage) {
      setSending(true);
      const token = Cookies.get('token');
      try {
        const { data } = await axios.put(
          `${chat_service}/api/v1/chat/message/${editingMessage._id}`,
          { text: trimmedText },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (data && data.updatedMessage) {
          onMessageEdited(data.updatedMessage);
        }
        setText('');
        onCancelEdit();
        toast.success('Message updated');
      } catch (error: unknown) {
        console.error('Error editing message:', error);
        const err = error as { response?: { data?: { message?: string } } };
        toast.error(err?.response?.data?.message || 'Failed to edit message');
      } finally {
        setSending(false);
      }
      return;
    }

    // Normal Send
    setSending(true);
    emitStopTyping(chatId);
    const token = Cookies.get('token');

    try {
      const formData = new FormData();
      formData.append('chatId', chatId);
      if (trimmedText) {
        formData.append('text', trimmedText);
      }
      if (selectedImage) {
        formData.append('file', selectedImage);
      }
      if (replyingTo) {
        formData.append('replyTo', JSON.stringify(replyingTo));
      }

      const { data } = await axios.post(`${chat_service}/api/v1/chat/message`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (data && data.message) {
        onMessageSent(data.message);
      }

      // Reset state
      setText('');
      removeSelectedImage();
      setShowEmojiPicker(false);
      if (replyingTo) {
        onCancelReply();
      }
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error: unknown) {
      console.error('Error sending message:', error);
      const err = error as { response?: { data?: { message?: string } } };
      const errMsg = err?.response?.data?.message || 'Failed to send message';
      toast.error(errMsg);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSelectMention = (memberName: string) => {
    // Replace the trailing @query with @Name
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const newText = text.substring(0, lastAtIndex) + `@${memberName} `;
      setText(newText);
    }
    setShowMentionPopover(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    // Detect @mention trigger
    if (activeUser?.isGroup) {
      const lastAtIndex = val.lastIndexOf('@');
      if (lastAtIndex !== -1 && (lastAtIndex === 0 || val[lastAtIndex - 1] === ' ' || val[lastAtIndex - 1] === '\n')) {
        const queryAfterAt = val.substring(lastAtIndex + 1);
        if (!queryAfterAt.includes(' ')) {
          setMentionQuery(queryAfterAt.toLowerCase());
          setShowMentionPopover(true);
        } else {
          setShowMentionPopover(false);
        }
      } else {
        setShowMentionPopover(false);
      }
    }

    if (chatId) {
      if (val.trim().length > 0) {
        emitTyping(chatId);
      } else {
        emitStopTyping(chatId);
      }
    }

    // Auto-expand textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const matchingMembers = React.useMemo(() => {
    if (!showMentionPopover || !groupMembers) return [];
    if (!mentionQuery) return groupMembers;
    return groupMembers.filter((m) =>
      (m.name || '').toLowerCase().includes(mentionQuery)
    );
  }, [showMentionPopover, groupMembers, mentionQuery]);

  if (!chatId) return null;

  return (
    <div className="relative border-t border-gray-800 bg-[#202c33] p-2.5 select-none flex-shrink-0">
      {/* @Mention Autocomplete Popover */}
      {showMentionPopover && matchingMembers.length > 0 && (
        <div className="absolute bottom-16 left-12 z-50 w-64 bg-[#111b21] border border-[#03cafc]/30 rounded-xl shadow-2xl overflow-hidden py-1 animate-in zoom-in-95 duration-100">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#03cafc] border-b border-gray-800">
            Mention Member
          </div>
          <div className="max-h-40 overflow-y-auto custom-scroll p-1 space-y-0.5">
            {matchingMembers.map((m) => (
              <button
                key={`mention-${m._id}`}
                type="button"
                onClick={() => handleSelectMention(m.name)}
                className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-[#202c33] text-left transition-colors cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[11px] font-bold text-white">
                  {m.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-semibold text-white block truncate">{m.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div ref={emojiPickerRef} className="absolute bottom-16 left-3 z-50">
          <EmojiPicker
            onSelectEmoji={handleSelectEmoji}
            onClose={() => setShowEmojiPicker(false)}
          />
        </div>
      )}

      {/* Replying Banner Preview */}
      {replyingTo && (
        <div className="mb-2 p-2.5 bg-[#111b21] rounded-xl border-l-4 border-[#03cafc] flex items-center justify-between shadow-md animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <CornerUpLeft className="w-4 h-4 text-[#03cafc] flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold text-[#03cafc] block truncate">
                Replying to {replyingTo.senderName}
              </span>
              <p className="text-xs text-gray-300 truncate">
                {replyingTo.messageType === 'image'
                  ? '📷 Photo'
                  : replyingTo.messageType === 'audio'
                  ? '🎤 Voice Message'
                  : replyingTo.text || 'Message'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors cursor-pointer"
            title="Cancel Reply"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Editing Message Banner */}
      {editingMessage && (
        <div className="mb-2 p-2.5 bg-[#111b21] rounded-xl border-l-4 border-amber-500 flex items-center justify-between shadow-md animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5 min-w-0">
            <Pencil className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="text-xs font-semibold text-amber-400">Editing Message</span>
          </div>
          <button
            type="button"
            onClick={onCancelEdit}
            className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors cursor-pointer"
            title="Cancel Editing"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Image Preview Overlay before sending */}
      {imagePreview && (
        <div className="mb-3 p-3 bg-[#111b21] rounded-xl border border-gray-700 flex items-center gap-4 relative animate-in fade-in zoom-in-95 duration-150 shadow-md">
          <div className="relative group w-20 h-20 rounded-lg overflow-hidden bg-black/40 border border-gray-700 flex-shrink-0">
            <img src={imagePreview} alt="Upload preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={removeSelectedImage}
              className="absolute top-1 right-1 bg-red-600/90 hover:bg-red-700 text-white rounded-full p-1 shadow-md transition-colors cursor-pointer"
              title="Remove image"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-200 truncate">{selectedImage?.name}</p>
            <p className="text-xs text-gray-400">
              {((selectedImage?.size || 0) / (1024 * 1024)).toFixed(2)} MB • Ready to send
            </p>
          </div>
        </div>
      )}

      {/* Voice Recording View */}
      {isRecording ? (
        <div className="flex items-center justify-between gap-3 px-2 py-1 animate-in fade-in duration-200 bg-[#111b21] rounded-2xl border border-gray-700/60">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
            <span className="text-sm font-medium text-red-400 font-mono">
              {formatRecordingTime(recordingTime)}
            </span>
            <span className="text-xs text-gray-400 hidden sm:inline">Recording voice note...</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancelRecording}
              className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-full transition-colors cursor-pointer"
              title="Cancel recording"
            >
              <Trash2 className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={sendRecordedAudio}
              disabled={sending}
              className="p-2.5 bg-[#03cafc] hover:bg-[#029ecc] text-[#0b141a] rounded-full transition-all shadow-md shadow-[#03cafc]/20 active:scale-95 flex items-center justify-center cursor-pointer font-bold"
              title="Send voice note"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Normal Message Input Bar */
        <div className="flex items-end gap-1.5 sm:gap-2">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
            className="hidden"
          />

          {/* Emoji Picker Button */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className={`p-2.5 rounded-full transition-colors flex-shrink-0 cursor-pointer ${
              showEmojiPicker
                ? 'text-[#03cafc] bg-gray-700/60'
                : 'text-gray-400 hover:text-[#03cafc] hover:bg-gray-700/60'
            }`}
            title="Emoji picker"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Attachment button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || !!editingMessage}
            className="p-2.5 text-gray-400 hover:text-[#03cafc] hover:bg-gray-700/60 rounded-full transition-colors flex-shrink-0 disabled:opacity-40 cursor-pointer"
            title="Attach Image"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Text Area input */}
          <div className="flex-1 min-w-0 relative bg-[#2a3942] border border-transparent focus-within:border-[#03cafc]/80 rounded-2xl transition-colors">
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder={
                editingMessage
                  ? 'Edit your message...'
                  : imagePreview
                  ? 'Add a caption...'
                  : 'Type a message...'
              }
              disabled={sending}
              className="w-full px-4 py-2.5 bg-transparent text-white placeholder-gray-400 text-sm focus:outline-none resize-none max-h-28 overflow-y-auto custom-scroll"
            />
          </div>

          {/* Send or Voice Note Record Button */}
          {text.trim() || selectedImage || editingMessage ? (
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={sending}
              className="p-2.5 rounded-full bg-[#03cafc] hover:bg-[#029ecc] text-[#0b141a] shadow-lg shadow-[#03cafc]/25 cursor-pointer active:scale-95 transition-all flex-shrink-0 font-bold"
              title={editingMessage ? 'Update message' : 'Send message'}
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin text-[#0b141a]" />
              ) : editingMessage ? (
                <Check className="w-5 h-5 stroke-[2.5]" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              className="p-2.5 rounded-full bg-[#2a3942] hover:bg-[#03cafc] hover:text-[#0b141a] text-gray-300 transition-all flex-shrink-0 cursor-pointer active:scale-95 shadow-md"
              title="Record voice note"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatInput;
