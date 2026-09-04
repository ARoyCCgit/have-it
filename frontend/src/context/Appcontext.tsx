"use client"

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import Cookies from "js-cookie";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";

export const user_service = "http://localhost:5000";
export const chat_service = "http://localhost:5002";
export const post_service = "http://localhost:5003";

export interface User {
    _id: string;
    name: string;
    email?: string;
    about?: string;
    avatar?: {
        url?: string;
        publicId?: string;
    } | string;
    role?: "user" | "admin" | "super_admin" | "moderator";
    theme?: "system" | "dark" | "light";
    isBanned?: boolean;
    isVerified?: boolean;
    createdAt?: string;
    // Group support fields
    isGroup?: boolean;
    groupName?: string;
    groupDescription?: string;
    groupAdmins?: string[];
    createdBy?: string;
    usersCount?: number;
    users?: User[];
}

export interface Chat {
    _id: string;
    users: string[];
    isGroup?: boolean;
    groupName?: string;
    groupDescription?: string;
    groupAvatar?: {
        url?: string;
        publicId?: string;
    };
    groupAdmins?: string[];
    createdBy?: string;
    latestMessage?: {
        text?: string;
        sender?: string;
    };
    createdAt: string;
    updatedAt: string;
    unseenCount?: number;     
}

export interface Chats {
    _id?: string;
    user: User;
    chat: Chat;
}

interface AppContextType {
    user: User | null;
    loading: boolean;
    isAuth: boolean;
    setUser: React.Dispatch<React.SetStateAction<User | null>>;
    setIsAuth: React.Dispatch<React.SetStateAction<boolean>>;
    logoutUser: () => Promise<void>;
    fetchUser: () => Promise<void>;
    fetchChats: () => Promise<void>;
    fetchAllUsers: () => Promise<void>;
    updateUserProfile: (name: string, about: string) => Promise<boolean>;
    updateUserAvatar: (file: File) => Promise<boolean>;
    removeUserAvatar: () => Promise<boolean>;
    updateUserTheme: (theme: "system" | "dark" | "light") => Promise<boolean>;
    createGroupChat: (
        groupName: string,
        members: string[],
        groupDescription?: string,
        avatarFile?: File
    ) => Promise<string | null>;
    updateGroupDetails: (chatId: string, groupName: string, groupDescription?: string) => Promise<boolean>;
    updateGroupAvatar: (chatId: string, file: File) => Promise<boolean>;
    addGroupMembers: (chatId: string, members: string[]) => Promise<boolean>;
    removeGroupMember: (chatId: string, memberId: string) => Promise<boolean>;
    promoteGroupAdmin: (chatId: string, memberId: string) => Promise<boolean>;
    demoteGroupAdmin: (chatId: string, memberId: string) => Promise<boolean>;
    leaveGroup: (chatId: string) => Promise<boolean>;
    chats: Chats[] | null;
    users: User[] | null;
    setChats: React.Dispatch<React.SetStateAction<Chats[] | null>>;
    soundEnabled: boolean;
    setSoundEnabled: React.Dispatch<React.SetStateAction<boolean>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
    children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuth, setIsAuth] = useState(false);
    const [loading, setLoading] = useState(true);
    const [chats, setChats] = useState<Chats[] | null>(null);
    const [users, setUsers] = useState<User[] | null>(null);
    const [soundEnabled, setSoundEnabled] = useState(true);

    async function fetchUser() {
        const token = Cookies.get("token");
        if (!token) {
            setLoading(false);
            return;
        }
        try {
            const { data } = await axios.get(`${user_service}/api/v1/me`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const userData = data.user || data;
            setUser(userData);
            setIsAuth(true);
            setLoading(false);

            // Immediately load chats and contacts
            fetchChats();
            fetchAllUsers();
        } catch (error) {
            console.error("Error fetching me:", error);
            setLoading(false);            
        }
    }

    async function logoutUser() {
        Cookies.remove("token");
        setUser(null);
        setIsAuth(false);
        setChats(null);
        setUsers(null);
        toast.success("User successfully logged out");
    }

    async function fetchChats() {
        const token = Cookies.get("token");
        if (!token) return;
        try {
            const { data } = await axios.get(`${chat_service}/api/v1/chat/all`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (data && Array.isArray(data.chats)) {
                setChats(data.chats);
            }
        } catch (error) {
            console.error("Error fetching chats:", error);            
        }
    }

    async function fetchAllUsers() {
        const token = Cookies.get("token");
        if (!token) return;
        try {
            const { data } = await axios.get(`${user_service}/api/v1/user/all`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (data && Array.isArray(data)) {
                setUsers(data);
            }
        } catch (error) {
            console.error("Error fetching all users:", error);            
        }
    }

    async function updateUserProfile(name: string, about: string): Promise<boolean> {
        const token = Cookies.get("token");
        if (!token) return false;
        try {
            const { data } = await axios.put(
                `${user_service}/api/v1/user/profile`,
                { name, about },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            if (data && data.user) {
                setUser(data.user);
                toast.success("Profile updated");
                fetchAllUsers();
                fetchChats();
                return true;
            }
            return false;
        } catch (err: unknown) {
            console.error("Error updating profile:", err);
            toast.error("Failed to update profile");
            return false;
        }
    }

    async function updateUserAvatar(file: File): Promise<boolean> {
        const token = Cookies.get("token");
        if (!token) return false;
        try {
            const formData = new FormData();
            formData.append("avatar", file);

            const { data } = await axios.post(
                `${user_service}/api/v1/user/avatar`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "multipart/form-data",
                    },
                }
            );
            if (data && data.user) {
                setUser(data.user);
                toast.success("Profile photo updated");
                fetchAllUsers();
                fetchChats();
                return true;
            }
            return false;
        } catch (err: unknown) {
            console.error("Error updating avatar:", err);
            toast.error("Failed to upload photo");
            return false;
        }
    }

    async function removeUserAvatar(): Promise<boolean> {
        const token = Cookies.get("token");
        if (!token) return false;
        try {
            const { data } = await axios.delete(
                `${user_service}/api/v1/user/avatar`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            if (data && data.user) {
                setUser(data.user);
                toast.success("Profile photo removed");
                fetchAllUsers();
                fetchChats();
                return true;
            }
            return false;
        } catch (err: unknown) {
            console.error("Error removing avatar:", err);
            toast.error("Failed to remove photo");
            return false;
        }
    }

    async function updateUserTheme(theme: "system" | "dark" | "light"): Promise<boolean> {
        const token = Cookies.get("token");
        if (!token) return false;
        try {
            const { data } = await axios.put(
                `${user_service}/api/v1/user/theme`,
                { theme },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            if (data && data.success) {
                setUser((prev) => (prev ? { ...prev, theme } : prev));
                if (data.token) {
                    Cookies.set("token", data.token, { expires: 15 });
                }
                toast.success(`Theme set to ${theme}`);
                return true;
            }
            return false;
        } catch (err: unknown) {
            console.error("Error updating theme:", err);
            toast.error("Failed to update theme");
            return false;
        }
    }

    // Group Management Functions
    async function createGroupChat(
        groupName: string,
        members: string[],
        groupDescription?: string,
        avatarFile?: File
    ): Promise<string | null> {
        const token = Cookies.get("token");
        if (!token) return null;
        try {
            const formData = new FormData();
            formData.append("groupName", groupName);
            formData.append("users", JSON.stringify(members));
            if (groupDescription) {
                formData.append("groupDescription", groupDescription);
            }
            if (avatarFile) {
                formData.append("file", avatarFile);
            }

            const { data } = await axios.post(
                `${chat_service}/api/v1/chat/group/new`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            if (data && data.chatId) {
                toast.success(`Group "${groupName}" created!`);
                await fetchChats();
                return data.chatId;
            }
            return null;
        } catch (err: unknown) {
            console.error("Error creating group:", err);
            toast.error("Failed to create group");
            return null;
        }
    }

    async function updateGroupDetails(chatId: string, groupName: string, groupDescription?: string): Promise<boolean> {
        const token = Cookies.get("token");
        if (!token) return false;
        try {
            await axios.put(
                `${chat_service}/api/v1/chat/group/${chatId}/update`,
                { groupName, groupDescription },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            toast.success("Group info updated");
            await fetchChats();
            return true;
        } catch (err) {
            console.error("Error updating group info:", err);
            toast.error("Failed to update group info");
            return false;
        }
    }

    async function updateGroupAvatar(chatId: string, file: File): Promise<boolean> {
        const token = Cookies.get("token");
        if (!token) return false;
        try {
            const formData = new FormData();
            formData.append("file", file);

            await axios.post(
                `${chat_service}/api/v1/chat/group/${chatId}/avatar`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "multipart/form-data",
                    },
                }
            );
            toast.success("Group icon updated");
            await fetchChats();
            return true;
        } catch (err) {
            console.error("Error updating group icon:", err);
            toast.error("Failed to update group icon");
            return false;
        }
    }

    async function addGroupMembers(chatId: string, members: string[]): Promise<boolean> {
        const token = Cookies.get("token");
        if (!token) return false;
        try {
            await axios.post(
                `${chat_service}/api/v1/chat/group/${chatId}/add`,
                { users: members },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            toast.success("Participants added");
            await fetchChats();
            return true;
        } catch (err) {
            console.error("Error adding group members:", err);
            toast.error("Failed to add participants");
            return false;
        }
    }

    async function removeGroupMember(chatId: string, memberId: string): Promise<boolean> {
        const token = Cookies.get("token");
        if (!token) return false;
        try {
            await axios.post(
                `${chat_service}/api/v1/chat/group/${chatId}/remove`,
                { memberId },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            toast.success("Participant removed");
            await fetchChats();
            return true;
        } catch (err) {
            console.error("Error removing participant:", err);
            toast.error("Failed to remove participant");
            return false;
        }
    }

    async function promoteGroupAdmin(chatId: string, memberId: string): Promise<boolean> {
        const token = Cookies.get("token");
        if (!token) return false;
        try {
            await axios.post(
                `${chat_service}/api/v1/chat/group/${chatId}/admin/promote`,
                { memberId },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            toast.success("User promoted to Admin");
            await fetchChats();
            return true;
        } catch (err) {
            console.error("Error promoting admin:", err);
            toast.error("Failed to promote admin");
            return false;
        }
    }

    async function demoteGroupAdmin(chatId: string, memberId: string): Promise<boolean> {
        const token = Cookies.get("token");
        if (!token) return false;
        try {
            await axios.post(
                `${chat_service}/api/v1/chat/group/${chatId}/admin/demote`,
                { memberId },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            toast.success("Admin status removed");
            await fetchChats();
            return true;
        } catch (err) {
            console.error("Error demoting admin:", err);
            toast.error("Failed to dismiss admin");
            return false;
        }
    }

    async function leaveGroup(chatId: string): Promise<boolean> {
        const token = Cookies.get("token");
        if (!token) return false;
        try {
            await axios.post(
                `${chat_service}/api/v1/chat/group/${chatId}/leave`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            toast.success("You left the group");
            await fetchChats();
            return true;
        } catch (err) {
            console.error("Error leaving group:", err);
            toast.error("Failed to leave group");
            return false;
        }
    }

    useEffect(() => {
        fetchUser();
    }, []);

    useEffect(() => {
        if (isAuth) {
            fetchChats();
            fetchAllUsers();
        }
    }, [isAuth]);

    return (
        <AppContext.Provider
            value={{
                user,
                isAuth,
                loading,
                setIsAuth,
                setUser,
                logoutUser,
                fetchUser,
                fetchChats,
                fetchAllUsers,
                updateUserProfile,
                updateUserAvatar,
                removeUserAvatar,
                updateUserTheme,
                createGroupChat,
                updateGroupDetails,
                updateGroupAvatar,
                addGroupMembers,
                removeGroupMember,
                promoteGroupAdmin,
                demoteGroupAdmin,
                leaveGroup,
                chats,
                users,
                setChats,
                soundEnabled,
                setSoundEnabled,
            }}
        >
            {children}
            <Toaster />
        </AppContext.Provider>
    );
};

export const useAppData = (): AppContextType => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error("useAppData must be used within AppProvider");
    }
    return context;
};
