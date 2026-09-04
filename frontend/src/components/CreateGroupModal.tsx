"use client"

import React, { useState, useRef, ChangeEvent } from 'react';
import { useAppData } from '@/context/Appcontext';
import {
  X,
  Search,
  Check,
  ArrowRight,
  ArrowLeft,
  Camera,
  Users,
  Loader2,
  User as UserIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (chatId: string) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onGroupCreated,
}) => {
  const { users, user: loggedInUser, createGroupChat } = useAppData();

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const availableContacts = (users || []).filter(
    (u) => u._id !== loggedInUser?._id
  );

  const filteredContacts = availableContacts.filter((u) =>
    (u.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedUsers = availableContacts.filter((u) =>
    selectedUserIds.includes(u._id)
  );

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose a valid image file');
      return;
    }

    setAvatarFile(file);
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
  };

  const handleNextStep = () => {
    if (selectedUserIds.length === 0) {
      toast.error('At least 1 participant must be selected');
      return;
    }
    setStep(2);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error('Group subject/name is required');
      return;
    }

    setIsCreating(true);
    const newChatId = await createGroupChat(
      groupName.trim(),
      selectedUserIds,
      groupDescription.trim(),
      avatarFile || undefined
    );
    setIsCreating(false);

    if (newChatId) {
      // Reset state and close
      setStep(1);
      setSelectedUserIds([]);
      setGroupName('');
      setGroupDescription('');
      setAvatarFile(null);
      setAvatarPreview(null);
      onClose();
      onGroupCreated(newChatId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-[#202c33] w-full max-w-md rounded-2xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] select-none animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-[#111b21] px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors cursor-pointer"
                title="Back to participants"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="text-base font-bold text-white">
                {step === 1 ? 'Add Group Participants' : 'New Group Info'}
              </h2>
              <p className="text-xs text-gray-400">
                {step === 1
                  ? `${selectedUserIds.length} of ${availableContacts.length} selected`
                  : 'Provide group subject and optional icon'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: Select Participants */}
        {step === 1 && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search contacts */}
            <div className="p-3 border-b border-gray-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#111b21] border border-gray-700/60 rounded-xl text-white placeholder-gray-400 text-xs focus:outline-none focus:border-[#03cafc]"
                />
              </div>
            </div>

            {/* Selected contacts chips */}
            {selectedUsers.length > 0 && (
              <div className="p-2.5 bg-[#182229] border-b border-gray-800 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scroll">
                {selectedUsers.map((u) => (
                  <div
                    key={`chip-${u._id}`}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-[#03cafc]/20 border border-[#03cafc]/40 rounded-full text-xs text-[#03cafc] animate-in zoom-in-90 duration-100"
                  >
                    <span className="font-medium truncate max-w-[100px]">{u.name}</span>
                    <button
                      type="button"
                      onClick={() => toggleUserSelection(u._id)}
                      className="text-[#03cafc] hover:text-white cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Contacts list */}
            <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-1">
              {filteredContacts.length > 0 ? (
                filteredContacts.map((u) => {
                  const isSelected = selectedUserIds.includes(u._id);
                  const userAvatar =
                    typeof u.avatar === 'string'
                      ? u.avatar
                      : u.avatar?.url || '';

                  return (
                    <button
                      key={u._id}
                      type="button"
                      onClick={() => toggleUserSelection(u._id)}
                      className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#03cafc]/20 border border-[#03cafc]/40'
                          : 'hover:bg-[#111b21] border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {userAvatar ? (
                            <img src={userAvatar} alt={u.name} className="w-full h-full object-cover" />
                          ) : (
                            <UserIcon className="w-5 h-5 text-gray-300" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium text-white block truncate">
                            {u.name}
                          </span>
                          <span className="text-xs text-gray-400 block truncate">
                            {u.about || u.email}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ml-2 transition-all ${
                          isSelected
                            ? 'bg-[#03cafc] border-[#03cafc] text-black'
                            : 'border-gray-600 bg-transparent'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-10 text-xs text-gray-400">
                  No contacts found matching &quot;{searchQuery}&quot;
                </div>
              )}
            </div>

            {/* Footer with Next step button */}
            <div className="p-4 bg-[#111b21] border-t border-gray-800 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {selectedUserIds.length} participant{selectedUserIds.length === 1 ? '' : 's'} chosen
              </span>
              <button
                type="button"
                onClick={handleNextStep}
                disabled={selectedUserIds.length === 0}
                className="px-5 py-2 bg-[#03cafc] hover:bg-[#029ecc] disabled:opacity-40 disabled:pointer-events-none text-[#0b141a] rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-[#03cafc]/20 cursor-pointer active:scale-95"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Group Info & Subject */}
        {step === 2 && (
          <div className="flex-1 flex flex-col p-5 space-y-4 overflow-y-auto custom-scroll">
            {/* Avatar upload */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-[#111b21] border-2 border-[#03cafc]/40 flex items-center justify-center overflow-hidden shadow-lg shadow-[#03cafc]/10">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Group Icon" className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-10 h-10 text-[#03cafc]" />
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity cursor-pointer"
                  title="Upload group icon"
                >
                  <Camera className="w-6 h-6 text-[#03cafc] mb-0.5" />
                  <span className="text-[10px] font-semibold uppercase">Add Icon</span>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 text-xs text-[#03cafc] hover:underline cursor-pointer"
              >
                {avatarPreview ? 'Change group icon' : 'Upload group icon'}
              </button>
            </div>

            {/* Group Name input */}
            <div>
              <label className="text-xs font-semibold text-[#03cafc] uppercase tracking-wider block mb-1.5">
                Group Subject <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                maxLength={25}
                placeholder="Type group subject..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                autoFocus
                className="w-full bg-[#111b21] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#03cafc]"
              />
              <div className="flex justify-end mt-1">
                <span className="text-[10px] text-gray-400">{groupName.length}/25</span>
              </div>
            </div>

            {/* Group Description */}
            <div>
              <label className="text-xs font-semibold text-[#03cafc] uppercase tracking-wider block mb-1.5">
                Group Description <span className="text-gray-500 lowercase">(optional)</span>
              </label>
              <textarea
                rows={3}
                maxLength={150}
                placeholder="Group purpose, rules, topics..."
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                className="w-full bg-[#111b21] border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#03cafc] resize-none"
              />
              <div className="flex justify-end mt-0.5">
                <span className="text-[10px] text-gray-400">{groupDescription.length}/150</span>
              </div>
            </div>

            {/* Selected Members Summary */}
            <div className="bg-[#111b21] p-3 rounded-xl border border-gray-800">
              <span className="text-[11px] font-semibold text-gray-300 block mb-1">
                Participants ({selectedUsers.length + 1})
              </span>
              <p className="text-xs text-gray-400">
                You, {selectedUsers.map((u) => u.name).join(', ')}
              </p>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isCreating}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Back
              </button>

              <button
                type="button"
                onClick={handleCreateGroup}
                disabled={isCreating || !groupName.trim()}
                className="px-6 py-2.5 bg-[#03cafc] hover:bg-[#029ecc] disabled:opacity-40 disabled:pointer-events-none text-[#0b141a] rounded-xl text-xs font-bold transition-all shadow-md shadow-[#03cafc]/20 flex items-center gap-2 cursor-pointer active:scale-95"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#0b141a]" />
                    <span>Creating Group...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Create Group</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateGroupModal;
