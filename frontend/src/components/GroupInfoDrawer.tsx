"use client"

import React, { useState, useRef, ChangeEvent } from 'react';
import { Message } from '@/types/chat';
import { User, useAppData } from '@/context/Appcontext';
import {
  X,
  Users,
  Image as ImageIcon,
  Link as LinkIcon,
  Bell,
  BellOff,
  Shield,
  LogOut,
  UserPlus,
  MoreVertical,
  Edit2,
  Check,
  Camera,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  ExternalLink,
  MessageSquare,
  ChevronRight,
  User as UserIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface GroupInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  group: User | null;
  messages: Message[] | null;
  loggedInUserId?: string;
  onSelectPrivateChat?: (userId: string) => void;
}

export const GroupInfoDrawer: React.FC<GroupInfoDrawerProps> = ({
  isOpen,
  onClose,
  group,
  messages,
  loggedInUserId,
  onSelectPrivateChat,
}) => {
  const {
    users: allContacts,
    updateGroupDetails,
    updateGroupAvatar,
    addGroupMembers,
    removeGroupMember,
    promoteGroupAdmin,
    demoteGroupAdmin,
    leaveGroup,
  } = useAppData();

  const [activeTab, setActiveTab] = useState<'members' | 'media' | 'audio' | 'links'>('members');
  const [isMuted, setIsMuted] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Editing state
  const [isEditingSubject, setIsEditingSubject] = useState(false);
  const [newSubject, setNewSubject] = useState(group?.groupName || group?.name || '');
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [newDesc, setNewDesc] = useState(group?.groupDescription || '');

  // Add members modal state
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [selectedNewMemberIds, setSelectedNewMemberIds] = useState<string[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  // Participant context menu
  const [activeMemberMenuId, setActiveMemberMenuId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (group) {
      setNewSubject(group.groupName || group.name || '');
      setNewDesc(group.groupDescription || '');
    }
  }, [group]);

  if (!isOpen || !group) return null;

  const groupMembers = group.users || [];
  const groupAdmins = group.groupAdmins || [];
  const isCurrentUserAdmin = loggedInUserId ? groupAdmins.includes(loggedInUserId) : false;

  const groupAvatarUrl =
    typeof group.avatar === 'string'
      ? group.avatar
      : group.avatar?.url || '';

  // Extract shared media
  const sharedMedia = (messages || []).filter(
    (m) => !m.isDeleted && !m.deletedForEveryone && m.messageType === 'image' && m.image?.url
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

  const handleSaveSubject = async () => {
    if (!newSubject.trim()) {
      toast.error('Subject cannot be empty');
      return;
    }
    const success = await updateGroupDetails(group._id, newSubject.trim(), group.groupDescription);
    if (success) setIsEditingSubject(false);
  };

  const handleSaveDesc = async () => {
    const success = await updateGroupDetails(group._id, group.groupName || group.name, newDesc.trim());
    if (success) setIsEditingDesc(false);
  };

  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await updateGroupAvatar(group._id, file);
  };

  const handleAddMembersSubmit = async () => {
    if (selectedNewMemberIds.length === 0) return;
    const success = await addGroupMembers(group._id, selectedNewMemberIds);
    if (success) {
      setSelectedNewMemberIds([]);
      setShowAddMembersModal(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (window.confirm(`Are you sure you want to leave "${group.groupName || group.name}"?`)) {
      const success = await leaveGroup(group._id);
      if (success) {
        onClose();
      }
    }
  };

  // Contacts eligible to be added
  const existingMemberIds = new Set(groupMembers.map((m) => m._id));
  const addableContacts = (allContacts || []).filter(
    (c) => !existingMemberIds.has(c._id)
  );
  const filteredAddableContacts = addableContacts.filter((c) =>
    (c.name || '').toLowerCase().includes(memberSearchQuery.toLowerCase())
  );

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

      {/* Add Members Modal */}
      {showAddMembersModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#202c33] w-full max-w-md rounded-2xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="bg-[#111b21] p-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Add Participants</h3>
              <button
                onClick={() => setShowAddMembersModal(false)}
                className="p-1 text-gray-400 hover:text-white rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 border-b border-gray-800">
              <input
                type="text"
                placeholder="Search contacts..."
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                className="w-full px-3 py-2 bg-[#111b21] border border-gray-700 rounded-xl text-xs text-white placeholder-gray-400 focus:outline-none focus:border-[#03cafc]"
              />
            </div>

            <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-1">
              {filteredAddableContacts.length > 0 ? (
                filteredAddableContacts.map((c) => {
                  const isSelected = selectedNewMemberIds.includes(c._id);
                  return (
                    <button
                      key={c._id}
                      onClick={() =>
                        setSelectedNewMemberIds((prev) =>
                          prev.includes(c._id) ? prev.filter((id) => id !== c._id) : [...prev, c._id]
                        )
                      }
                      className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-all ${
                        isSelected ? 'bg-[#03cafc]/20 border border-[#03cafc]/40' : 'hover:bg-[#111b21]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center">
                          <UserIcon className="w-5 h-5 text-gray-300" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium text-white block truncate">{c.name}</span>
                          <span className="text-xs text-gray-400 block truncate">{c.email}</span>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          isSelected ? 'bg-[#03cafc] border-[#03cafc] text-black' : 'border-gray-600'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-8 text-xs text-gray-400">No addable contacts found</div>
              )}
            </div>

            <div className="p-4 bg-[#111b21] border-t border-gray-800 flex justify-end gap-2">
              <button
                onClick={() => setShowAddMembersModal(false)}
                className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMembersSubmit}
                disabled={selectedNewMemberIds.length === 0}
                className="px-5 py-2 bg-[#03cafc] hover:bg-[#029ecc] disabled:opacity-40 text-[#0b141a] rounded-xl text-xs font-bold cursor-pointer shadow-md shadow-[#03cafc]/20"
              >
                Add ({selectedNewMemberIds.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Slide-over Drawer Panel */}
      <div
        className={`
          fixed inset-0 z-50 w-full sm:static sm:z-30 sm:w-80 md:w-96
          bg-[#111b21] sm:border-l sm:border-gray-800
          h-full flex flex-col select-none shadow-2xl flex-shrink-0
          animate-in slide-in-from-right duration-200
        `}
      >
        {/* Header */}
        <div className="bg-[#202c33] border-b border-gray-800 px-4 py-3.5 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-gray-700/60 rounded-full text-gray-300 hover:text-white transition-colors cursor-pointer"
            title="Close Info"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-base font-semibold text-white">Group Info</h2>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto custom-scroll space-y-3 pb-8">
          {/* Group Profile Card */}
          <div className="bg-[#202c33] p-6 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="relative group">
              <div
                onClick={() => groupAvatarUrl && setPreviewImage(groupAvatarUrl)}
                className="w-28 h-28 rounded-full overflow-hidden border-4 border-[#03cafc]/40 bg-[#111b21] flex items-center justify-center shadow-lg shadow-[#03cafc]/10 cursor-pointer"
              >
                {groupAvatarUrl ? (
                  <img src={groupAvatarUrl} alt={group.name} className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-12 h-12 text-[#03cafc]" />
                )}
              </div>

              {isCurrentUserAdmin && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity cursor-pointer"
                  title="Change group icon"
                >
                  <Camera className="w-6 h-6 text-[#03cafc] mb-0.5" />
                  <span className="text-[10px] font-semibold uppercase">Change</span>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            {/* Group Subject Editing */}
            <div className="w-full mt-3">
              {isEditingSubject ? (
                <div className="flex items-center gap-1.5 justify-center">
                  <input
                    type="text"
                    maxLength={25}
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveSubject()}
                    autoFocus
                    className="bg-[#111b21] border border-[#03cafc] rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none text-center"
                  />
                  <button
                    onClick={handleSaveSubject}
                    className="p-2 bg-[#03cafc] hover:bg-[#029ecc] text-[#0b141a] rounded-xl cursor-pointer font-bold"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <h3 className="text-lg font-bold text-white truncate max-w-[240px]">
                    {group.groupName || group.name}
                  </h3>
                  {isCurrentUserAdmin && (
                    <button
                      onClick={() => setIsEditingSubject(true)}
                      className="p-1 text-gray-400 hover:text-[#03cafc] rounded-lg cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
              <span className="text-xs text-[#03cafc] font-medium block mt-0.5">
                Group · {groupMembers.length} participants
              </span>
            </div>
          </div>

          {/* Group Description */}
          <div className="bg-[#202c33] p-4 shadow-sm">
            <span className="text-[11px] font-semibold text-[#03cafc] uppercase tracking-wider block mb-1">
              Description
            </span>
            {isEditingDesc ? (
              <div className="space-y-2">
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  autoFocus
                  className="w-full bg-[#111b21] border border-[#03cafc] rounded-xl p-2 text-xs text-white focus:outline-none resize-none"
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    onClick={() => setIsEditingDesc(false)}
                    className="px-3 py-1 bg-gray-700 text-xs rounded-lg text-gray-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDesc}
                    className="px-3 py-1 bg-[#03cafc] hover:bg-[#029ecc] text-xs rounded-lg text-[#0b141a] font-bold cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <p className="text-sm text-gray-200 leading-relaxed">
                  {group.groupDescription || 'No description provided yet.'}
                </p>
                {isCurrentUserAdmin && (
                  <button
                    onClick={() => setIsEditingDesc(true)}
                    className="p-1 text-gray-400 hover:text-[#03cafc] rounded-lg ml-2 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Media, Audio & Links Tabs */}
          <div className="bg-[#202c33] p-4 shadow-sm space-y-3">
            <div className="flex bg-[#111b21] p-1 rounded-xl gap-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('members')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === 'members'
                    ? 'bg-[#03cafc]/20 text-[#03cafc] font-semibold border border-[#03cafc]/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Members ({groupMembers.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('media')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
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
                onClick={() => setActiveTab('links')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === 'links'
                    ? 'bg-[#03cafc]/20 text-[#03cafc] font-semibold border border-[#03cafc]/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Links ({sharedLinks.length})</span>
              </button>
            </div>

            {/* TAB: Members List */}
            {activeTab === 'members' && (
              <div className="space-y-2">
                {/* Add participant button */}
                {isCurrentUserAdmin && (
                  <button
                    onClick={() => setShowAddMembersModal(true)}
                    className="w-full p-2.5 bg-[#111b21] hover:bg-[#182229] border border-dashed border-[#03cafc]/40 rounded-xl flex items-center gap-3 text-[#03cafc] text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#03cafc]/20 flex items-center justify-center">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <span>Add participants</span>
                  </button>
                )}

                {/* Member items */}
                <div className="space-y-1 max-h-64 overflow-y-auto custom-scroll p-0.5">
                  {groupMembers.map((member) => {
                    const isMemberAdmin = groupAdmins.includes(member._id);
                    const isSelf = member._id === loggedInUserId;
                    const memberAvatar =
                      typeof member.avatar === 'string'
                        ? member.avatar
                        : member.avatar?.url || '';

                    return (
                      <div
                        key={member._id}
                        className="p-2 bg-[#111b21] rounded-xl flex items-center justify-between group relative"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {memberAvatar ? (
                              <img src={memberAvatar} alt={member.name} className="w-full h-full object-cover" />
                            ) : (
                              <UserIcon className="w-5 h-5 text-gray-300" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-white truncate">
                                {isSelf ? 'You' : member.name}
                              </span>
                              {isMemberAdmin && (
                                <span className="px-1.5 py-0.5 bg-[#0b3d4f] text-[#03cafc] border border-[#03cafc]/40 rounded text-[9px] font-bold">
                                  Admin
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-400 block truncate">
                              {member.about || member.email}
                            </span>
                          </div>
                        </div>

                        {/* Action menu trigger */}
                        {!isSelf && (
                          <div className="relative">
                            <button
                              onClick={() =>
                                setActiveMemberMenuId(activeMemberMenuId === member._id ? null : member._id)
                              }
                              className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700/60 cursor-pointer"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {/* Dropdown Menu */}
                            {activeMemberMenuId === member._id && (
                              <div className="absolute right-0 top-full mt-1 w-44 bg-[#202c33] border border-gray-700 rounded-xl shadow-2xl py-1 z-50 text-xs animate-in zoom-in-95 duration-100">
                                {onSelectPrivateChat && (
                                  <button
                                    onClick={() => {
                                      onSelectPrivateChat(member._id);
                                      setActiveMemberMenuId(null);
                                    }}
                                    className="w-full px-3 py-2 flex items-center gap-2 text-gray-200 hover:bg-[#111b21] cursor-pointer"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5 text-[#03cafc]" />
                                    <span>Message {member.name}</span>
                                  </button>
                                )}

                                {isCurrentUserAdmin && !isMemberAdmin && (
                                  <button
                                    onClick={() => {
                                      promoteGroupAdmin(group._id, member._id);
                                      setActiveMemberMenuId(null);
                                    }}
                                    className="w-full px-3 py-2 flex items-center gap-2 text-gray-200 hover:bg-[#111b21] cursor-pointer"
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5 text-[#03cafc]" />
                                    <span>Make group admin</span>
                                  </button>
                                )}

                                {isCurrentUserAdmin && isMemberAdmin && (
                                  <button
                                    onClick={() => {
                                      demoteGroupAdmin(group._id, member._id);
                                      setActiveMemberMenuId(null);
                                    }}
                                    className="w-full px-3 py-2 flex items-center gap-2 text-gray-200 hover:bg-[#111b21] cursor-pointer"
                                  >
                                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Dismiss as admin</span>
                                  </button>
                                )}

                                {isCurrentUserAdmin && (
                                  <button
                                    onClick={() => {
                                      removeGroupMember(group._id, member._id);
                                      setActiveMemberMenuId(null);
                                    }}
                                    className="w-full px-3 py-2 flex items-center gap-2 text-rose-400 hover:bg-rose-950/30 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Remove {member.name}</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: Media */}
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
                <div className="text-center py-8 text-xs text-gray-400">No photos shared in this group.</div>
              )
            )}

            {/* TAB: Links */}
            {activeTab === 'links' && (
              sharedLinks.length > 0 ? (
                <div className="space-y-2 max-h-56 overflow-y-auto custom-scroll p-1">
                  {sharedLinks.map((item, idx) => (
                    <a
                      key={`glink-${idx}`}
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block p-2.5 bg-[#111b21] hover:bg-[#182229] border border-gray-700/50 rounded-xl text-xs transition-colors group"
                    >
                      <div className="flex items-center justify-between text-[#03cafc] font-medium">
                        <span className="truncate flex-1">{item.url}</span>
                        <ExternalLink className="w-3.5 h-3.5 ml-1.5 flex-shrink-0 opacity-70 group-hover:opacity-100" />
                      </div>
                      {item.text && <p className="text-[11px] text-gray-400 truncate mt-1">{item.text}</p>}
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-gray-400">No links shared in this group.</div>
              )
            )}
          </div>

          {/* Privacy & Settings */}
          <div className="bg-[#202c33] shadow-sm divide-y divide-gray-800 text-xs">
            <button
              type="button"
              onClick={() => {
                setIsMuted((prev) => !prev);
                toast.success(!isMuted ? 'Notifications muted' : 'Notifications unmuted');
              }}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-700/30 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                {isMuted ? <BellOff className="w-4 h-4 text-amber-400" /> : <Bell className="w-4 h-4 text-[#03cafc]" />}
                <div>
                  <span className="text-sm font-medium text-white block">Mute notifications</span>
                  <span className="text-[11px] text-gray-400 block">{isMuted ? 'Muted' : 'Unmuted'}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>

            <div className="p-4 flex items-center gap-3 text-gray-300">
              <Shield className="w-4 h-4 text-[#03cafc] flex-shrink-0" />
              <div>
                <span className="text-xs font-semibold text-white block">Encryption</span>
                <span className="text-[11px] text-gray-400 block leading-relaxed">
                  Messages and calls are end-to-end encrypted.
                </span>
              </div>
            </div>

            {/* Exit Group */}
            <button
              type="button"
              onClick={handleLeaveGroup}
              className="w-full p-4 flex items-center gap-3 hover:bg-rose-950/30 text-rose-400 transition-colors text-left cursor-pointer font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span>Exit group</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default GroupInfoDrawer;
