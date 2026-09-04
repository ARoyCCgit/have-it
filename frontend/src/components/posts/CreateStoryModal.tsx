"use client"

import React, { useState, useRef } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { X, Camera, Film, Sparkles, Loader2, Check, Clock } from "lucide-react";
import { post_service } from "@/context/Appcontext";
import toast from "react-hot-toast";

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated: () => void;
}

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({
  isOpen,
  onClose,
  onStoryCreated,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleCreateStory = async () => {
    if (!selectedFile) {
      toast.error("Please select a photo or video for your story");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Publishing 24-hour Story...");

    try {
      const token = Cookies.get("token");
      const formData = new FormData();
      formData.append("media", selectedFile);
      formData.append("caption", caption);

      const { data } = await axios.post(`${post_service}/api/v1/stories`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (data.success) {
        toast.success("Story shared for 24 hours! 🌟", { id: toastId });
        onStoryCreated();
        setSelectedFile(null);
        setPreviewUrl(null);
        setCaption("");
        onClose();
      }
    } catch (err: unknown) {
      console.error("Story creation error:", err);
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : "Failed to share story";
      toast.error(msg || "Failed to share story", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-[#111b21] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-[#202c33] border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#03cafc]/10 flex items-center justify-center text-[#03cafc]">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Add to Story</h3>
              <p className="text-[11px] text-gray-400">Disappears automatically in 24 hours</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!previewUrl ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-700 hover:border-[#03cafc] rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[#111b21]/60 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#202c33] flex items-center justify-center text-gray-400 group-hover:text-[#03cafc] group-hover:scale-105 transition-all mb-3 shadow-inner">
                <Camera className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">Select photo or video clip</h4>
              <p className="text-xs text-gray-400 max-w-xs mb-4">
                Share what you&apos;re doing right now with your Have-it connections
              </p>
              <button
                type="button"
                className="px-4 py-2 bg-[#03cafc] hover:bg-[#029ecc] text-[#0b141a] font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
              >
                Choose Media
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative w-full aspect-[9/16] max-h-80 bg-black rounded-xl overflow-hidden flex items-center justify-center border border-gray-800 mx-auto">
                {selectedFile?.type.startsWith("video/") ? (
                  <video src={previewUrl} controls className="w-full h-full object-cover" />
                ) : (
                  <img src={previewUrl} alt="Story preview" className="w-full h-full object-cover" />
                )}
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  className="absolute top-2 right-2 p-1 bg-black/70 hover:bg-rose-600 text-white rounded-full transition-colors cursor-pointer"
                  title="Change"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Caption */}
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add text to story (optional)..."
                maxLength={500}
                className="w-full bg-[#202c33] border border-gray-800 focus:border-[#03cafc] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors"
              />
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-[#202c33] border-t border-gray-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={loading || !selectedFile}
            onClick={handleCreateStory}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer ${
              loading || !selectedFile
                ? "bg-gray-700 text-gray-400 cursor-not-allowed opacity-50"
                : "bg-[#03cafc] hover:bg-[#029ecc] text-[#0b141a] active:scale-95 shadow-[#03cafc]/20"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sharing...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Share to Story</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateStoryModal;
