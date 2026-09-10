"use client"

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { User, useAppData } from './Appcontext';
import { useSocket } from './SocketContext';
import {
  startOutgoingRingtone,
  startIncomingRingtone,
  stopRingtone,
  playCallEndTone,
} from '@/utils/sound';
import toast from 'react-hot-toast';

export type CallStatus = 'idle' | 'calling' | 'incoming' | 'connected' | 'ended';

export interface CallLog {
  id: string;
  targetUserId: string;
  targetName: string;
  targetAvatar?: string;
  isVideo: boolean;
  isCaller: boolean;
  status: 'completed' | 'missed' | 'declined';
  duration: number;
  timestamp: string;
}

export interface CallData {
  targetUserId: string;
  targetName: string;
  targetAvatar?: string;
  isVideo: boolean;
  isCaller: boolean;
  fromSocketId?: string;
  signalData?: RTCSessionDescriptionInit;
}

interface CallContextType {
  callStatus: CallStatus;
  callData: CallData | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMicMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  callDuration: number;
  callLogs: CallLog[];
  startCall: (targetUser: User, isVideo: boolean) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMic: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => Promise<void>;
  clearCallLogs: () => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.services.mozilla.com' },
  ],
  iceCandidatePoolSize: 10,
};

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: loggedInUser } = useAppData();
  const { socket } = useSocket();

  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [callData, setCallData] = useState<CallData | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const disconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Refs to prevent stale closure issues in callbacks
  const callDataRef = useRef<CallData | null>(null);
  const callDurationRef = useRef<number>(0);
  const callStatusRef = useRef<CallStatus>('idle');

  useEffect(() => {
    callDataRef.current = callData;
  }, [callData]);

  useEffect(() => {
    callDurationRef.current = callDuration;
  }, [callDuration]);

  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  // Load call history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('haveit_call_history') || localStorage.getItem('whatsapp_call_history');
      if (saved) {
        setCallLogs(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const recordCallLog = useCallback(
    (status: 'completed' | 'missed' | 'declined', duration = 0) => {
      const currentCallData = callDataRef.current;
      if (!currentCallData) return;

      const logEntry: CallLog = {
        id: `call-${Date.now()}`,
        targetUserId: currentCallData.targetUserId,
        targetName: currentCallData.targetName,
        targetAvatar: currentCallData.targetAvatar,
        isVideo: currentCallData.isVideo,
        isCaller: currentCallData.isCaller,
        status,
        duration: duration || callDurationRef.current,
        timestamp: new Date().toISOString(),
      };

      console.log('📝 Recording call log entry:', logEntry);

      setCallLogs((prev) => {
        const next = [logEntry, ...prev.slice(0, 49)];
        localStorage.setItem('haveit_call_history', JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const clearCallLogs = () => {
    localStorage.removeItem('haveit_call_history');
    localStorage.removeItem('whatsapp_call_history');
    setCallLogs([]);
  };

  // Keep localStreamRef synchronized
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Clean up streams & peer connection
  const cleanupCall = useCallback(
    (explicitStatus?: 'completed' | 'missed' | 'declined') => {
      stopRingtone();

      if (disconnectTimeoutRef.current) {
        clearTimeout(disconnectTimeoutRef.current);
        disconnectTimeoutRef.current = null;
      }

      const currentStatus = callStatusRef.current;
      const duration = callDurationRef.current;
      const statusToRecord =
        explicitStatus || (currentStatus === 'connected' ? 'completed' : 'missed');

      if (callDataRef.current) {
        recordCallLog(statusToRecord, duration);
      }

      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }

      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }

      if (peerConnectionRef.current) {
        peerConnectionRef.current.ontrack = null;
        peerConnectionRef.current.onicecandidate = null;
        peerConnectionRef.current.onconnectionstatechange = null;
        peerConnectionRef.current.oniceconnectionstatechange = null;
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      pendingIceCandidatesRef.current = [];
      setLocalStream(null);
      setRemoteStream(null);
      setCallStatus('idle');
      setCallData(null);
      setIsMicMuted(false);
      setIsCameraOff(false);
      setIsScreenSharing(false);
      setCallDuration(0);
    },
    [recordCallLog]
  );

  // Initialize WebRTC Peer Connection
  const createPeerConnection = (targetUserId: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice_candidate', {
          to: targetUserId,
          from: loggedInUser?._id,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('🎥 Received remote media track:', event.track.kind, event.streams);
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      } else {
        setRemoteStream((prevStream) => {
          const stream = prevStream ? new MediaStream(prevStream.getTracks()) : new MediaStream();
          const existing = stream.getTracks().filter((t) => t.kind === event.track.kind);
          existing.forEach((t) => stream.removeTrack(t));
          stream.addTrack(event.track);
          return stream;
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('🔄 Peer connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        if (disconnectTimeoutRef.current) {
          clearTimeout(disconnectTimeoutRef.current);
          disconnectTimeoutRef.current = null;
        }
      } else if (pc.connectionState === 'disconnected') {
        // Do not terminate immediately — allow WebRTC 7 seconds to recover/renegotiate candidate pair
        if (!disconnectTimeoutRef.current) {
          disconnectTimeoutRef.current = setTimeout(() => {
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
              console.warn('⚠️ Peer connection timed out in disconnected state');
              playCallEndTone();
              cleanupCall();
            }
          }, 7000);
        }
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        if (disconnectTimeoutRef.current) {
          clearTimeout(disconnectTimeoutRef.current);
          disconnectTimeoutRef.current = null;
        }
        playCallEndTone();
        cleanupCall();
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('❄️ ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        if (disconnectTimeoutRef.current) {
          clearTimeout(disconnectTimeoutRef.current);
          disconnectTimeoutRef.current = null;
        }
      }
    };

    return pc;
  };

  // Start Call (Caller)
  const startCall = async (targetUser: User, isVideo: boolean) => {
    if (!loggedInUser || !socket) {
      toast.error('Cannot initiate call. Please check your connection.');
      return;
    }

    try {
      cleanupCall();
      startOutgoingRingtone();

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: isVideo ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
        });
      } catch (mediaErr) {
        console.warn('High-res media request failed, retrying with basic constraints:', mediaErr);
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: isVideo ? true : false,
        });
      }

      setLocalStream(stream);
      localStreamRef.current = stream;

      const pc = createPeerConnection(targetUser._id);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideo,
      });
      await pc.setLocalDescription(offer);

      const targetAvatarUrl =
        typeof targetUser.avatar === 'string'
          ? targetUser.avatar
          : targetUser.avatar?.url || '';

      const myAvatarUrl =
        typeof loggedInUser.avatar === 'string'
          ? loggedInUser.avatar
          : loggedInUser.avatar?.url || '';

      const callInfo: CallData = {
        targetUserId: targetUser._id,
        targetName: targetUser.name,
        targetAvatar: targetAvatarUrl,
        isVideo,
        isCaller: true,
      };

      setCallData(callInfo);
      setCallStatus('calling');

      socket.emit('call_user', {
        userToCall: targetUser._id,
        from: loggedInUser._id,
        name: loggedInUser.name,
        avatar: myAvatarUrl,
        isVideo,
        signalData: offer,
      });
    } catch (err) {
      console.error('Error starting call:', err);
      stopRingtone();
      cleanupCall();
      toast.error('Could not access microphone or camera. Please check permissions.');
    }
  };

  // Accept Incoming Call (Receiver)
  const acceptCall = async () => {
    if (!callData || !callData.signalData || !socket) return;

    try {
      stopRingtone();

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: callData.isVideo
            ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
            : false,
        });
      } catch (mediaErr) {
        console.warn('High-res media request failed, retrying with basic constraints:', mediaErr);
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callData.isVideo ? true : false,
        });
      }

      setLocalStream(stream);
      localStreamRef.current = stream;

      const pc = createPeerConnection(callData.targetUserId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(callData.signalData));

      // Process any pending ICE candidates
      while (pendingIceCandidatesRef.current.length > 0) {
        const candidate = pendingIceCandidatesRef.current.shift();
        if (candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.error('Error flushing ICE candidate:', e);
          }
        }
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('call_accepted', {
        to: callData.targetUserId,
        from: loggedInUser?._id,
        signal: answer,
      });

      setCallStatus('connected');
      setCallDuration(0);
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accepting call:', err);
      playCallEndTone();
      cleanupCall();
      toast.error('Failed to establish call connection. Please verify device permissions.');
    }
  };

  // Reject Incoming Call
  const rejectCall = () => {
    if (callData && socket) {
      socket.emit('call_rejected', {
        to: callData.targetUserId,
        from: loggedInUser?._id,
        reason: 'Call declined',
      });
    }
    playCallEndTone();
    cleanupCall('declined');
  };

  // End Active Call
  const endCall = () => {
    if (callData && socket) {
      socket.emit('end_call', {
        to: callData.targetUserId,
        from: loggedInUser?._id,
      });
    }
    playCallEndTone();
    cleanupCall(callStatus === 'connected' ? 'completed' : 'missed');
  };

  // Toggle Microphone Mute
  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle Camera
  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  };

  // Toggle Screen Share
  const toggleScreenShare = async () => {
    if (!peerConnectionRef.current || !localStreamRef.current) return;

    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;

        const sender = peerConnectionRef.current
          .getSenders()
          .find((s) => s.track && s.track.kind === 'video');

        if (sender) {
          sender.replaceTrack(screenTrack);
        }

        screenTrack.onended = () => {
          stopScreenSharing();
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.error('Screen sharing error:', err);
      }
    } else {
      stopScreenSharing();
    }
  };

  const stopScreenSharing = () => {
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }

    if (localStreamRef.current && peerConnectionRef.current) {
      const cameraTrack = localStreamRef.current.getVideoTracks()[0];
      const sender = peerConnectionRef.current
        .getSenders()
        .find((s) => s.track && s.track.kind === 'video');

      if (sender && cameraTrack) {
        sender.replaceTrack(cameraTrack);
      }
    }

    setIsScreenSharing(false);
  };

  // Listen to Socket Call Events
  useEffect(() => {
    if (!socket) return;

    // Incoming Call Received
    const handleCallIncoming = ({
      from,
      name,
      avatar,
      isVideo,
      signalData,
    }: {
      from: string;
      name: string;
      avatar?: string;
      isVideo: boolean;
      signalData: RTCSessionDescriptionInit;
    }) => {
      console.log(`📞 Incoming call from ${name} (${from}). Video: ${isVideo}`);
      if (callStatusRef.current !== 'idle') {
        socket.emit('call_rejected', { to: from, from: loggedInUser?._id, reason: 'User is busy in another call' });
        return;
      }

      setCallData({
        targetUserId: from,
        targetName: name,
        targetAvatar: avatar,
        isVideo,
        isCaller: false,
        signalData,
      });

      setCallStatus('incoming');
      startIncomingRingtone();
    };

    // Caller receives Call Accepted
    const handleCallAccepted = async ({
      signal,
    }: {
      signal: RTCSessionDescriptionInit;
      from: string;
    }) => {
      console.log('✅ Call accepted by remote party');
      stopRingtone();
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal));

        // Process any queued ICE candidates
        while (pendingIceCandidatesRef.current.length > 0) {
          const candidate = pendingIceCandidatesRef.current.shift();
          if (candidate) {
            try {
              await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
              console.error('Error adding queued ICE candidate:', e);
            }
          }
        }
      }

      setCallStatus('connected');
      setCallDuration(0);
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    };

    // Call Rejected by remote party
    const handleCallRejected = ({ reason }: { reason?: string }) => {
      toast.error(reason || 'Call was declined');
      playCallEndTone();
      cleanupCall('declined');
    };

    // ICE Candidate Exchange
    const handleIceCandidate = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      if (!candidate) return;
      if (
        peerConnectionRef.current &&
        peerConnectionRef.current.remoteDescription &&
        peerConnectionRef.current.remoteDescription.type
      ) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error adding ICE candidate:', e);
        }
      } else {
        pendingIceCandidatesRef.current.push(candidate);
      }
    };

    // Remote Ended Call
    const handleCallEnded = () => {
      toast('Call ended', { icon: '📴' });
      playCallEndTone();
      cleanupCall(callStatusRef.current === 'connected' ? 'completed' : 'missed');
    };

    socket.on('call_incoming', handleCallIncoming);
    socket.on('call_accepted', handleCallAccepted);
    socket.on('call_rejected', handleCallRejected);
    socket.on('ice_candidate', handleIceCandidate);
    socket.on('call_ended', handleCallEnded);

    return () => {
      socket.off('call_incoming', handleCallIncoming);
      socket.off('call_accepted', handleCallAccepted);
      socket.off('call_rejected', handleCallRejected);
      socket.off('ice_candidate', handleIceCandidate);
      socket.off('call_ended', handleCallEnded);
    };
  }, [socket, loggedInUser?._id, cleanupCall]);

  return (
    <CallContext.Provider
      value={{
        callStatus,
        callData,
        localStream,
        remoteStream,
        isMicMuted,
        isCameraOff,
        isScreenSharing,
        callDuration,
        callLogs,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMic,
        toggleCamera,
        toggleScreenShare,
        clearCallLogs,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
