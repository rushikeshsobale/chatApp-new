// src/components/outGoingCall.js (UPDATED)

import React, { useEffect, useState, useContext, useRef, useCallback } from "react";
import { Modal, Button, Spinner } from "react-bootstrap";
import { FaPhoneSlash } from "react-icons/fa";
import { UserContext } from "../../contexts/UserContext";

const OutGoingCall = ({ show, member,onCancel }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [dots, setDots] = useState(".");
    const { socket, user } = useContext(UserContext);

    const peerRef = useRef(null);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const localStreamRef = useRef(null);
    const pendingIceCandidates = useRef([]); // Added for robustness

    // 🔔 Animate “Ringing...”
    useEffect(() => {
        const interval = setInterval(() => {
            setDots((d) => (d.length < 3 ? d + "." : "."));
        }, 500);
        return () => clearInterval(interval);
    }, []);
    
    // --- Unified Signal Handler ---
    const handleIncomingSignal = useCallback(async (data) => {
        if (data.from !== member._id) return;
        
        // Handle Answer
        if (data.type === 'answer' && peerRef.current) {
            await peerRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
            setIsConnected(true);
            // Process any candidates that arrived before the answer
            for (let candidate of pendingIceCandidates.current) {
                try {
                    await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.error("Error adding pending ICE candidate on caller side:", e);
                }
            }
            pendingIceCandidates.current = [];
            
        // Handle ICE Candidate
        } else if (data.type === 'ice-candidate') {
            if (peerRef.current && peerRef.current.remoteDescription) {
                try {
                    await peerRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
                } catch (err) {
                    console.error("Error adding ICE candidate on caller side:", err);
                }
            } else {
                // If remoteDescription hasn't been set (answer hasn't arrived), queue candidate
                pendingIceCandidates.current.push(data.candidate);
            }
        }
    }, [member]);
    
     const handleCallRejected =(data)=>{
        onCancel()
       
     }

     const  handleCallCanceled=(data)=>{
        onCancel()
       
     }

     const handleCallEnded = (data)=>{
        
       
        onCancel()
     }
    useEffect(() => {
        if (!socket) return;
        
        // Listen to the unified signal event
        socket.on("receive-signal", handleIncomingSignal);

        // Keep the old 'call-answered' for the initial answer handling if you need to stick to your existing flow
        // The unified signal handler above covers this, but for minimal change, we'll keep the old event listener too:
        const handleAnswerLegacy = async ({ answer }) => {
             if (peerRef.current) {
                 await peerRef.current.setRemoteDescription(
                     new RTCSessionDescription(answer)
                 );
                 setIsConnected(true);
             }
         };
         socket.on("call-answered", handleAnswerLegacy);
        socket.on('call-canceled', handleCallCanceled)
        socket.on('call-rejected', handleCallRejected)
        socket.on('call-ended', handleCallEnded)

        return () => {
            socket.off("receive-signal", handleIncomingSignal);
            socket.off("call-answered", handleAnswerLegacy);
            socket.off('call-rejected', handleCallRejected)
        }
    }, [socket, member, handleIncomingSignal]);
    
    // 🚀 Start outgoing call (Effect remains mostly the same, only ICE candidate event changes)
    useEffect(() => {
        if (!show || !socket || !member) return;
        let active = true;

        const startCall = async () => {
            try {
                const peer = await new RTCPeerConnection({
                    iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302" ]}],
                });
                peerRef.current = peer;
                
                // ✅ FIX 1: Ensure audio is requested
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true, 
                });
                
                if (!active) return;
                localVideoRef.current.srcObject = stream;
                localStreamRef.current = stream;
                stream.getTracks().forEach((track) => peer.addTrack(track, stream));

                // 4️⃣ Remote stream
                peer.ontrack = (event) => {
                    console.log('ontrack received on CALLER side', event.streams[0]);
                    if(remoteVideoRef.current.srcObject !== event.streams[0]) {
                        remoteVideoRef.current.srcObject = event.streams[0];
                    }
                };

                // 5️⃣ Emit ICE candidates
                peer.onicecandidate = (event) => {
                    if (event.candidate) {
                        // ✅ FIX 2: Use unified signaling event 'send-signal'
                        socket.emit("send-signal", {
                            to: member._id,
                            type: 'ice-candidate', // IMPORTANT: Specify type
                            candidate: event.candidate,
                        });
                    }
                };

                // Create and send offer
                const offer = await peer.createOffer();
                await peer.setLocalDescription(offer);
                
                // Use the existing 'call-user' event for the initial call setup
                socket.emit("call-user", {
                    to: member._id,
                    from: user,
                    offer,
                });
            } catch (err) {
                console.error("❌ Error starting call:", err);
            }
        };

        startCall();

        return () => {
            active = false;
            if (localStreamRef.current)
                localStreamRef.current.getTracks().forEach((t) => t.stop());
            if (peerRef.current) peerRef.current.close();
        };
    }, [show, socket, member, user]);
    
  // 🛑 FIX: Define handleEndCall before it's used in JSX
  const handleEndCall = () => {
      if (peerRef.current) peerRef.current.close();
      if (localStreamRef.current)
          localStreamRef.current.getTracks().forEach((t) => t.stop());
      
      // Notify the remote peer the call has ended (optional, but good practice)
      if (socket && member?._id) {
           socket.emit("end-call", { to: member._id });
      }
      
      setIsConnected(false);
      onCancel()
      
  };

    // ... handleCancel and handleEndCall functions remain the same ...

    return (
        // ... JSX remains the same ...
        <Modal show={show} centered backdrop="static" keyboard={false}>
            <Modal.Body className="text-center p-4">
                <div className="d-flex flex-column align-items-center gap-3">
                    {/* Video container */}
                    <div
                        className="position-relative"
                        style={{
                            width: "100%",
                            maxWidth: "400px",
                            height: "250px",
                            background: "#000",
                            borderRadius: "10px",
                            overflow: "hidden",
                        }}
                    >
                        {/* Remote video */}
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />

                        {/* Local video */}
                        <video
                            ref={localVideoRef}
                            autoPlay
                            muted
                            playsInline
                            style={{
                                position: "absolute",
                                bottom: "10px",
                                right: "10px",
                                width: "100px",
                                height: "80px",
                                objectFit: "cover",
                                borderRadius: "8px",
                                border: "2px solid white",
                            }}
                        />
                    </div>

                    {!isConnected ? (
                        <>
                            <h5>
                                Calling  to {member?.userName || "User"}
                                {dots}
                            </h5>
                            <Spinner animation="border" variant="primary" />
                        </>
                    ) : (
                        <h5 className="text-success">Connected with {member?.userName}</h5>
                    )}

                    <Button
                        variant="danger"
                        className="d-flex align-items-center gap-2 mt-3"
                        onClick={ handleEndCall}
                    >
                        <FaPhoneSlash /> End Call
                    </Button>
                </div>
            </Modal.Body>
        </Modal>
    );
};

export default OutGoingCall;