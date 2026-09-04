"use client"

import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import {
  X,
  Send,
  Heart,
  CornerDownRight,
  Trash2,
  Smile,
  Loader2,
  User as UserIcon,
  MessageCircle,
} from "lucide-react";
import { post_service, User } from "@/context/Appcontext";
import {
  usePostSocket,
  NewCommentEvent,
  CommentDeletedEvent,
  CommentLikesUpdatedEvent,
} from "@/context/PostSocketContext";
import toast from "react-hot-toast";

export interface CommentItem {
  _id: string;
  post: string;
  author: {
    _id: string;
    name: string;
    email: string;
    avatar?: { url?: string } | string;
    about?: string;
  };
  text: string;
  parentComment?: string | null;
  likes: string[];
  likesCount: number;
  repliesCount: number;
  isLikedByMe?: boolean;
  replies?: CommentItem[];
  createdAt: string;
}

interface CommentsDrawerProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  loggedInUser: User | null;
  onCommentCountChange?: (newCount: number) => void;
}

const formatCommentTime = (isoString: string) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.floor(diffHours / 24)}d`;
};

const QUICK_EMOJIS = ["❤️", "🔥", "👏", "🙌", "😍", "😂"];

export const CommentsDrawer: React.FC<CommentsDrawerProps> = ({
  postId,
  isOpen,
  onClose,
  loggedInUser,
  onCommentCountChange,
}) => {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<{
    commentId: string;
    authorName: string;
  } | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const { joinPostRoom, leavePostRoom } = usePostSocket();

  // Join & leave post socket room
  useEffect(() => {
    if (isOpen && postId) {
      joinPostRoom(postId);
      return () => {
        leavePostRoom(postId);
      };
    }
  }, [isOpen, postId, joinPostRoom, leavePostRoom]);

  // Fetch comments on open
  const fetchComments = useCallback(async () => {
    if (!postId || !isOpen) return;
    setLoading(true);
    try {
      const token = Cookies.get("token");
      const { data } = await axios.get(`${post_service}/api/v1/posts/${postId}/comments`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (data.success) {
        setComments(data.comments || []);
      }
    } catch (err) {
      console.error("Failed to load comments:", err);
    } finally {
      setLoading(false);
    }
  }, [postId, isOpen]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Listen for live socket updates
  useEffect(() => {
    if (!isOpen || !postId) return;

    const handleNewComment = (e: Event) => {
      const customEvent = e as CustomEvent<NewCommentEvent>;
      const { postId: targetPostId, comment, commentsCount } = customEvent.detail;
      if (targetPostId !== postId || !comment) return;

      setComments((prev) => {
        // Prevent duplicate rendering
        const exists =
          prev.some((c) => c._id === comment._id) ||
          prev.some((c) => c.replies?.some((r) => r._id === comment._id));
        if (exists) return prev;

        if (comment.parentComment) {
          return prev.map((c) => {
            if (c._id === comment.parentComment) {
              const currentReplies = c.replies || [];
              return {
                ...c,
                repliesCount: (c.repliesCount || 0) + 1,
                replies: [...currentReplies, comment],
              };
            }
            return c;
          });
        } else {
          return [comment, ...prev];
        }
      });

      if (onCommentCountChange && typeof commentsCount === "number") {
        onCommentCountChange(commentsCount);
      }
    };

    const handleCommentDeleted = (e: Event) => {
      const customEvent = e as CustomEvent<CommentDeletedEvent>;
      const { postId: targetPostId, commentId, parentCommentId, commentsCount } = customEvent.detail;
      if (targetPostId !== postId) return;

      setComments((prev) => {
        if (parentCommentId) {
          return prev.map((c) => {
            if (c._id === parentCommentId) {
              return {
                ...c,
                repliesCount: Math.max(0, (c.repliesCount || 1) - 1),
                replies: c.replies?.filter((r) => r._id !== commentId) || [],
              };
            }
            return c;
          });
        }
        return prev.filter((c) => c._id !== commentId);
      });

      if (onCommentCountChange && typeof commentsCount === "number") {
        onCommentCountChange(commentsCount);
      }
    };

    const handleCommentLikesUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<CommentLikesUpdatedEvent>;
      const { postId: targetPostId, commentId, likesCount } = customEvent.detail;
      if (targetPostId !== postId) return;

      setComments((prev) =>
        prev.map((c) => {
          if (c._id === commentId) {
            return { ...c, likesCount };
          }
          if (c.replies) {
            const updatedReplies = c.replies.map((r) =>
              r._id === commentId ? { ...r, likesCount } : r
            );
            return { ...c, replies: updatedReplies };
          }
          return c;
        })
      );
    };

    window.addEventListener("haveit_new_comment", handleNewComment);
    window.addEventListener("haveit_comment_deleted", handleCommentDeleted);
    window.addEventListener("haveit_comment_likes_updated", handleCommentLikesUpdated);

    return () => {
      window.removeEventListener("haveit_new_comment", handleNewComment);
      window.removeEventListener("haveit_comment_deleted", handleCommentDeleted);
      window.removeEventListener("haveit_comment_likes_updated", handleCommentLikesUpdated);
    };
  }, [isOpen, postId, onCommentCountChange]);

  // Submit comment or reply
  const handleAddComment = async () => {
    if (!commentText.trim() || submitting) return;

    setSubmitting(true);
    try {
      const token = Cookies.get("token");
      const { data } = await axios.post(
        `${post_service}/api/v1/posts/${postId}/comments`,
        {
          text: commentText.trim(),
          parentCommentId: replyingTo?.commentId || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (data.success) {
        setCommentText("");
        setReplyingTo(null);
        fetchComments();
        if (onCommentCountChange && data.commentsCount !== undefined) {
          onCommentCountChange(data.commentsCount);
        }
        toast.success("Comment posted! 💬");
      }
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : "Failed to post comment";
      toast.error(msg || "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Like on Comment
  const handleToggleLikeComment = async (commentId: string) => {
    try {
      const token = Cookies.get("token");
      const { data } = await axios.put(
        `${post_service}/api/v1/posts/comments/${commentId}/like`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (data.success) {
        // Update local comment like state
        setComments((prev) =>
          prev.map((c) => {
            if (c._id === commentId) {
              return { ...c, isLikedByMe: data.isLiked, likesCount: data.likesCount };
            }
            if (c.replies) {
              const updatedReplies = c.replies.map((r) =>
                r._id === commentId
                  ? { ...r, isLikedByMe: data.isLiked, likesCount: data.likesCount }
                  : r
              );
              return { ...c, replies: updatedReplies };
            }
            return c;
          })
        );
      }
    } catch {
      toast.error("Failed to like comment");
    }
  };

  // Delete Comment
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Delete this comment?")) return;
    try {
      const token = Cookies.get("token");
      const { data } = await axios.delete(`${post_service}/api/v1/posts/comments/${commentId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (data.success) {
        toast.success("Comment deleted");
        fetchComments();
      }
    } catch {
      toast.error("Failed to delete comment");
    }
  };

  // Trigger reply mode
  const handleStartReply = (commentId: string, authorName: string) => {
    setReplyingTo({ commentId, authorName });
    setCommentText(`@${authorName} `);
    inputRef.current?.focus();
  };

  // Toggle accordion for nested replies
  const toggleRepliesAccordion = (commentId: string) => {
    setExpandedReplies((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-[#111b21] border border-gray-800 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[80vh] max-h-[700px] animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#202c33] border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#03cafc]" />
            <h3 className="text-sm font-bold text-white tracking-tight">Comments</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comments Feed List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin text-[#03cafc]" />
              <p className="text-xs">Loading comments...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="py-16 text-center text-gray-400 space-y-2">
              <MessageCircle className="w-10 h-10 text-gray-600 mx-auto" />
              <p className="text-xs font-semibold text-white">No comments yet</p>
              <p className="text-[11px] text-gray-400">Start the conversation!</p>
            </div>
          ) : (
            comments.map((comment) => {
              const authorAvatar =
                typeof comment.author?.avatar === "string"
                  ? comment.author.avatar
                  : comment.author?.avatar?.url || "";

              const isCommentOwner = loggedInUser?._id === comment.author?._id;
              const hasReplies = comment.replies && comment.replies.length > 0;
              const areRepliesExpanded = Boolean(expandedReplies[comment._id]);

              return (
                <div key={comment._id} className="space-y-2">
                  {/* Top Level Comment */}
                  <div className="flex items-start gap-3 group">
                    <div className="w-8 h-8 rounded-full bg-gray-800 overflow-hidden flex items-center justify-center shrink-0">
                      {authorAvatar ? (
                        <img src={authorAvatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-4 h-4 text-gray-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-bold text-white hover:text-[#03cafc] cursor-pointer">
                          {comment.author.name}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {formatCommentTime(comment.createdAt)}
                        </span>
                      </div>

                      <p className="text-xs text-gray-200 mt-0.5 leading-relaxed break-words">
                        {comment.text}
                      </p>

                      {/* Comment Actions */}
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
                        <button
                          onClick={() => handleStartReply(comment._id, comment.author.name)}
                          className="hover:text-white font-semibold cursor-pointer"
                        >
                          Reply
                        </button>

                        {isCommentOwner && (
                          <button
                            onClick={() => handleDeleteComment(comment._id)}
                            className="hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Like Comment */}
                    <button
                      onClick={() => handleToggleLikeComment(comment._id)}
                      className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-rose-500 cursor-pointer pt-1"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          comment.isLikedByMe ? "fill-rose-500 text-rose-500" : ""
                        }`}
                      />
                      {comment.likesCount > 0 && (
                        <span className="text-[10px]">{comment.likesCount}</span>
                      )}
                    </button>
                  </div>

                  {/* Replies Accordion Toggle */}
                  {hasReplies && (
                    <div className="pl-11">
                      <button
                        onClick={() => toggleRepliesAccordion(comment._id)}
                        className="text-[11px] font-semibold text-[#03cafc] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <CornerDownRight className="w-3 h-3" />
                        <span>
                          {areRepliesExpanded
                            ? "Hide replies"
                            : `View ${comment.replies!.length} ${
                                comment.replies!.length === 1 ? "reply" : "replies"
                              }`}
                        </span>
                      </button>

                      {/* Nested Replies Stream */}
                      {areRepliesExpanded && (
                        <div className="mt-2 space-y-2.5 pl-2 border-l border-gray-800">
                          {comment.replies!.map((reply) => {
                            const replyAvatar =
                              typeof reply.author?.avatar === "string"
                                ? reply.author.avatar
                                : reply.author?.avatar?.url || "";
                            const isReplyOwner = loggedInUser?._id === reply.author?._id;

                            return (
                              <div key={reply._id} className="flex items-start gap-2.5 group">
                                <div className="w-6 h-6 rounded-full bg-gray-800 overflow-hidden flex items-center justify-center shrink-0">
                                  {replyAvatar ? (
                                    <img
                                      src={replyAvatar}
                                      alt="Avatar"
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <UserIcon className="w-3 h-3 text-gray-400" />
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-baseline gap-1.5">
                                    <span className="text-xs font-bold text-white">
                                      {reply.author.name}
                                    </span>
                                    <span className="text-[10px] text-gray-500">
                                      {formatCommentTime(reply.createdAt)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-200 mt-0.5 leading-relaxed break-words">
                                    {reply.text}
                                  </p>

                                  <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                                    <button
                                      onClick={() =>
                                        handleStartReply(comment._id, reply.author.name)
                                      }
                                      className="hover:text-white font-semibold cursor-pointer"
                                    >
                                      Reply
                                    </button>
                                    {isReplyOwner && (
                                      <button
                                        onClick={() => handleDeleteComment(reply._id)}
                                        className="hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                        title="Delete"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <button
                                  onClick={() => handleToggleLikeComment(reply._id)}
                                  className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-rose-500 cursor-pointer pt-0.5"
                                >
                                  <Heart
                                    className={`w-3 h-3 ${
                                      reply.isLikedByMe ? "fill-rose-500 text-rose-500" : ""
                                    }`}
                                  />
                                  {reply.likesCount > 0 && (
                                    <span className="text-[9px]">{reply.likesCount}</span>
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Quick Emoji Bar & Composer Input */}
        <div className="p-3 bg-[#202c33] border-t border-gray-800 space-y-2">
          {/* Quick Emoji Bar */}
          <div className="flex items-center justify-between px-2">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setCommentText((prev) => prev + emoji)}
                className="text-lg hover:scale-125 transition-transform cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Replying Banner */}
          {replyingTo && (
            <div className="flex items-center justify-between text-xs text-gray-400 px-1">
              <span>
                Replying to <span className="text-[#03cafc] font-semibold">@{replyingTo.authorName}</span>
              </span>
              <button
                onClick={() => {
                  setReplyingTo(null);
                  setCommentText("");
                }}
                className="hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Input Box */}
          <div className="flex items-center gap-2 bg-[#111b21] rounded-2xl px-3.5 py-2 border border-gray-700/60 focus-within:border-[#03cafc] transition-colors">
            <input
              ref={inputRef}
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAddComment();
                }
              }}
              placeholder={replyingTo ? `Reply to ${replyingTo.authorName}...` : "Add a comment..."}
              className="flex-1 bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none"
            />

            <button
              onClick={handleAddComment}
              disabled={submitting || !commentText.trim()}
              className={`p-1.5 rounded-full transition-all cursor-pointer ${
                commentText.trim()
                  ? "bg-[#03cafc] text-[#0b141a] shadow-md shadow-[#03cafc]/30 active:scale-95"
                  : "text-gray-500 cursor-not-allowed opacity-50"
              }`}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentsDrawer;
