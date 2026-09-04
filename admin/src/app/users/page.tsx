"use client"

import React, { useState, useEffect, useCallback } from "react";
import AdminGuard from "@/components/AdminGuard";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import {
  Users,
  Search,
  Ban,
  CheckCircle2,
  ShieldCheck,
  Filter,
  ShieldAlert,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Sparkles,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { TableSkeleton } from "@/components/Skeleton";

interface ManagedUser {
  _id: string;
  name: string;
  email: string;
  role: "user" | "admin" | "super_admin" | "moderator";
  isVerified?: boolean;
  isBanned?: boolean;
  bannedReason?: string;
  avatar?: { url?: string } | string;
  createdAt: string;
}

export default function UsersManagementPage() {
  const { adminUser } = useAdminAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Ban Modal state
  const [selectedUserForBan, setSelectedUserForBan] = useState<ManagedUser | null>(null);
  const [banReason, setBanReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/users", {
        params: {
          search,
          role: roleFilter,
          status: statusFilter,
          page,
          limit: 15,
        },
      });
      if (data.success) {
        setUsers(data.users);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.total || 0);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
      toast.error("Failed to load user directory");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  // Toggle Verification Checkmark
  const handleToggleVerify = async (user: ManagedUser) => {
    const nextVal = !user.isVerified;
    try {
      const { data } = await axios.put(`/api/users/${user._id}`, {
        action: "toggle_verify",
        isVerified: nextVal,
      });
      if (data.success) {
        setUsers((prev) =>
          prev.map((u) => (u._id === user._id ? { ...u, isVerified: nextVal } : u))
        );
        toast.success(
          nextVal
            ? `Official Cyan Checkmark granted to ${user.name}!`
            : `Verification checkmark removed for ${user.name}.`
        );
      }
    } catch (err) {
      console.error("Failed to toggle verification:", err);
      toast.error("Failed to update verification status");
    }
  };

  // Toggle Ban / Unban
  const handleConfirmBan = async () => {
    if (!selectedUserForBan) return;
    const isBanning = !selectedUserForBan.isBanned;

    setActionLoading(true);
    try {
      const { data } = await axios.put(`/api/users/${selectedUserForBan._id}`, {
        action: "toggle_ban",
        isBanned: isBanning,
        bannedReason: banReason || "Violation of Have-it Platform Guidelines",
      });
      if (data.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u._id === selectedUserForBan._id
              ? { ...u, isBanned: isBanning, bannedReason: banReason }
              : u
          )
        );
        toast.success(
          isBanning
            ? `Account [${selectedUserForBan.name}] has been banned and suspended.`
            : `Account [${selectedUserForBan.name}] has been unbanned and restored.`
        );
        setSelectedUserForBan(null);
        setBanReason("");
      }
    } catch (err) {
      console.error("Failed to update account ban status:", err);
      toast.error("Failed to update account ban status");
    } finally {
      setActionLoading(false);
    }
  };

  // Change Role (Promote/Demote)
  const handleChangeRole = async (user: ManagedUser, nextRole: string) => {
    if (user.role === nextRole) return;
    if (adminUser?.role !== "super_admin") {
      toast.error("Permission Denied: Only Super Admins can escalate or change roles.");
      return;
    }

    try {
      const { data } = await axios.put(`/api/users/${user._id}`, {
        action: "change_role",
        role: nextRole,
      });
      if (data.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u._id === user._id ? { ...u, role: nextRole as ManagedUser["role"] } : u
          )
        );
        toast.success(`Role for ${user.name} changed to ${nextRole.toUpperCase()}!`);
      }
    } catch (err) {
      console.error("Failed to change role:", err);
      toast.error("Failed to change user role");
    }
  };

  return (
    <AdminGuard>
      <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden select-none">
        <AdminSidebar />
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <AdminHeader
            title="User Directory & Identity Management"
            description="Manage registered user profiles, toggle verification checkmarks, and enforce account suspensions."
          />

          <main className="flex-1 overflow-y-auto p-6 space-y-6 custom-scroll">
            {/* Search and Filters Bar */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-96">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name, email, or user ID..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 focus:border-[#03cafc] rounded-xl text-xs text-white focus:outline-none transition-colors"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
                {/* Role Filter */}
                <select
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-semibold text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Roles</option>
                  <option value="user">Regular Users</option>
                  <option value="admin">Administrators</option>
                  <option value="super_admin">Super Admins</option>
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-semibold text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Accounts</option>
                  <option value="verified">Verified (Cyan Badge)</option>
                  <option value="banned">Suspended / Banned</option>
                  <option value="active">Active Accounts</option>
                </select>

                <button
                  type="button"
                  onClick={fetchUsers}
                  disabled={loading}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                  title="Refresh User Directory"
                >
                  <RefreshCw className={`w-4 h-4 text-[#03cafc] ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* Users Directory Table Card */}
            <div className="rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-hidden">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#03cafc]" />
                  <h3 className="text-sm font-bold text-white">Registered Users Directory</h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {totalCount} Total Registered
                </span>
              </div>

              {loading && users.length === 0 ? (
                <div className="p-2">
                  <TableSkeleton rows={8} cols={6} />
                </div>
              ) : users.length === 0 ? (
                <div className="p-16 text-center text-slate-400 text-xs">
                  <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="font-semibold text-white">No accounts match the specified criteria.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                      <tr>
                        <th className="py-3.5 px-4">User</th>
                        <th className="py-3.5 px-4">Email</th>
                        <th className="py-3.5 px-4">Role</th>
                        <th className="py-3.5 px-4">Verified</th>
                        <th className="py-3.5 px-4">Account Status</th>
                        <th className="py-3.5 px-4 text-right">Administrative Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {users.map((u) => {
                        const avatarUrl =
                          typeof u.avatar === "string"
                            ? u.avatar
                            : u.avatar?.url || "";

                        return (
                          <tr key={u._id} className="hover:bg-slate-800/40 transition-colors">
                            {/* User Avatar & Name */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-white overflow-hidden border border-slate-700 shrink-0">
                                  {avatarUrl ? (
                                    <img src={avatarUrl} alt={u.name} className="w-full h-full object-cover" />
                                  ) : (
                                    u.name?.slice(0, 1).toUpperCase() || "U"
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-white flex items-center gap-1.5 truncate">
                                    <span>{u.name}</span>
                                    {u.isVerified && (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-[#03cafc] fill-[#03cafc]/20 shrink-0" />
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-500 font-mono block truncate">
                                    ID: {u._id}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Email */}
                            <td className="py-3.5 px-4 font-mono text-slate-300 truncate max-w-xs">
                              {u.email}
                            </td>

                            {/* Role */}
                            <td className="py-3.5 px-4">
                              {adminUser?.role === "super_admin" && u._id !== adminUser._id ? (
                                <select
                                  value={u.role}
                                  onChange={(e) => handleChangeRole(u, e.target.value)}
                                  className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-[10px] font-bold text-[#03cafc] focus:outline-none cursor-pointer"
                                >
                                  <option value="user">USER</option>
                                  <option value="admin">ADMIN</option>
                                  <option value="super_admin">SUPER ADMIN</option>
                                </select>
                              ) : (
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                                    u.role === "super_admin"
                                      ? "bg-purple-950/40 text-purple-400 border-purple-500/30"
                                      : u.role === "admin"
                                      ? "bg-[#03cafc]/15 text-[#03cafc] border-[#03cafc]/30"
                                      : "bg-slate-800 text-slate-300 border-slate-700"
                                  }`}
                                >
                                  {u.role}
                                </span>
                              )}
                            </td>

                            {/* Verified Checkmark Toggle */}
                            <td className="py-3.5 px-4">
                              <button
                                type="button"
                                onClick={() => handleToggleVerify(u)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                                  u.isVerified
                                    ? "bg-[#03cafc]/15 border-[#03cafc]/40 text-[#03cafc] hover:bg-[#03cafc]/25"
                                    : "bg-slate-850 border-slate-700 text-slate-400 hover:text-slate-200"
                                }`}
                                title={u.isVerified ? "Revoke Verification" : "Grant Cyan Checkmark"}
                              >
                                <CheckCircle2 className={`w-3.5 h-3.5 ${u.isVerified ? "text-[#03cafc]" : "text-slate-500"}`} />
                                <span>{u.isVerified ? "Verified" : "Unverified"}</span>
                              </button>
                            </td>

                            {/* Account Status (Active / Banned) */}
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                  u.isBanned
                                    ? "bg-rose-950/40 text-rose-400 border-rose-500/30"
                                    : "bg-emerald-950/40 text-emerald-400 border-emerald-500/30"
                                }`}
                              >
                                {u.isBanned ? "Suspended" : "Active"}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right">
                              {u._id !== adminUser?._id && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedUserForBan(u)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ml-auto border ${
                                    u.isBanned
                                      ? "bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border-emerald-500/30"
                                      : "bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border-rose-500/30"
                                  }`}
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>{u.isBanned ? "Lift Ban" : "Ban Account"}</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination Footer */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Page {page} of {totalPages} ({totalCount} users)
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>

        {/* Ban / Suspension Confirmation Modal */}
        {selectedUserForBan && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-100">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  selectedUserForBan.isBanned ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                }`}>
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {selectedUserForBan.isBanned ? "Restore User Account" : "Suspend & Ban Account"}
                  </h3>
                  <p className="text-xs text-slate-400 truncate">
                    {selectedUserForBan.name} ({selectedUserForBan.email})
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                {selectedUserForBan.isBanned
                  ? "Are you sure you want to lift the suspension for this user? They will immediately regain access to messaging, posting, and login sessions."
                  : "Banning this user will immediately reject their authentication tokens, disconnect active WebSocket sessions, and prevent access across Have-it."}
              </p>

              {!selectedUserForBan.isBanned && (
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Administrative Reason for Suspension:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Inappropriate content, spam, terms violation..."
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-[#03cafc] resize-none"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedUserForBan(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBan}
                  disabled={actionLoading}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                    selectedUserForBan.isBanned
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                      : "bg-rose-600 hover:bg-rose-500 text-white"
                  }`}
                >
                  {actionLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>{selectedUserForBan.isBanned ? "Confirm Unban" : "Confirm Suspension"}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
