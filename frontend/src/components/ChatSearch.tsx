"use client"

import React, { useState, useEffect } from 'react';
import { Message } from '@/types/chat';
import { ChevronUp, ChevronDown, X, Search } from 'lucide-react';

interface ChatSearchProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[] | null;
  onScrollToMessage: (messageId: string) => void;
}

const ChatSearch: React.FC<ChatSearchProps> = ({
  isOpen,
  onClose,
  messages,
  onScrollToMessage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  // Find all matching message IDs
  const matchingMessages = React.useMemo(() => {
    if (!searchQuery.trim() || !messages) return [];
    const query = searchQuery.trim().toLowerCase();
    return messages.filter((m) => {
      if (m.isDeleted || m.deletedForEveryone) return false;
      return m.text && m.text.toLowerCase().includes(query);
    });
  }, [searchQuery, messages]);

  // Reset or adjust index when matches change
  useEffect(() => {
    if (matchingMessages.length > 0) {
      setCurrentIndex(0);
      onScrollToMessage(matchingMessages[0]._id);
    } else {
      setCurrentIndex(0);
    }
  }, [matchingMessages]);

  const handleNext = () => {
    if (matchingMessages.length === 0) return;
    const nextIdx = (currentIndex + 1) % matchingMessages.length;
    setCurrentIndex(nextIdx);
    onScrollToMessage(matchingMessages[nextIdx]._id);
  };

  const handlePrev = () => {
    if (matchingMessages.length === 0) return;
    const prevIdx = (currentIndex - 1 + matchingMessages.length) % matchingMessages.length;
    setCurrentIndex(prevIdx);
    onScrollToMessage(matchingMessages[prevIdx]._id);
  };

  if (!isOpen) return null;

  return (
    <div className="bg-[#111b21] border-b border-gray-800 px-4 py-2 flex items-center justify-between gap-2 z-20 select-none shadow-md animate-in slide-in-from-top duration-150">
      <div className="flex items-center gap-2 flex-1 max-w-md">
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search in conversation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
          className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-[#03cafc]"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-gray-700/60 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs">
        {searchQuery.trim() && (
          <span className="text-gray-400 text-[11px] select-none">
            {matchingMessages.length > 0
              ? `${currentIndex + 1} of ${matchingMessages.length}`
              : 'No matches'}
          </span>
        )}

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrev}
            disabled={matchingMessages.length === 0}
            className="p-1.5 text-gray-300 hover:text-white hover:bg-[#202c33] rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            title="Previous match"
          >
            <ChevronUp className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={matchingMessages.length === 0}
            className="p-1.5 text-gray-300 hover:text-white hover:bg-[#202c33] rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            title="Next match"
          >
            <ChevronDown className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#202c33] rounded-lg transition-colors ml-1 cursor-pointer"
            title="Close search"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatSearch;
