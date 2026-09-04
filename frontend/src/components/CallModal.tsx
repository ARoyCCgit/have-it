"use client"

import React, { useEffect, useRef, useState } from 'react';
import { useCall } from '@/context/CallContext';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  ScreenShare,
  Minimize2,
  Maximize2,
  User as UserIcon,
  ShieldCheck,
} from 'lucide-react';

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export const CallModal: React.FC = () => {
  const {
    callStatus,
    callData,
    localStream,
    remoteStream,
    isMicMuted,
    isCameraOff,
    isScreenSharing,
    callDuration,
    endCall,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
  } = useCall();

  const [isMinimized, setIsMinimized] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isCameraOff, isScreenSharing]);

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callStatus]);

  if (callStatus !== 'calling' && callStatus !== 'connected') {
    return null;
  }

  if (!callData) return null;

  // Floating Minimized PIP View
  if (isMinimized) {
    return (
      <div
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 z-50 bg-[#202c33] border-2 border-[#03cafc] rounded-2xl shadow-2xl shadow-[#03cafc]/20 p-3 flex items-center gap-3 cursor-pointer hover:scale-105 transition-all animate-in fade-in select-none"
      >
        <div className="w-10 h-10 rounded-full bg-[#111b21] flex items-center justify-center overflow-hidden border border-[#03cafc]/60">
          {callData.targetAvatar ? (
            <img src={callData.targetAvatar} alt={callData.targetName} className="w-full h-full object-cover" />
          ) : (
            <UserIcon className="w-5 h-5 text-gray-300" />
          )}
        </div>
        <div>
          <span className="text-xs font-semibold text-white block truncate max-w-[120px]">
            {callData.targetName}
          </span>
          <span className="text-[10px] text-[#03cafc] font-mono block">
            {callStatus === 'calling' ? 'Ringing...' : formatDuration(callDuration)}
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            endCall();
          }}
          className="p-2 bg-rose-600 hover:bg-rose-500 rounded-full text-white ml-2 cursor-pointer"
        >
          <PhoneOff className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#111b21]/95 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 select-none animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="w-full max-w-4xl flex items-center justify-between z-20">
        <div className="flex items-center gap-2 text-gray-300 text-xs bg-[#202c33]/80 px-3 py-1.5 rounded-full border border-gray-700/60 shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-[#03cafc]" />
          <span>End-to-End Encrypted</span>
        </div>

        <button
          type="button"
          onClick={() => setIsMinimized(true)}
          className="p-2 bg-[#202c33]/80 hover:bg-[#202c33] text-gray-300 hover:text-white rounded-full border border-gray-700/60 shadow-sm transition-colors cursor-pointer"
          title="Minimize call window"
        >
          <Minimize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Center Call Canvas */}
      <div className="w-full max-w-4xl flex-1 flex flex-col items-center justify-center relative my-4 rounded-3xl overflow-hidden bg-[#182229] border border-gray-800 shadow-2xl">
        {callData.isVideo ? (
          /* VIDEO CALL LAYOUT */
          <div className="w-full h-full relative flex items-center justify-center">
            {/* Remote Video Stream or Avatar fallback */}
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover rounded-3xl"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-[#03cafc]/60 bg-gray-700 flex items-center justify-center shadow-2xl shadow-[#03cafc]/20">
                  {callData.targetAvatar ? (
                    <img
                      src={callData.targetAvatar}
                      alt={callData.targetName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserIcon className="w-12 h-12 text-gray-300" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{callData.targetName}</h2>
                  <p className="text-xs text-[#03cafc] mt-1 font-semibold tracking-wide uppercase">
                    {callStatus === 'calling' ? 'Ringing...' : 'Connecting video stream...'}
                  </p>
                </div>
              </div>
            )}

            {/* Local Video Stream (PIP Corner Thumbnail) */}
            <div className="absolute bottom-4 right-4 w-32 sm:w-44 aspect-video rounded-2xl overflow-hidden bg-black/70 border-2 border-[#03cafc] shadow-2xl z-20">
              {isCameraOff && !isScreenSharing ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#202c33] text-gray-400 text-[10px]">
                  <VideoOff className="w-5 h-5 mb-1 text-gray-500" />
                  <span>Camera off</span>
                </div>
              ) : (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              )}
            </div>
          </div>
        ) : (
          /* VOICE CALL LAYOUT */
          <div className="flex flex-col items-center justify-center text-center p-6 space-y-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#03cafc] bg-gray-700 flex items-center justify-center shadow-2xl relative z-10">
                {callData.targetAvatar ? (
                  <img
                    src={callData.targetAvatar}
                    alt={callData.targetName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-16 h-16 text-gray-300" />
                )}
              </div>
              {callStatus === 'calling' && (
                <div className="absolute inset-0 rounded-full bg-[#03cafc]/30 animate-ping" />
              )}
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white">{callData.targetName}</h2>
              <div className="text-sm font-mono text-[#03cafc] mt-1.5 font-semibold">
                {callStatus === 'calling' ? 'Ringing...' : formatDuration(callDuration)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Floating Have-it Control Bar */}
      <div className="bg-[#202c33]/90 border border-gray-700/80 rounded-full px-6 py-3 shadow-2xl flex items-center gap-4 sm:gap-6 z-20 animate-in slide-in-from-bottom duration-200">
        {/* Toggle Mic */}
        <button
          type="button"
          onClick={toggleMic}
          className={`p-3.5 rounded-full transition-all cursor-pointer shadow-md ${
            isMicMuted
              ? 'bg-rose-600 hover:bg-rose-500 text-white'
              : 'bg-[#111b21] hover:bg-gray-700/70 text-gray-200 hover:text-white'
          }`}
          title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Toggle Camera (If Video Call) */}
        {callData.isVideo && (
          <button
            type="button"
            onClick={toggleCamera}
            className={`p-3.5 rounded-full transition-all cursor-pointer shadow-md ${
              isCameraOff
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-[#111b21] hover:bg-gray-700/70 text-gray-200 hover:text-white'
            }`}
            title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
          >
            {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>
        )}

        {/* Toggle Screen Sharing (If Video Call) */}
        {callData.isVideo && (
          <button
            type="button"
            onClick={toggleScreenShare}
            className={`p-3.5 rounded-full transition-all cursor-pointer shadow-md ${
              isScreenSharing
                ? 'bg-[#03cafc] text-[#0b141a] font-bold shadow-md shadow-[#03cafc]/20'
                : 'bg-[#111b21] hover:bg-gray-700/70 text-gray-200 hover:text-white'
            }`}
            title={isScreenSharing ? 'Stop screen share' : 'Share screen'}
          >
            <ScreenShare className="w-5 h-5" />
          </button>
        )}

        {/* End Call Button */}
        <button
          type="button"
          onClick={endCall}
          className="p-3.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/60 active:scale-95 transition-all cursor-pointer"
          title="End call"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default CallModal;
