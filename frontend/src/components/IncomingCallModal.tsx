"use client"

import React from 'react';
import { useCall } from '@/context/CallContext';
import { Phone, PhoneOff, Video, User as UserIcon } from 'lucide-react';

export const IncomingCallModal: React.FC = () => {
  const { callStatus, callData, acceptCall, rejectCall } = useCall();

  if (callStatus !== 'incoming' || !callData) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-[#202c33] border border-gray-700/80 rounded-3xl w-full max-w-sm p-6 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
        {/* Caller Avatar with Pulsing Effect */}
        <div className="relative mb-5">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#03cafc] shadow-xl shadow-[#03cafc]/20 bg-[#111b21] flex items-center justify-center relative z-10">
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
          {/* Pulsing ring animation */}
          <div className="absolute inset-0 rounded-full bg-[#03cafc]/30 animate-ping" />
          <div className="absolute -inset-3 rounded-full bg-[#03cafc]/20 animate-pulse" />
        </div>

        {/* Caller Details */}
        <h3 className="text-xl font-bold text-white truncate max-w-[240px]">
          {callData.targetName}
        </h3>
        <div className="flex items-center gap-1.5 text-[#03cafc] text-xs font-semibold uppercase tracking-wider mt-1 mb-8">
          {callData.isVideo ? (
            <>
              <Video className="w-4 h-4" />
              <span>Incoming Have-it Video Call</span>
            </>
          ) : (
            <>
              <Phone className="w-4 h-4" />
              <span>Incoming Have-it Voice Call</span>
            </>
          )}
        </div>

        {/* Action Buttons: Decline (Red) & Accept (Cyan) */}
        <div className="flex items-center justify-center gap-12 w-full">
          {/* Decline Button */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={rejectCall}
              className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/50 flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
              title="Decline call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <span className="text-[11px] text-gray-400 font-medium">Decline</span>
          </div>

          {/* Accept Button */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={acceptCall}
              className="w-14 h-14 rounded-full bg-[#03cafc] hover:bg-[#029ecc] text-[#0b141a] shadow-lg shadow-[#03cafc]/30 flex items-center justify-center transition-transform active:scale-90 animate-bounce cursor-pointer font-bold"
              title="Accept call"
            >
              {callData.isVideo ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
            </button>
            <span className="text-[11px] text-[#03cafc] font-semibold">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
