"use client"

import React, { useState, useEffect, useCallback } from "react";
import AdminGuard from "@/components/AdminGuard";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import {
  Megaphone,
  Send,
  Users,
  Radio,
  Bell,
  CheckCircle2,
  Sparkles,
  Link as LinkIcon,
  Image as ImageIcon,
  Loader2,
  History,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { TableSkeleton } from "@/components/Skeleton";

interface BroadcastRecord {
  _id: string;
  title: string;
  body: string;
  imageUrl?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  targetAudience: string;
  sentCount: number;
  createdAt: string;
}

export default function BroadcastPage() {
  const [broadcasts, setBroadcasts] = useState<BroadcastRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Form State
  const [title, setTitle] = useState("");
  const [textBody, setTextBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [buttonLabel, setButtonLabel] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [targetAudience, setTargetAudience] = useState<"all" | "active" | "admins">("all");
  const [sending, setSending] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const { data } = await axios.get("/api/broadcast");
      if (data.success) {
        setBroadcasts(data.broadcasts);
      }
    } catch (err) {
      console.error("Failed to load broadcast history:", err);
      toast.error("Failed to load broadcast history");
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !textBody.trim()) {
      toast.error("Please provide both title and body text");
      return;
    }

    if (!window.confirm(`Are you sure you want to dispatch this announcement to target audience: "${targetAudience.toUpperCase()}"? It will be delivered directly from the official Have-it Team.`)) {
      return;
    }

    setSending(true);
    try {
      const { data } = await axios.post("/api/broadcast", {
        title: title.trim(),
        textBody: textBody.trim(),
        imageUrl: imageUrl.trim() || undefined,
        buttonLabel: buttonLabel.trim() || undefined,
        buttonUrl: buttonUrl.trim() || undefined,
        targetAudience,
      });

      if (data.success) {
        toast.success(data.message || "Broadcast dispatched successfully! 📢");
        setTitle("");
        setTextBody("");
        setImageUrl("");
        setButtonLabel("");
        setButtonUrl("");
        fetchHistory();
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || "Failed to send broadcast");
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminGuard>
      <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden select-none">
        <AdminSidebar />
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <AdminHeader
            title="Mass Broadcast & System Announcements"
            description="Broadcast platform alerts, maintenance notices, and news to all Have-it users simultaneously from the verified Have-it Team channel."
          />

          <main className="flex-1 overflow-y-auto p-6 space-y-6 custom-scroll">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Announcement Composer (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <form
                  onSubmit={handleSendBroadcast}
                  className="rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl p-6 space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#03cafc]/15 text-[#03cafc] flex items-center justify-center">
                        <Megaphone className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Compose Platform Announcement</h3>
                        <span className="text-[10px] text-slate-400">Delivered via official &quot;Have-it Team&quot; verified channel</span>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full bg-[#03cafc]/15 text-[#03cafc] text-[10px] font-bold uppercase border border-[#03cafc]/30">
                      Direct Chat Ingestion
                    </span>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Announcement Title
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Have-it v2.0 Released: Dark Mode, Calling & Reels!"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-[#03cafc]"
                    />
                  </div>

                  {/* Body Text */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Message Content (Markdown supported)
                    </label>
                    <textarea
                      rows={5}
                      required
                      placeholder="Write your announcement details here..."
                      value={textBody}
                      onChange={(e) => setTextBody(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-[#03cafc] resize-none"
                    />
                  </div>

                  {/* Media Banner URL (Optional) */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                      <span>Banner Image URL (Optional)</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://your-domain.com/banner.png"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-[#03cafc]"
                    />
                  </div>

                  {/* Action Button Link (Optional) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        Button Label (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Try Features Now"
                        value={buttonLabel}
                        onChange={(e) => setButtonLabel(e.target.value)}
                        className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-[#03cafc]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1.5">
                        <LinkIcon className="w-3.5 h-3.5 text-slate-500" />
                        <span>Button Link URL</span>
                      </label>
                      <input
                        type="url"
                        placeholder="https://haveit.com/features"
                        value={buttonUrl}
                        onChange={(e) => setButtonUrl(e.target.value)}
                        className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-[#03cafc]"
                      />
                    </div>
                  </div>

                  {/* Target Audience */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span>Target Audience</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {[
                        { id: "all", label: "All Users" },
                        { id: "active", label: "Active (7 Days)" },
                        { id: "admins", label: "Admins Only" },
                      ].map((aud) => (
                        <button
                          key={aud.id}
                          type="button"
                          onClick={() => setTargetAudience(aud.id as typeof targetAudience)}
                          className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                            targetAudience === aud.id
                              ? "bg-[#03cafc] text-slate-950 font-bold border-[#03cafc] shadow-md shadow-[#03cafc]/20"
                              : "bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-600"
                          }`}
                        >
                          {aud.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={sending}
                      className="w-full py-3 bg-[#03cafc] hover:bg-[#029ecc] text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-[#03cafc]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {sending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Radio className="w-4 h-4" />
                          <span>Dispatch Global Broadcast</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Column: Live Chat Card Preview (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl p-5 space-y-3">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                    <Sparkles className="w-4 h-4 text-[#03cafc]" />
                    <h3 className="text-sm font-bold text-white">Live User Viewport Preview</h3>
                  </div>

                  {/* Mock WhatsApp Chat Message Preview */}
                  <div className="preview-dark-canvas p-4 rounded-2xl bg-[#0b141a] border border-slate-800 space-y-3">
                    {/* Header in Chat */}
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#111b21] border border-[#03cafc]/40 flex items-center justify-center overflow-hidden p-0.5 shadow-sm">
                        <img src="/icon.svg" alt="Have-it Logo" className="w-full h-full object-contain" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-white">Have-it Team</span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#03cafc] fill-[#03cafc]/20" />
                        </div>
                        <span className="text-[10px] text-slate-400">Official Channel</span>
                      </div>
                    </div>

                    {/* Announcement Bubble Card */}
                    <div className="p-3 rounded-2xl bg-[#202c33] border border-slate-700/60 text-slate-200 text-xs space-y-2.5 shadow-lg">
                      {imageUrl && (
                        <div className="rounded-xl overflow-hidden aspect-video bg-black/40">
                          <img src={imageUrl} alt="Banner" className="w-full h-full object-cover" />
                        </div>
                      )}

                      <div>
                        <span className="font-extrabold text-sm text-[#03cafc] block mb-1">
                          {title || "Your Announcement Title"}
                        </span>
                        <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                          {textBody || "Your message body content will render here for users..."}
                        </p>
                      </div>

                      {buttonUrl && (
                        <div className="pt-2 border-t border-slate-700/60">
                          <div className="py-2 px-3 rounded-xl bg-[#03cafc]/20 hover:bg-[#03cafc]/30 text-[#03cafc] font-bold text-xs text-center border border-[#03cafc]/40 cursor-pointer">
                            {buttonLabel || "View Details"} ↗
                          </div>
                        </div>
                      )}

                      <div className="text-[10px] text-slate-400 text-right">
                        Just now • Official
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Past Broadcast History */}
            <div className="rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-hidden">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-[#03cafc]" />
                  <h3 className="text-sm font-bold text-white">Broadcast Transmission History</h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {broadcasts.length} Sent
                </span>
              </div>

              {loadingHistory ? (
                <div className="p-2">
                  <TableSkeleton rows={4} cols={3} />
                </div>
              ) : broadcasts.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  <Megaphone className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="font-semibold text-white">No broadcasts sent yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/60">
                  {broadcasts.map((b) => (
                    <div key={b._id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors">
                      <div className="min-w-0 space-y-1">
                        <span className="font-bold text-xs text-white block truncate">{b.title}</span>
                        <p className="text-[11px] text-slate-400 line-clamp-1">{b.body}</p>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
                          <span>Audience: <strong className="text-slate-300 uppercase">{b.targetAudience}</strong></span>
                          <span>Delivered: <strong className="text-emerald-400">{b.sentCount} users</strong></span>
                        </div>
                      </div>

                      <div className="text-right text-[11px] text-slate-500 font-mono shrink-0">
                        {new Date(b.createdAt).toLocaleDateString()} at {new Date(b.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}
