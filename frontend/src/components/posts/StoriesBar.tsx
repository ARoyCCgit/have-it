"use client"

import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { Plus, User as UserIcon, Sparkles } from "lucide-react";
import { post_service, User } from "@/context/Appcontext";
import StoryViewerModal, { UserStoryGroup } from "./StoryViewerModal";
import CreateStoryModal from "./CreateStoryModal";

interface StoriesBarProps {
  loggedInUser: User | null;
}

export const StoriesBar: React.FC<StoriesBarProps> = ({ loggedInUser }) => {
  const [userStoryGroups, setUserStoryGroups] = useState<UserStoryGroup[]>([]);
  const [selectedUserIndex, setSelectedUserIndex] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchStories = useCallback(async () => {
    try {
      const token = Cookies.get("token");
      const { data } = await axios.get(`${post_service}/api/v1/stories/feed`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (data.success) {
        setUserStoryGroups(data.storiesFeed || []);
      }
    } catch {
      // Ignore if no stories yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const myGroup = userStoryGroups.find(
    (g) => g.author?._id === loggedInUser?._id
  );

  const otherGroups = userStoryGroups.filter(
    (g) => g.author?._id !== loggedInUser?._id
  );

  const myAvatarUrl =
    typeof loggedInUser?.avatar === "string"
      ? loggedInUser.avatar
      : loggedInUser?.avatar?.url || "";

  const openViewerForGroup = (indexInAll: number) => {
    setSelectedUserIndex(indexInAll);
    setIsViewerOpen(true);
  };

  return (
    <div className="bg-[#111b21] border border-gray-800 rounded-2xl p-3 mb-4 shadow-lg overflow-hidden">
      <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none select-none">
        {/* 1. "Your Story" Circle */}
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <div className="relative group cursor-pointer">
            <div
              onClick={() => {
                if (myGroup && myGroup.stories.length > 0) {
                  openViewerForGroup(0);
                } else {
                  setIsCreateStoryOpen(true);
                }
              }}
              className={`w-14 h-14 rounded-full p-[2px] transition-transform active:scale-95 flex items-center justify-center ${
                myGroup && myGroup.stories.length > 0
                  ? "bg-gradient-to-tr from-[#03cafc] to-cyan-300 shadow-md shadow-[#03cafc]/20"
                  : "bg-gray-800 border border-gray-700"
              }`}
            >
              <div className="w-full h-full rounded-full bg-[#111b21] p-[2px] overflow-hidden flex items-center justify-center">
                {myAvatarUrl ? (
                  <img
                    src={myAvatarUrl}
                    alt="Me"
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <UserIcon className="w-6 h-6 text-gray-400" />
                )}
              </div>
            </div>

            {/* Plus Icon Overlay to Add Story */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsCreateStoryOpen(true);
              }}
              className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[#03cafc] text-[#0b141a] rounded-full flex items-center justify-center shadow-md border-2 border-[#111b21] transition-transform hover:scale-115 active:scale-90 cursor-pointer"
              title="Add to story"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>

          <span className="text-[11px] font-semibold text-gray-300 truncate max-w-[64px] text-center">
            Your story
          </span>
        </div>

        {/* 2. Other Users' Story Circles */}
        {otherGroups.map((group, idx) => {
          const authorAvatar =
            typeof group.author?.avatar === "string"
              ? group.author.avatar
              : group.author?.avatar?.url || "";

          // Actual index in userStoryGroups
          const groupIndex = userStoryGroups.findIndex(
            (g) => g.author?._id === group.author?._id
          );

          return (
            <div
              key={group.author?._id || idx}
              onClick={() => openViewerForGroup(groupIndex)}
              className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
            >
              <div
                className={`w-14 h-14 rounded-full p-[2px] transition-transform active:scale-95 group-hover:scale-105 ${
                  group.hasUnseen
                    ? "bg-gradient-to-tr from-[#03cafc] via-cyan-400 to-sky-300 shadow-md shadow-[#03cafc]/30"
                    : "bg-gray-700/60"
                }`}
              >
                <div className="w-full h-full rounded-full bg-[#111b21] p-[2px] overflow-hidden flex items-center justify-center">
                  {authorAvatar ? (
                    <img
                      src={authorAvatar}
                      alt={group.author.name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <UserIcon className="w-6 h-6 text-gray-400" />
                  )}
                </div>
              </div>

              <span className="text-[11px] font-medium text-gray-300 truncate max-w-[64px] text-center group-hover:text-white transition-colors">
                {group.author.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Story Viewer Fullscreen Modal */}
      {isViewerOpen && (
        <StoryViewerModal
          isOpen={isViewerOpen}
          onClose={() => {
            setIsViewerOpen(false);
            fetchStories();
          }}
          userGroups={userStoryGroups}
          initialUserIndex={selectedUserIndex}
          loggedInUser={loggedInUser}
          onStoryDeleted={fetchStories}
        />
      )}

      {/* Create Story Dialog */}
      <CreateStoryModal
        isOpen={isCreateStoryOpen}
        onClose={() => setIsCreateStoryOpen(false)}
        onStoryCreated={fetchStories}
      />
    </div>
  );
};

export default StoriesBar;
