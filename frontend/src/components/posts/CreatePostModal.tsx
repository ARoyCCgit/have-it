"use client"

import React, { useState, useRef } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import {
  X,
  Image as ImageIcon,
  Film,
  Plus,
  MapPin,
  Sparkles,
  Loader2,
  Crop,
  Check,
} from "lucide-react";
import { post_service } from "@/context/Appcontext";
import toast from "react-hot-toast";
import type { PostData } from "./PostCard";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: (newPost: PostData) => void;
}

type AspectRatioOption = "1:1" | "4:5" | "16:9" | "9:16";

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onPostCreated,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>("1:1");
  const [isReel, setIsReel] = useState(false);
  const [isCommentsDisabled, setIsCommentsDisabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    if (selectedFiles.length + files.length > 10) {
      toast.error("You can upload a maximum of 10 media items");
      return;
    }

    const newFiles = [...selectedFiles, ...files];
    setSelectedFiles(newFiles);

    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls((prev) => [...prev, ...newPreviews]);

    // Check if single video uploaded -> auto suggest Reel or Video
    if (files.length === 1 && files[0]?.type.startsWith("video/")) {
      setAspectRatio("9:16");
      setIsReel(true);
    }
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previewUrls[index] || "");
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
    if (activePreviewIndex >= index && activePreviewIndex > 0) {
      setActivePreviewIndex((prev) => prev - 1);
    }
  };

  const handleCreatePost = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select at least 1 image or video");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Publishing your post to Have-it...");

    try {
      const token = Cookies.get("token");
      const formData = new FormData();

      selectedFiles.forEach((file) => {
        formData.append("media", file);
      });

      formData.append("caption", caption);
      formData.append("location", location);
      formData.append("aspectRatio", aspectRatio);
      formData.append("isCommentsDisabled", String(isCommentsDisabled));
      const hasVideo = selectedFiles.some((f) => f.type.startsWith("video/"));
      if (isReel && hasVideo) {
        formData.append("type", "reel");
      }

      const { data } = await axios.post(`${post_service}/api/v1/posts`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (data.success) {
        toast.success("Post published successfully! 🎉", { id: toastId });
        onPostCreated(data.post);
        // Reset state
        setSelectedFiles([]);
        setPreviewUrls([]);
        setCaption("");
        setLocation("");
        onClose();
      }
    } catch (err: unknown) {
      console.error("Failed to create post:", err);
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : "Failed to publish post";
      toast.error(msg || "Failed to publish post", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-[#111b21] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-[#202c33] border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#03cafc]/10 flex items-center justify-center text-[#03cafc]">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">Create New Post</h3>
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
          {/* Media Preview & Dropzone */}
          {selectedFiles.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-700 hover:border-[#03cafc] rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[#111b21]/60 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#202c33] flex items-center justify-center text-gray-400 group-hover:text-[#03cafc] group-hover:scale-105 transition-all mb-3 shadow-inner">
                <ImageIcon className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">Select photos and video reels</h4>
              <p className="text-xs text-gray-400 max-w-sm mb-4">
                Upload up to 10 images or videos for carousel slider or vertical Reels
              </p>
              <button
                type="button"
                className="px-4 py-2 bg-[#03cafc] hover:bg-[#029ecc] text-[#0b141a] font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
              >
                Choose from Device
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Main Media Viewer */}
              <div className="relative w-full aspect-square max-h-72 bg-black/60 rounded-xl overflow-hidden flex items-center justify-center border border-gray-800">
                {selectedFiles[activePreviewIndex]?.type.startsWith("video/") ? (
                  <video
                    src={previewUrls[activePreviewIndex]}
                    controls
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <img
                    src={previewUrls[activePreviewIndex]}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                )}

                {/* Aspect Ratio Floating Tag */}
                <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 backdrop-blur-md rounded-lg text-[11px] font-semibold text-[#03cafc] border border-white/10 flex items-center gap-1">
                  <Crop className="w-3 h-3" />
                  <span>{aspectRatio}</span>
                </div>
              </div>

              {/* Thumbnails Carousel Strip */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {previewUrls.map((url, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActivePreviewIndex(idx)}
                    className={`relative w-14 h-14 rounded-lg overflow-hidden shrink-0 cursor-pointer border-2 transition-all ${
                      activePreviewIndex === idx ? "border-[#03cafc] scale-105" : "border-gray-800 opacity-60"
                    }`}
                  >
                    {selectedFiles[idx]?.type.startsWith("video/") ? (
                      <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                        <Film className="w-5 h-5 text-gray-300" />
                      </div>
                    ) : (
                      <img src={url} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(idx);
                      }}
                      className="absolute top-0.5 right-0.5 p-0.5 bg-black/80 hover:bg-rose-600 text-white rounded-full transition-colors"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {selectedFiles.length < 10 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-14 h-14 rounded-lg border-2 border-dashed border-gray-700 hover:border-[#03cafc] flex items-center justify-center text-gray-400 hover:text-[#03cafc] shrink-0 transition-colors cursor-pointer"
                    title="Add More"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Aspect Ratio Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300">Aspect Ratio / Layout</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: "1:1", label: "1:1 Square" },
                { id: "4:5", label: "4:5 Portrait" },
                { id: "16:9", label: "16:9 Wide" },
                { id: "9:16", label: "9:16 Reel" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setAspectRatio(opt.id as AspectRatioOption);
                    const hasVideo = selectedFiles.some((f) => f.type.startsWith("video/"));
                    setIsReel(opt.id === "9:16" && hasVideo);
                  }}
                  className={`py-1.5 px-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                    aspectRatio === opt.id
                      ? "bg-[#03cafc]/20 border-[#03cafc] text-[#03cafc]"
                      : "bg-[#202c33] border-gray-800 text-gray-400 hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Caption Area */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300">Caption & Hashtags</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption... Type #hashtags (e.g. #haveit #tech)"
              rows={3}
              maxLength={2200}
              className="w-full bg-[#202c33] border border-gray-800 focus:border-[#03cafc] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none resize-none transition-colors"
            />
          </div>

          {/* Location Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300">Location (Optional)</label>
            <div className="relative flex items-center">
              <MapPin className="w-4 h-4 text-gray-500 absolute left-3" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Add location (e.g. San Francisco, CA)"
                className="w-full bg-[#202c33] border border-gray-800 focus:border-[#03cafc] rounded-xl pl-9 pr-3.5 py-2 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Disable Comments Toggle */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-gray-300 font-medium">Turn off commenting</span>
            <input
              type="checkbox"
              checked={isCommentsDisabled}
              onChange={(e) => setIsCommentsDisabled(e.target.checked)}
              className="w-4 h-4 accent-[#03cafc] rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Footer Actions */}
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
            disabled={loading || selectedFiles.length === 0}
            onClick={handleCreatePost}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer ${
              loading || selectedFiles.length === 0
                ? "bg-gray-700 text-gray-400 cursor-not-allowed opacity-50"
                : "bg-[#03cafc] hover:bg-[#029ecc] text-[#0b141a] active:scale-95 shadow-[#03cafc]/20"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Share Post</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePostModal;
