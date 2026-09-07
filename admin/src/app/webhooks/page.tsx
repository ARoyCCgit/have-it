"use client"

import React, { useState, useEffect, useCallback } from "react";
import AdminGuard from "@/components/AdminGuard";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import {
  Webhook as WebhookIcon,
  KeyRound,
  Zap,
  Plus,
  Copy,
  Check,
  Trash2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Send,
  Code,
  ShieldCheck,
  Activity,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { TableSkeleton } from "@/components/Skeleton";
import { copyToClipboard } from "@/lib/clipboard";

interface ApiKeyItem {
  _id: string;
  name: string;
  prefix: string;
  permissions: string[];
  isActive: boolean;
  lastUsedAt?: string;
  createdAt: string;
}

interface WebhookItem {
  _id: string;
  name: string;
  targetUrl: string;
  secret: string;
  events: string[];
  isActive: boolean;
  failureCount: number;
  lastDeliveryStatus?: number;
  lastDeliveryAt?: string;
  lastDeliveryLatencyMs?: number;
  lastDeliveryResponse?: string;
  createdAt: string;
}

export default function WebhooksPage() {
  const [activeTab, setActiveTab] = useState<"keys" | "webhooks" | "docs">("keys");

  // API Keys state
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [isCreateKeyModalOpen, setIsCreateKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Webhooks state
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [loadingWebhooks, setLoadingWebhooks] = useState(true);
  const [isCreateWebhookModalOpen, setIsCreateWebhookModalOpen] = useState(false);
  const [webhookName, setWebhookName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["messages", "message_status"]);

  // Test Ping state
  const [testResult, setTestResult] = useState<{
    targetUrl: string;
    status: number;
    latencyMs: number;
    signatureSent: string;
    payload: object;
    responseBody: string;
  } | null>(null);
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);

  // 1. Fetch API Keys
  const fetchKeys = useCallback(async () => {
    setLoadingKeys(true);
    try {
      const { data } = await axios.get("/api/api-keys");
      if (data.success) {
        setKeys(data.keys);
      }
    } catch (err) {
      console.error("Failed to load API keys:", err);
      toast.error("Failed to load API keys");
    } finally {
      setLoadingKeys(false);
    }
  }, []);

  // 2. Fetch Webhooks
  const fetchWebhooks = useCallback(async () => {
    setLoadingWebhooks(true);
    try {
      const { data } = await axios.get("/api/webhooks");
      if (data.success) {
        setWebhooks(data.webhooks);
      }
    } catch (err) {
      console.error("Failed to load webhooks:", err);
      toast.error("Failed to load webhooks");
    } finally {
      setLoadingWebhooks(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
    fetchWebhooks();
  }, [fetchKeys, fetchWebhooks]);

  // Create API Key
  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setActionLoading(true);
    try {
      const { data } = await axios.post("/api/api-keys", {
        name: newKeyName.trim(),
        permissions: ["messages:send", "users:read", "webhooks"],
      });

      if (data.success) {
        setCreatedRawKey(data.rawKey);
        setKeys((prev) => [data.key, ...prev]);
        setNewKeyName("");
        toast.success("API Key generated successfully! 🔑");
      }
    } catch (err) {
      console.error("Failed to create key:", err);
      toast.error("Failed to create key");
    } finally {
      setActionLoading(false);
    }
  };

  // Revoke API Key
  const handleRevokeKey = async (keyId: string) => {
    if (!window.confirm("Are you sure you want to revoke and delete this API key? External integrations using this token will immediately fail.")) {
      return;
    }

    try {
      const { data } = await axios.delete(`/api/api-keys/${keyId}`);
      if (data.success) {
        setKeys((prev) => prev.filter((k) => k._id !== keyId));
        toast.success("API key revoked.");
      }
    } catch (err) {
      console.error("Failed to revoke key:", err);
      toast.error("Failed to revoke key");
    }
  };

  // Create Webhook
  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookName.trim() || !webhookUrl.trim()) return;

    setActionLoading(true);
    try {
      const { data } = await axios.post("/api/webhooks", {
        name: webhookName.trim(),
        targetUrl: webhookUrl.trim(),
        secret: webhookSecret.trim() || undefined,
        events: selectedEvents,
      });

      if (data.success) {
        setWebhooks((prev) => [data.webhook, ...prev]);
        setIsCreateWebhookModalOpen(false);
        setWebhookName("");
        setWebhookUrl("");
        setWebhookSecret("");
        toast.success("Webhook endpoint registered! ⚡");
      }
    } catch (err) {
      console.error("Failed to register webhook:", err);
      toast.error("Failed to register webhook");
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Webhook
  const handleDeleteWebhook = async (webhookId: string) => {
    if (!window.confirm("Are you sure you want to delete this webhook subscription?")) return;

    try {
      const { data } = await axios.delete(`/api/webhooks/${webhookId}`);
      if (data.success) {
        setWebhooks((prev) => prev.filter((w) => w._id !== webhookId));
        toast.success("Webhook subscription removed.");
      }
    } catch (err) {
      console.error("Failed to delete webhook:", err);
      toast.error("Failed to delete webhook");
    }
  };

  // Send Live Test Ping to Webhook
  const handleTestPing = async (webhookId: string) => {
    setTestingWebhookId(webhookId);
    setTestResult(null);

    try {
      const { data } = await axios.post(`/api/webhooks/${webhookId}/test`);
      if (data.success) {
        setTestResult(data);
        // Refresh webhook delivery metrics in list
        fetchWebhooks();
        if (data.delivered) {
          toast.success(`Webhook delivered! HTTP ${data.status} (${data.latencyMs}ms) 🚀`);
        } else {
          toast.error(`Delivery failed: HTTP ${data.status} (${data.latencyMs}ms)`);
        }
      }
    } catch (err) {
      console.error("Test ping error:", err);
      toast.error("Failed to dispatch test ping");
    } finally {
      setTestingWebhookId(null);
    }
  };

  return (
    <AdminGuard>
      <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden select-none">
        <AdminSidebar />
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <AdminHeader
            title="WhatsApp Cloud API & Webhooks Studio"
            description="Manage Bearer API access tokens, configure external webhook endpoints, and inspect real-time event signatures."
          />

          <main className="flex-1 overflow-y-auto p-6 space-y-6 custom-scroll">
            {/* Top Navigation Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("keys")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === "keys"
                      ? "bg-[#03cafc] text-slate-950 shadow-md shadow-[#03cafc]/20"
                      : "bg-slate-900 text-slate-400 hover:text-white"
                  }`}
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Bearer API Keys ({keys.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("webhooks")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === "webhooks"
                      ? "bg-[#03cafc] text-slate-950 shadow-md shadow-[#03cafc]/20"
                      : "bg-slate-900 text-slate-400 hover:text-white"
                  }`}
                >
                  <WebhookIcon className="w-4 h-4" />
                  <span>Webhook Subscriptions ({webhooks.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("docs")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === "docs"
                      ? "bg-[#03cafc] text-slate-950 shadow-md shadow-[#03cafc]/20"
                      : "bg-slate-900 text-slate-400 hover:text-white"
                  }`}
                >
                  <Code className="w-4 h-4" />
                  <span>Cloud API Docs & Sandbox</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {activeTab === "keys" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCreatedRawKey(null);
                      setIsCreateKeyModalOpen(true);
                    }}
                    className="px-4 py-2 bg-[#03cafc] hover:bg-[#029ecc] text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-[#03cafc]/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Generate API Key</span>
                  </button>
                ) : activeTab === "webhooks" ? (
                  <button
                    type="button"
                    onClick={() => setIsCreateWebhookModalOpen(true)}
                    className="px-4 py-2 bg-[#03cafc] hover:bg-[#029ecc] text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-[#03cafc]/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Subscribe Webhook</span>
                  </button>
                ) : null}
              </div>
            </div>

            {/* TAB 1: API KEYS */}
            {activeTab === "keys" && (
              <div className="space-y-4">
                <div className="rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-hidden">
                  <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#03cafc]" />
                      <h3 className="text-sm font-bold text-white">Active Enterprise Bearer Tokens</h3>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      SHA-256 Encrypted At Rest
                    </span>
                  </div>

                  {loadingKeys ? (
                    <div className="p-2">
                      <TableSkeleton rows={4} cols={5} />
                    </div>
                  ) : keys.length === 0 ? (
                    <div className="p-16 text-center text-slate-400 text-xs">
                      <KeyRound className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                      <h4 className="text-sm font-bold text-white">No Bearer API Keys Generated</h4>
                      <p className="text-slate-500 max-w-sm mx-auto mt-1">
                        Generate an API key to integrate external CRM systems, chatbot services, or automation bots with Have-it.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                          <tr>
                            <th className="py-3.5 px-4">Key Name</th>
                            <th className="py-3.5 px-4">Token Prefix</th>
                            <th className="py-3.5 px-4">Permissions</th>
                            <th className="py-3.5 px-4">Last Used</th>
                            <th className="py-3.5 px-4">Status</th>
                            <th className="py-3.5 px-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {keys.map((k) => (
                            <tr key={k._id} className="hover:bg-slate-800/40 transition-colors">
                              <td className="py-3.5 px-4 font-bold text-white">
                                {k.name}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-[#03cafc] font-semibold">
                                {k.prefix}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex flex-wrap gap-1">
                                  {k.permissions.map((p) => (
                                    <span
                                      key={p}
                                      className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]"
                                    >
                                      {p}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                                {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "Never"}
                              </td>
                              <td className="py-3.5 px-4">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    k.isActive
                                      ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/30"
                                      : "bg-rose-950/40 text-rose-400 border border-rose-500/30"
                                  }`}
                                >
                                  {k.isActive ? "Active" : "Revoked"}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRevokeKey(k._id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                                  title="Revoke and Delete Key"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: WEBHOOK SUBSCRIPTIONS */}
            {activeTab === "webhooks" && (
              <div className="space-y-6">
                <div className="rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-hidden">
                  <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <WebhookIcon className="w-4 h-4 text-[#03cafc]" />
                      <h3 className="text-sm font-bold text-white">Registered Webhook Subscriptions</h3>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      HMAC-SHA256 Signatures Enforced
                    </span>
                  </div>

                  {loadingWebhooks ? (
                    <div className="p-2">
                      <TableSkeleton rows={3} cols={4} />
                    </div>
                  ) : webhooks.length === 0 ? (
                    <div className="p-16 text-center text-slate-400 text-xs">
                      <WebhookIcon className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                      <h4 className="text-sm font-bold text-white">No Webhooks Registered</h4>
                      <p className="text-slate-500 max-w-sm mx-auto mt-1">
                        Register a webhook endpoint to receive real-time JSON events when messages, calls, or user presence changes occur.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800/60">
                      {webhooks.map((w) => (
                        <div key={w._id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors">
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-white">{w.name}</span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  w.isActive
                                    ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/30"
                                    : "bg-rose-950/40 text-rose-400 border border-rose-500/30"
                                }`}
                              >
                                {w.isActive ? "Listening" : "Inactive"}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-xs font-mono text-[#03cafc] truncate">
                              <ExternalLink className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span className="truncate">{w.targetUrl}</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <span className="text-[11px] text-slate-400">Events:</span>
                              {w.events.map((evt) => (
                                <span
                                  key={evt}
                                  className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700"
                                >
                                  {evt}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Delivery Health Telemetry & Action Buttons */}
                          <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                            {w.lastDeliveryStatus !== null && w.lastDeliveryStatus !== undefined && (
                              <div className="text-right font-mono text-[11px]">
                                <div className="flex items-center gap-1 justify-end font-bold">
                                  {w.lastDeliveryStatus >= 200 && w.lastDeliveryStatus < 300 ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                                  )}
                                  <span className={w.lastDeliveryStatus >= 200 && w.lastDeliveryStatus < 300 ? "text-emerald-400" : "text-rose-400"}>
                                    HTTP {w.lastDeliveryStatus}
                                  </span>
                                </div>
                                <span className="text-slate-500 text-[10px]">
                                  {w.lastDeliveryLatencyMs}ms latency
                                </span>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => handleTestPing(w._id)}
                              disabled={testingWebhookId === w._id}
                              className="px-3 py-1.5 rounded-xl bg-[#03cafc]/15 hover:bg-[#03cafc]/25 text-[#03cafc] border border-[#03cafc]/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {testingWebhookId === w._id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Send className="w-3.5 h-3.5" />
                              )}
                              <span>Send Test Ping</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteWebhook(w._id)}
                              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer"
                              title="Delete Webhook"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Live Test Dispatch Telemetry Card */}
                {testResult && (
                  <div className="p-6 rounded-3xl bg-slate-900 border border-[#03cafc]/30 shadow-2xl space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#03cafc]" />
                        <h4 className="text-sm font-bold text-white">Live Webhook Dispatch Inspector</h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                        testResult.status >= 200 && testResult.status < 300
                          ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-950/40 text-rose-400 border border-rose-500/30"
                      }`}>
                        HTTP {testResult.status} ({testResult.latencyMs}ms)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                      <div>
                        <span className="text-slate-400 font-bold block mb-1">Payload Sent (JSON):</span>
                        <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-300 overflow-x-auto custom-scroll text-[11px] max-h-48">
                          {JSON.stringify(testResult.payload, null, 2)}
                        </pre>
                      </div>

                      <div>
                        <span className="text-slate-400 font-bold block mb-1">Receiver Response:</span>
                        <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[#03cafc] overflow-x-auto custom-scroll text-[11px] max-h-48">
                          {testResult.responseBody || "Empty Response"}
                        </pre>
                        <div className="mt-2 text-[10px] text-slate-500 truncate">
                          <span className="font-bold text-slate-400">HMAC Header: </span>
                          <span>{testResult.signatureSent}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: CLOUD API DOCS & SANDBOX */}
            {activeTab === "docs" && (
              <div className="rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl p-6 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Code className="w-5 h-5 text-[#03cafc]" />
                    <span>WhatsApp Cloud API Standard Integration Guide</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Have-it provides 100% specification parity with the WhatsApp Cloud API standard. Send messages programmatically via standard REST endpoints.
                  </p>
                </div>

                {/* cURL Example */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-300">cURL Request Example:</span>
                  <div className="relative">
                    <pre className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-mono text-slate-200 overflow-x-auto custom-scroll">
{`curl -X POST "http://localhost:3001/api/cloud-api/v1/messages" \\
  -H "Authorization: Bearer haveit_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messaging_product": "haveit",
    "recipient_type": "individual",
    "to": "arnabroy466@gmail.com",
    "type": "text",
    "text": {
      "body": "Hello from external CRM integration! 🚀"
    }
  }'`}
                    </pre>
                  </div>
                </div>

                {/* Standard Response */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-300">Standard Response (200 OK):</span>
                  <pre className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-mono text-[#03cafc] overflow-x-auto custom-scroll">
{`{
  "messaging_product": "haveit",
  "contacts": [
    {
      "input": "arnabroy466@gmail.com",
      "wa_id": "6a85b030c6b07ecd7f880557"
    }
  ],
  "messages": [
    {
      "id": "wamid.4f8a19bc0182de47a82910c2...",
      "message_status": "accepted"
    }
  ]
}`}
                  </pre>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* Generate API Key Modal */}
        {isCreateKeyModalOpen && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-[#03cafc] flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Generate Cloud API Bearer Token</h3>
                  <p className="text-xs text-slate-400">Scoped credential for external integrations</p>
                </div>
              </div>

              {!createdRawKey ? (
                <form onSubmit={handleCreateKey} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Token Name / Client Description
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Shopify CRM Bot, Zendesk Integration..."
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-[#03cafc]"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsCreateKeyModalOpen(false)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-4 py-2 bg-[#03cafc] hover:bg-[#029ecc] text-slate-950 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                      <span>Generate Key</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-300/90 leading-relaxed">
                      Please copy your Bearer API Key now. For security purposes, this token will <strong>never be shown again</strong>.
                    </p>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={createdRawKey}
                      className="w-full pl-3 pr-20 py-2.5 bg-slate-950 border border-[#03cafc]/40 rounded-xl text-xs font-mono text-[#03cafc] select-all"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await copyToClipboard(createdRawKey);
                        if (ok) {
                          setCopiedKey(true);
                          setTimeout(() => setCopiedKey(false), 2000);
                          toast.success("API Key copied to clipboard!");
                        } else {
                          toast.error("Failed to copy API Key");
                        }
                      }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#03cafc] text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey ? "Copied" : "Copy"}</span>
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-800 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreateKeyModalOpen(false);
                        setCreatedRawKey(null);
                      }}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Subscribe Webhook Modal */}
        {isCreateWebhookModalOpen && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-[#03cafc] flex items-center justify-center">
                  <WebhookIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Subscribe Webhook Callback URL</h3>
                  <p className="text-xs text-slate-400">Receive real-time signed event dispatches</p>
                </div>
              </div>

              <form onSubmit={handleCreateWebhook} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Subscription Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Production Webhook Receiver"
                    value={webhookName}
                    onChange={(e) => setWebhookName(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-[#03cafc]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Callback Target URL (HTTPS Recommended)
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://your-api.com/webhooks/haveit"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-[#03cafc]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    HMAC Secret Key (Optional - Auto-generated if empty)
                  </label>
                  <input
                    type="text"
                    placeholder="Custom HMAC signing key"
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-[#03cafc]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-2">
                    Subscribed Events
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { id: "messages", label: "Incoming Messages" },
                      { id: "message_status", label: "Read & Delivered Status" },
                      { id: "calls", label: "VoIP Calls & WebRTC" },
                      { id: "user_status", label: "User Online Presence" },
                    ].map((evt) => (
                      <label
                        key={evt.id}
                        className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedEvents.includes(evt.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedEvents((prev) => [...prev, evt.id]);
                            } else {
                              setSelectedEvents((prev) => prev.filter((id) => id !== evt.id));
                            }
                          }}
                          className="rounded text-[#03cafc] accent-[#03cafc]"
                        />
                        <span className="text-slate-300 text-[11px]">{evt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsCreateWebhookModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-2 bg-[#03cafc] hover:bg-[#029ecc] text-slate-950 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <WebhookIcon className="w-3.5 h-3.5" />}
                    <span>Register Webhook</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
