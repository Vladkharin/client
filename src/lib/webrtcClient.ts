// src/lib/webrtcClient.ts

import { useSocketStore } from "@/store";

let peerConnection: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let currentConversationId: number | null = null;

const configuration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

interface WebRtcOfferAnswer {
  type: "offer" | "answer";
  sdp: string;
}

interface WebRtcIceCandidate {
  candidate: string;
  sdpMid?: string;
  sdpMLineIndex?: number;
}

function isWebRtcOfferAnswer(obj: unknown): obj is WebRtcOfferAnswer {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "type" in obj &&
    (obj.type === "offer" || obj.type === "answer") &&
    "sdp" in obj &&
    typeof obj.sdp === "string"
  );
}

function isWebRtcIceCandidate(obj: unknown): obj is WebRtcIceCandidate {
  return (
    typeof obj === "object" && obj !== null && "candidate" in obj && typeof obj.candidate === "string"
    // sdpMid и sdpMLineIndex опциональны
  );
}

// Универсальная функция для отображения удалённого видео
const setupRemoteVideo = (stream: MediaStream) => {
  const remoteVideo = document.getElementById("remoteVideo") as HTMLVideoElement;
  if (remoteVideo) {
    remoteVideo.srcObject = stream;
  }
};

// Инициатор звонка (caller)
export const initiateCall = async (calleeId: number, conversationId: number) => {
  cleanup();
  currentConversationId = conversationId;

  peerConnection = new RTCPeerConnection(configuration);
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

  localStream.getTracks().forEach((track) => peerConnection?.addTrack(track, localStream!));

  // Показываем своё видео
  const localVideo = document.getElementById("localVideo") as HTMLVideoElement;
  if (localVideo) localVideo.srcObject = localStream;

  // Когда приходит видео от собеседника
  peerConnection.ontrack = (event) => {
    setupRemoteVideo(event.streams[0]);
  };

  // Отправка ICE-кандидатов
  peerConnection.onicecandidate = (event) => {
    if (event.candidate && peerConnection) {
      useSocketStore.getState().sendMessage("call:signal", {
        targetUserId: calleeId,
        data: event.candidate,
        conversationId,
      });
    }
  };

  // Создаём offer
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  // Отправляем offer через WebSocket
  useSocketStore.getState().sendMessage("call:signal", {
    targetUserId: calleeId,
    data: offer,
    conversationId,
  });
};

// Получатель звонка (callee)
export const answerCall = async (callerId: number, conversationId: number) => {
  cleanup();
  currentConversationId = conversationId;

  peerConnection = new RTCPeerConnection(configuration);
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

  localStream.getTracks().forEach((track) => peerConnection?.addTrack(track, localStream!));

  const localVideo = document.getElementById("localVideo") as HTMLVideoElement;
  if (localVideo) localVideo.srcObject = localStream;

  peerConnection.ontrack = (event) => {
    setupRemoteVideo(event.streams[0]);
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate && peerConnection) {
      useSocketStore.getState().sendMessage("call:signal", {
        targetUserId: callerId,
        data: event.candidate,
        conversationId,
      });
    }
  };
};

// Обработка всех WebRTC-сигналов (offer, answer, ice-candidate)
export const handleWebRtcSignal = async (fromId: number, signal: unknown) => {
  if (!peerConnection || !currentConversationId) return;

  try {
    if (isWebRtcOfferAnswer(signal)) {
      const desc: RTCSessionDescriptionInit = {
        type: signal.type,
        sdp: signal.sdp,
      };

      await peerConnection.setRemoteDescription(new RTCSessionDescription(desc));

      if (desc.type === "offer") {
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        useSocketStore.getState().sendMessage("call:signal", {
          targetUserId: fromId,
          answer,
          conversationId: currentConversationId,
        });
      }
    } else if (isWebRtcIceCandidate(signal)) {
      const iceCandidate: RTCIceCandidateInit = {
        candidate: signal.candidate,
        sdpMid: signal.sdpMid,
        sdpMLineIndex: signal.sdpMLineIndex,
      };

      await peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidate));
    }
  } catch (error) {
    console.error("🔥 WebRTC error:", error);
  }
};

// Очистка ресурсов
export const cleanup = () => {
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
  }
  if (peerConnection) {
    peerConnection.close();
  }
  peerConnection = null;
  localStream = null;
  currentConversationId = null;

  // Очищаем видео — явно указываем тип
  const localVideo = document.getElementById("localVideo") as HTMLVideoElement | null;
  const remoteVideo = document.getElementById("remoteVideo") as HTMLVideoElement | null;

  if (localVideo) localVideo.srcObject = null;
  if (remoteVideo) remoteVideo.srcObject = null;
};
