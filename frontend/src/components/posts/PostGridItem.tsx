"use client"

import React from "react";
import { Heart, MessageCircle, Copy, Film, Eye } from "lucide-react";
import type { PostData } from "./PostCard";

interface PostGridItemProps {
  post: PostData;
  onClick: (post: PostData) => void;
}

export const PostGridItem: React.FC<PostGridItemProps> = ({ post, onClick }) => {
  const firstMedia = post.media?.[0];
  const isVideo =
    firstMedia?.type === "video" ||
    Boolean(firstMedia?.url && /\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(firstMedia.url));
  const isCarousel = Boolean(post.media && post.media.length > 1);
  const isReel = post.type === "reel";

  // If thumbnail exists (e.g. Cloudinary video poster) use it; otherwise fallback to URL
  const displayUrl = firstMedia?.thumbnailUrl || firstMedia?.url || "";
  const [videoError, setVideoError] = React.useState(false);

  return (
    <div
      onClick={() => onClick(post)}
      className="relative aspect-square bg-[#111b21] rounded-xl overflow-hidden cursor-pointer group select-none border border-gray-800/80 shadow-md hover:border-[#03cafc]/50 transition-all"
    >
      {/* Media Thumbnail: If actual video without thumbnail and no error, render video preview; otherwise image */}
      {isVideo && !firstMedia?.thumbnailUrl && !videoError ? (
        <video
          src={`${displayUrl}#t=0.001`}
          preload="metadata"
          className="w-full h-full object-cover"
          muted
          playsInline
          onError={() => setVideoError(true)}
        />
      ) : (
        <img
          src={displayUrl}
          alt={post.caption || "Post"}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      )}

      {/* Top-Right Badge (Carousel or Reel or Video) */}
      <div className="absolute top-2 right-2 z-10 pointer-events-none drop-shadow-md text-white">
        {isCarousel ? (
          <div className="p-1 bg-black/60 backdrop-blur-sm rounded-md">
            <Copy className="w-3.5 h-3.5" />
          </div>
        ) : isReel || isVideo ? (
          <div className="p-1 bg-black/60 backdrop-blur-sm rounded-md">
            <Film className="w-3.5 h-3.5" />
          </div>
        ) : null}
      </div>

      {/* Hover Overlay with Engagement Metrics */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-5 text-white font-bold text-sm z-20">
        <div className="flex items-center gap-1.5 drop-shadow-md">
          <Heart className="w-4 h-4 fill-white text-white" />
          <span>{post.likesCount || 0}</span>
        </div>
        <div className="flex items-center gap-1.5 drop-shadow-md">
          <MessageCircle className="w-4 h-4 fill-white text-white" />
          <span>{post.commentsCount || 0}</span>
        </div>
      </div>
    </div>
  );
};

export default PostGridItem;
