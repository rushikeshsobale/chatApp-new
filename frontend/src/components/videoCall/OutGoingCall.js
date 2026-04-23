// src/components/outGoingCall.js (UPDATED)

import React, { useEffect, useState, useContext, useRef, useCallback } from "react";
import { Modal, Button, Spinner } from "react-bootstrap";
import { FaPhoneSlash, FaVideo } from "react-icons/fa";
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
       <Modal 
            show={show} 
            centered 
            backdrop="static" 
            contentClassName="bg-dark text-white border-0 shadow-lg"
            style={{ borderRadius: '15px', overflow: 'hidden' }}
        >
            <Modal.Body className="p-0 position-relative" style={{ backgroundColor: '#121212', minHeight: '450px' }}>
                
                {/* Status Header */}
                <div className="position-absolute top-0 w-100 p-4 z-3 d-flex justify-content-between align-items-start"
                     style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%)' }}>
                    <div>
                        <h5 className="mb-1 fw-bold text-uppercase tracking-wider">
                            {isConnected ? "Active Call" : "Calling..."}
                        </h5>
                        <p className="small text-light opacity-75 mb-0">
                            {member?.userName || "User"}
                        </p>
                    </div>
                    {isConnected && (
                        <div className="badge bg-success px-3 py-2 d-flex align-items-center">
                            SECURE
                        </div>
                    )}
                </div>

                {/* Main View Area */}
                <div className="w-100 h-100 d-flex align-items-center justify-content-center" style={{ minHeight: '450px' }}>
                    {/* Ringing UI */}
                    {!isConnected && (
                        <div className="text-center">
                            <div className="position-relative mx-auto mb-4" style={{ width: '120px', height: '120px' }}>
                                <div className="position-absolute top-0 start-0 w-100 h-100 rounded-circle border border-primary opacity-25" 
                                     style={{ animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite' }}></div>
                                <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center position-relative z-2" 
                                     style={{ width: '100%', height: '100%', fontSize: '3rem' }}>
                                    {member?.userName?.charAt(0) || <FaVideo />}
                                </div>
                            </div>
                            <Spinner animation="grow" size="sm" variant="primary" className="me-2" />
                            <span className="text-muted small">Awaiting Answer...</span>
                        </div>
                    )}

                    {/* Remote Video */}
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className={`w-100 h-100 position-absolute top-0 start-0 ${isConnected ? 'opacity-100' : 'opacity-0'}`}
                        style={{ objectFit: 'cover', transition: 'opacity 0.5s ease-in' }}
                    />

                    {/* Local Video (Floating PiP) */}
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`position-absolute m-3 rounded shadow-lg border border-secondary ${isConnected ? 'bottom-0 end-0' : 'top-50 start-50 translate-middle opacity-0'}`}
                        style={{ 
                            width: isConnected ? '110px' : '0px', 
                            height: isConnected ? '150px' : '0px', 
                            objectFit: 'cover', 
                            zIndex: 10,
                            transition: 'all 0.4s ease-out'
                        }}
                    />
                </div>

                {/* End Call Button Overlay */}
                <div className="position-absolute bottom-0 w-100 p-5 d-flex justify-content-center z-3">
                    <Button 
                        variant="danger" 
                        onClick={handleEndCall}
                        className="rounded-circle d-flex align-items-center justify-content-center border-0 shadow-lg"
                        style={{ width: '65px', height: '65px', transition: 'transform 0.2s' }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <FaPhoneSlash size={28} />
                    </Button>
                </div>
            </Modal.Body>

            <style>{`
                @keyframes ping {
                    75%, 100% { transform: scale(2); opacity: 0; }
                }
                .modal-content {
                    border-radius: 20px !important;
                }
            `}</style>
        </Modal>
    );
};

export default OutGoingCall;