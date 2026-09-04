"use client"

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import axios from 'axios';
import toast from 'react-hot-toast';
import { chat_service, useAppData, User } from '@/context/Appcontext';
import { useSocket } from '@/context/SocketContext';
import ChatSidebar from '@/components/ChatSidebar';
import ChatHeaders from '@/components/ChatHeaders';
import ChatMessages from '@/components/ChatMessages';
import ChatInput from '@/components/ChatInput';
import ContactInfoDrawer from '@/components/ContactInfoDrawer';
import ChatSearch from '@/components/ChatSearch';
import Loading from '@/components/loading';
import { playIncomingSound, playOutgoingSound } from '@/utils/sound';

import CreateGroupModal from '@/components/CreateGroupModal';
import GroupInfoDrawer from '@/components/GroupInfoDrawer';
import { Message, Reaction, ReplyTo } from '@/types/chat';

const HaveItChat = () => {
  const {
    loading,
    isAuth,
    logoutUser,
    chats,
    user: loggedInUser,
    users,
    fetchChats,
    fetchAllUsers,
    soundEnabled,
  } = useAppData();

  const { socket, isConnected, typingMap, markMessagesAsSeen } = useSocket();

  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [showAllUsers, setShowAllUsers] = useState(false);

  // Phase 3, 4 & 5 State: Quote Reply, Editing, Search, Drawers & Group Modal
  const [replyingTo, setReplyingTo] = useState<ReplyTo | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [isContactInfoOpen, setIsContactInfoOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  const router = useRouter();

  useEffect(() => {
    fetchChats();
    fetchAllUsers();
  }, []);

  useEffect(() => {
    if (!isAuth && !loading) {
      router.push('/login');
    }
  }, [isAuth, router, loading]);

  const handleLogout = () => logoutUser();

  async function fetchChat() {
    if (!selectedUser) return;
    const token = Cookies.get('token');
    try {
      const { data } = await axios.get(`${chat_service}/api/v1/chat/message/${selectedUser}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setMessages(data.messages);
      setActiveUser(data.user);
      await fetchChats();
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load messages');
    }
  }

  async function createChat(u: User) {
    try {
      const token = Cookies.get('token');
      const { data } = await axios.post(
        `${chat_service}/api/v1/chat/new`,
        {
          otherUserId: u._id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setSelectedUser(data.chatId);
      setShowAllUsers(false);
      await fetchChats();
    } catch (error) {
      console.error('Failed to start chat:', error);
      toast.error('Failed to start chat');
    }
  }

  const handleSelectPrivateChat = async (targetUserId: string) => {
    const targetUser = (users || []).find((u) => u._id === targetUserId);
    if (targetUser) {
      setIsContactInfoOpen(false);
      await createChat(targetUser);
    }
  };

  const handleMessageSent = (newMessage: Message) => {
    if (soundEnabled) {
      playOutgoingSound();
    }
    setMessages((prev) => {
      if (!prev) return [newMessage];
      const exists = prev.some((m) => m._id.toString() === newMessage._id.toString());
      if (exists) return prev;
      return [...prev, newMessage];
    });
    setReplyingTo(null);
    fetchChats();
  };

  const handleReactionUpdated = (messageId: string, reactions: Reaction[]) => {
    setMessages((prev) => {
      if (!prev) return prev;
      return prev.map((m) =>
        m._id.toString() === messageId.toString() ? { ...m, reactions } : m
      );
    });
  };

  const handleMessageDeleted = (messageId: string, deleteType: string) => {
    setMessages((prev) => {
      if (!prev) return prev;
      if (deleteType === 'everyone') {
        return prev.map((m) =>
          m._id.toString() === messageId.toString()
            ? {
                ...m,
                isDeleted: true,
                deletedForEveryone: true,
                text: 'This message was deleted',
                image: undefined,
                audio: undefined,
              }
            : m
        );
      } else {
        // Delete for me
        return prev.filter((m) => m._id.toString() !== messageId.toString());
      }
    });
    fetchChats();
  };

  const handleMessageEdited = (updatedMessage: Message) => {
    setMessages((prev) => {
      if (!prev) return prev;
      return prev.map((m) =>
        m._id.toString() === updatedMessage._id.toString() ? { ...m, ...updatedMessage } : m
      );
    });
    setEditingMessage(null);
    fetchChats();
  };

  const handleScrollToMessage = useCallback((messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-amber-400');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-amber-400');
      }, 1800);
    }
  }, []);

  // Join/Leave Socket Room when active chat changes or socket connects
  useEffect(() => {
    if (selectedUser) {
      fetchChat();
      setReplyingTo(null);
      setEditingMessage(null);
      setIsSearchOpen(false);
      if (socket && isConnected) {
        console.log('🚪 Socket joining chat room:', selectedUser);
        socket.emit('join_chat', selectedUser.toString());
        markMessagesAsSeen(selectedUser.toString());
      }
    } else {
      setMessages(null);
      setActiveUser(null);
      setIsContactInfoOpen(false);
      setIsSearchOpen(false);
    }

    return () => {
      if (socket && isConnected && selectedUser) {
        socket.emit('leave_chat', selectedUser.toString());
      }
    };
  }, [selectedUser, socket, isConnected]);

  // Real-time Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (newMessage: Message) => {
      console.log('📩 Incoming socket message:', newMessage);
      const incomingChatId = newMessage.chatId?.toString();
      const currentChatId = selectedUser?.toString();

      if (currentChatId && incomingChatId === currentChatId) {
        if (soundEnabled && newMessage.sender !== loggedInUser?._id) {
          playIncomingSound();
        }
        setMessages((prev) => {
          if (!prev) return [newMessage];
          const exists = prev.some((m) => m._id.toString() === newMessage._id.toString());
          if (exists) return prev;
          return [...prev, newMessage];
        });
        // Immediately acknowledge as seen
        markMessagesAsSeen(currentChatId);
      } else {
        if (soundEnabled && newMessage.sender !== loggedInUser?._id) {
          playIncomingSound();
        }
      }
      fetchChats();
    };

    const handleSeenUpdate = ({
      chatId,
      seenBy,
      seenAt,
    }: {
      chatId: string;
      seenBy: string;
      seenAt: string;
    }) => {
      console.log('👁️ Messages seen update received for chat:', chatId, 'by:', seenBy);
      const targetChatId = chatId?.toString();
      const currentChatId = selectedUser?.toString();

      if (currentChatId && targetChatId === currentChatId) {
        setMessages((prev) => {
          if (!prev) return prev;
          return prev.map((m) =>
            m.sender?.toString() !== seenBy?.toString()
              ? { ...m, seen: true, seenAt: seenAt }
              : m
          );
        });
      }
      fetchChats();
    };

    const handleReactionUpdate = ({
      messageId,
      chatId,
      reactions,
    }: {
      messageId: string;
      chatId: string;
      reactions: Reaction[];
    }) => {
      const targetChatId = chatId?.toString();
      const currentChatId = selectedUser?.toString();

      if (currentChatId && targetChatId === currentChatId) {
        handleReactionUpdated(messageId, reactions);
      }
    };

    const handleMessageDeleteSocket = ({
      messageId,
      chatId,
      deleteType,
    }: {
      messageId: string;
      chatId: string;
      deleteType: string;
    }) => {
      const targetChatId = chatId?.toString();
      const currentChatId = selectedUser?.toString();

      if (currentChatId && targetChatId === currentChatId) {
        handleMessageDeleted(messageId, deleteType);
      }
    };

    const handleMessageEditSocket = ({
      messageId,
      chatId,
      text,
      isEdited,
      editedAt,
    }: {
      messageId: string;
      chatId: string;
      text: string;
      isEdited: boolean;
      editedAt: string;
    }) => {
      const targetChatId = chatId?.toString();
      const currentChatId = selectedUser?.toString();

      if (currentChatId && targetChatId === currentChatId) {
        setMessages((prev) => {
          if (!prev) return prev;
          return prev.map((m) =>
            m._id.toString() === messageId.toString()
              ? { ...m, text, isEdited, editedAt }
              : m
          );
        });
      }
    };

    const handleChatUpdated = (data: unknown) => {
      console.log('🔄 Chat list update event received:', data);
      fetchChats();
      if (selectedUser) {
        fetchChat();
      }
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('messages_seen_update', handleSeenUpdate);
    socket.on('reaction_updated', handleReactionUpdate);
    socket.on('message_deleted', handleMessageDeleteSocket);
    socket.on('message_edited', handleMessageEditSocket);
    socket.on('chat_updated', handleChatUpdated);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('messages_seen_update', handleSeenUpdate);
      socket.off('reaction_updated', handleReactionUpdate);
      socket.off('message_deleted', handleMessageDeleteSocket);
      socket.off('message_edited', handleMessageEditSocket);
      socket.off('chat_updated', handleChatUpdated);
    };
  }, [socket, selectedUser, soundEnabled, loggedInUser?._id]);

  // Determine typing indicator
  const isTyping = Boolean(
    selectedUser &&
      typingMap[selectedUser.toString()]?.some(
        (id) => id.toString() !== loggedInUser?._id?.toString()
      )
  );

  if (loading) return <Loading />;

  return (
    <div className="h-screen w-screen flex bg-[#111b21] text-white overflow-hidden select-none">
      {/* Have-it Sidebar */}
      <ChatSidebar
        sideBarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        showAllUsers={showAllUsers}
        setShowAllUsers={setShowAllUsers}
        users={users}
        loggedInUser={loggedInUser}
        chats={chats}
        selectedUser={selectedUser}
        setSelectedUser={setSelectedUser}
        handleLogout={handleLogout}
        createChat={createChat}
        onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
      />

      {/* Have-it Main Chat Panel */}
      <div className="flex-1 flex flex-col h-full overflow-hidden overflow-x-hidden bg-[#0b141a] relative border-l border-gray-800 w-full min-w-0 max-w-full">
        <ChatHeaders
          user={activeUser}
          setSidebarOpen={setSidebarOpen}
          isTyping={isTyping}
          onOpenContactInfo={() => setIsContactInfoOpen((prev) => !prev)}
          onToggleSearch={() => setIsSearchOpen((prev) => !prev)}
          isSearchOpen={isSearchOpen}
        />

        {/* In-Chat Message Search Bar */}
        <ChatSearch
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          messages={messages}
          onScrollToMessage={handleScrollToMessage}
        />

        {/* Chat Messages Stream & Background Pattern */}
        <div className="flex-1 overflow-hidden overflow-x-hidden relative flex flex-col justify-end haveit-chat-wallpaper w-full min-w-0 max-w-full">
          <ChatMessages
            selectedUser={selectedUser}
            messages={messages}
            loggedInUser={loggedInUser}
            activeUser={activeUser}
            users={users}
            onReply={(reply) => setReplyingTo(reply)}
            onEdit={(message) => setEditingMessage(message)}
            onReactionUpdated={handleReactionUpdated}
            onMessageDeleted={handleMessageDeleted}
          />
        </div>

        {selectedUser && (
          <ChatInput
            chatId={selectedUser}
            activeUser={activeUser}
            groupMembers={activeUser?.users}
            onMessageSent={handleMessageSent}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            editingMessage={editingMessage}
            onCancelEdit={() => setEditingMessage(null)}
            onMessageEdited={handleMessageEdited}
          />
        )}
      </div>

      {/* Right-Side Drawer (Group Info or Contact Info) */}
      {selectedUser && activeUser?.isGroup ? (
        <GroupInfoDrawer
          isOpen={isContactInfoOpen}
          onClose={() => setIsContactInfoOpen(false)}
          group={activeUser}
          messages={messages}
          loggedInUserId={loggedInUser?._id}
          onSelectPrivateChat={handleSelectPrivateChat}
        />
      ) : selectedUser ? (
        <ContactInfoDrawer
          isOpen={isContactInfoOpen}
          onClose={() => setIsContactInfoOpen(false)}
          user={activeUser}
          messages={messages}
          loggedInUserId={loggedInUser?._id}
        />
      ) : null}

      {/* New Group Modal */}
      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onGroupCreated={(newChatId) => {
          setSelectedUser(newChatId);
          fetchChats();
        }}
      />
    </div>
  );
};

export default HaveItChat;

