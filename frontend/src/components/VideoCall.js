import React, { useContext, useEffect, useRef, useState } from "react";
import { UserContext } from "../contexts/UserContext";
export default function VideoCall({ socket,member, setInCall }) {
  const [myStream, setMyStream] = useState(null);
  const myVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerRef = useRef(null);
  const { answer, incomingCall, setIncommingCall, user } = useContext(UserContext);
  // 1. Get user media
  useEffect(() => {
    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setMyStream(stream);

        if (myVideoRef.current) {
          myVideoRef.current.srcObject = stream;
        }

        console.log("Got media stream:", stream.getTracks());
      } catch (err) {
        console.error("Error accessing media devices:", err);
      }
    };

    initMedia();
  }, []);

    useEffect(()=>{
      if (!myStream) {
        console.error("No media stream available yet!");
        return;
      }
       callUser()
    },[myStream])
  // 2. Setup socket listeners ONCE
  useEffect(() => {
    if (!socket) return;
    const handleAnswer = async (answer) => {
      if (peerRef.current) {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    };
    const handleCandidate = async (candidate) => {
      if (peerRef.current) {
        try {
          await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Error adding received ice candidate", err);
        }
      }
    };

    socket.on("answer", handleAnswer);
    socket.on("candidate", handleCandidate);

    return () => {
  
      socket.off("answer", handleAnswer);
      socket.off("candidate", handleCandidate);
    };
  }, [socket, myStream, member]);

  // 3. Call user after stream ready
  const callUser = async () => {
  
    peerRef.current = new RTCPeerConnection();

    myStream.getTracks().forEach((track) => {
      peerRef.current.addTrack(track, myStream);
    });

    peerRef.current.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    peerRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("candidate", event.candidate, member);
      }
    };

    const offer = await peerRef.current.createOffer();
    await peerRef.current.setLocalDescription(offer);

    socket.emit("offer", {offer,member, user});
  };

  const acceptCall = () => {
    socket.emit("answer", answer, member);
    setIncommingCall(false)
    setInCall(true)
  }
  const rejectCall = () => {

  }
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #2c3e50, #34495e)",
        color: "white",
        padding: "1rem",
      }}
    >
      <h2 style={{ marginBottom: "1rem", fontSize: "1.8rem" }}>🎥 Video Call</h2>

      {/* Video Section */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
          width: "100%",
          maxWidth: "800px",
        }}
      >
        <div
          style={{
            position: "relative",
            background: "#000",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
        >
          <video
            ref={myVideoRef}
            autoPlay
            playsInline
            muted
            style={{ width: "100%", borderRadius: "12px" }}
          />
          <span
            style={{
              position: "absolute",
              bottom: "8px",
              left: "8px",
              background: "rgba(0,0,0,0.6)",
              padding: "4px 8px",
              borderRadius: "6px",
              fontSize: "0.9rem",
            }}
          >
            You
          </span>
        </div>

        <div
          style={{
            position: "relative",
            background: "#000",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
        >
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{ width: "100%", borderRadius: "12px" }}
          />
          <span
            style={{
              position: "absolute",
              bottom: "8px",
              left: "8px",
              background: "rgba(0,0,0,0.6)",
              padding: "4px 8px",
              borderRadius: "6px",
              fontSize: "0.9rem",
            }}
          >
            Friend
          </span>
        </div>
      </div>
      {/* Controls */}
      <div
        style={{
          marginTop: "1.5rem",
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <button
          onClick={() => setInCall(false)}
          style={{
            padding: "0.8rem 1.6rem",
            borderRadius: "50px",
            border: "none",
            cursor: "pointer",
            background: "#e74c3c",
            color: "white",
            fontSize: "1rem",
            boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
          }}
        >
          ❌ Hang Up
        </button>
      </div>
      {incomingCall && (
        <div
          style={{
            marginTop: "1rem",
            padding: "1rem",
            background: "rgba(0,0,0,0.7)",
            borderRadius: "12px",
            textAlign: "center",
          }}
        >
          <p>📲 Incoming call...</p>
          <div style={{ marginTop: "0.5rem", display: "flex", gap: "1rem", justifyContent: "center" }}>
            <button
              onClick={acceptCall}
              style={{
                padding: "0.6rem 1.2rem",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                background: "#27ae60",
                color: "white",
              }}
            >
              ✅ Accept
            </button>
            <button
              onClick={rejectCall}
              style={{
                padding: "0.6rem 1.2rem",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                background: "#e74c3c",
                color: "white",
              }}
            >
              ❌ Reject
            </button>
          </div>
        </div>
      )}

      {/* Mobile Responsive */}
      <style>
        {`
        @media (max-width: 768px) {
          div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
          video {
            height: auto;
          }
        }
      `}
      </style>
    </div>
  );
}
