import { useEffect, useRef, useState, useContext } from "react";
import { UserContext } from "../contexts/UserContext";
export default function VideoCall({ callUserId, onCallEnd }) {
  const [me, setMe] = useState("");
  const [isCalling, setIsCalling] = useState(false);
  const [inCall, setInCall] = useState(false);
  const { socket,incomingCall, setIncomingCall} = useContext(UserContext);
  const myVideo = useRef();
  const userVideo = useRef();
  const peerRef = useRef();
  const streamRef = useRef();
  
  useEffect(() => {
    socket.on("call-answered", async ({ answer }) => {
      if (peerRef.current) {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        setInCall(true);
        setIsCalling(false);
      }
    });
    socket.on("ice-candidate", (candidate) => {
      if (peerRef.current) peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    });

    socket.on("call-rejected", () => {
      alert("Call was rejected.");
      cleanup();
    });

    socket.on("call-ended", () => {
      cleanup();
      if (onCallEnd) onCallEnd();
    });
    startMyVideo();
    if (callUserId) {
      callUser(callUserId);
    }
  }, [callUserId]);
  const startMyVideo = async () => {
    console.log('startMyvideo')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (myVideo.current) myVideo.current.srcObject = stream;
    } catch (err) {
      console.error("Error accessing media devices:", err);
    }
  };

  const createPeer = (remoteSocketId) => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit("ice-candidate", { to: remoteSocketId, candidate: e.candidate });
    };

    pc.ontrack = (e) => {
      if (userVideo.current) userVideo.current.srcObject = e.streams[0];
    };

    streamRef.current?.getTracks().forEach(track => pc.addTrack(track, streamRef.current));

    peerRef.current = pc;
    return pc;
  };

  const callUser = async (remoteId) => {
    if (!remoteId) return;
    const pc = createPeer(remoteId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("call-user", { offer, to: remoteId });
    setIsCalling(true);
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    const { from, offer } = incomingCall;
    const pc = createPeer(from);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("answer-call", { answer, to: from });
    setInCall(true);
    setIncomingCall(null);
  };

  const rejectCall = () => {
    if (!incomingCall) return;
    socket.emit("reject-call", { to: incomingCall.from });
    // setIncomingCall(null);
  };

  const hangUp = () => {
    if (callUserId) socket.emit("hang-up", { to: callUserId });
    cleanup();
    if (onCallEnd) onCallEnd();
  };

  const cleanup = () => {
    peerRef.current?.close();
    peerRef.current = null;
    setInCall(false);
    setIsCalling(false);
    if (userVideo.current) userVideo.current.srcObject = null;
  };

  return (
    <div className="flex flex-col items-center gap-4 mt-4">
      <h2>Your ID: {me}</h2>
      {/* Incoming call popup */}
      {incomingCall && !inCall && (
        <div className="bg-gray-800 text-white p-4 rounded-lg">
          <p>Incoming call from: {incomingCall?.from}</p>
          <div className="flex gap-2 mt-2">
            <button onClick={acceptCall} className="bg-green-500 px-3 py-1 rounded">Accept</button>
            <button onClick={rejectCall} className="bg-red-500 px-3 py-1 rounded">Reject</button>
          </div>
        </div>
      )}

      {/* Hang-up button */}
      {inCall && (
        <button onClick={hangUp} className="bg-red-500 text-white px-3 py-1 rounded">
          Hang Up
        </button>
      )}

      {/* Video streams */}
      <div className="flex gap-4 mt-4">
        <video ref={myVideo} autoPlay muted playsInline className="w-1/2" />
        <video ref={userVideo} autoPlay playsInline className="w-1/2" />
      </div>
    </div>
  );
}
