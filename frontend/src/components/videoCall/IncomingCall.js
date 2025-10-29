// src/components/incomingCall.js (UPDATED)

import React, { useEffect, useRef, useState, useContext, useCallback } from "react";
import { Modal, Button, Spinner } from "react-bootstrap";
import { FaPhoneAlt, FaPhoneSlash } from "react-icons/fa";
import { UserContext } from "../../contexts/UserContext";

const IncomingCall = () => {
    const { socket, incomingCall, setIncomingCall } = useContext(UserContext); // Assuming setIncomingCall is available
    const [show, setShow] = useState(false); // Controlled by incomingCall
    const [caller, setCaller] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const peerRef = useRef(null);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const localStreamRef = useRef(null);
    const pendingIceCandidates = useRef([]);

    // --- Initialize incoming call ---
    useEffect(() => {
        if (incomingCall) {
            setCaller(incomingCall?.from?.userName);
            setShow(true);
            
            setConnecting(false);
        } else {
            setShow(false);
        }
    }, [incomingCall]);

    // --- Unified Signal Handler ---
    const handleIncomingSignal = useCallback(async (data) => {
        // Only handle ICE candidates here, as the Offer is handled by the main incomingCall context
        if (data.type !== 'ice-candidate') return;

        const candidate = data.candidate;
        if (!candidate) return;

        // Use the raw candidate object as provided by the browser
        const formattedCandidate = candidate;

        if (peerRef.current && peerRef.current.remoteDescription) {
            try {
                // Ensure peerRef.current is the RTCPeerConnection object
                await peerRef.current.addIceCandidate(new RTCIceCandidate(formattedCandidate));
            } catch (err) {
                console.error("Error adding ICE candidate:", err);
            }
        } else {
            // Queue candidate if RTCSessionDescription (Offer) is not yet set
            pendingIceCandidates.current.push(formattedCandidate);
        }
    }, []);

    const handleCallCanceled = (data) => {
        setShow(false)
       
    }

    const handleCallEnded = (data) => {
        setShow(false)
       
    }

    useEffect(() => {
        if (!socket) return;

        // ✅ FIX 3: Listen to the unified signaling event
        socket.on('call-ended', handleCallEnded)
        socket.on("receive-signal", handleIncomingSignal);
        socket.on("call-canceled", handleCallCanceled)
        return () => socket.off("receive-signal", handleIncomingSignal);
    }, [socket, handleIncomingSignal]);


    // --- Accept Call ---
    const handleAccept = async () => {
        if (!incomingCall) return;
        setConnecting(true);
        console.log("📞 Accepting call...");

        try {
            const peer = new RTCPeerConnection({
                iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
            });
            peerRef.current = peer;

            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true, // Ensure audio is included
            });

            localVideoRef.current.srcObject = stream;
            localStreamRef.current = stream;
            // 3️⃣ Add local tracks
            stream.getTracks().forEach((track) => peer.addTrack(track, stream));


            // 4️⃣ Remote tracks
            peer.ontrack = (event) => {
                console.log('ontrack received on RECEIVER side', event.streams[0]);
                if (remoteVideoRef.current.srcObject !== event.streams[0]) {
                    remoteVideoRef.current.srcObject = event.streams[0];
                    setIsConnected(true); // Set connected status here
                }
            };


            // 5️⃣ ICE candidates
            peer.onicecandidate = event => {
                if (event.candidate) {
                    // ✅ FIX 4: Use unified signaling event 'send-signal'
                    socket.emit("send-signal", {
                        to: incomingCall.from,
                        type: 'ice-candidate', // IMPORTANT: Specify type
                        candidate: event.candidate
                    });
                }
            };

            // 6️⃣ Set remote description (The Offer)
            await peer.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
            console.log("Set Remote Description (Offer)");

            // 7️⃣ Add pending ICE candidates
            for (let candidate of pendingIceCandidates.current) {
                // We assume candidates were queued while waiting for peer connection initialization
                await peer.addIceCandidate(new RTCIceCandidate(candidate));
            }
            pendingIceCandidates.current = [];

            // 8️⃣ Create and send answer
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);

            // Use your existing 'answer' event for the initial answer handshake
            socket.emit("answer", { to: incomingCall.from, answer });

            setConnecting(false);
            // setIsConnected(true); // Should be set inside ontrack for video confirmation, but can be set here too.
            console.log("✅ Answer sent!");
        } catch (err) {
            console.error("❌ Error accepting call:", err);
            setConnecting(false);
        }
    };

    const handleReject = () => {
        if (incomingCall) socket.emit("reject-call", { to: incomingCall.from });
        setShow(false);
        setIncomingCall(null); // Clear incoming call context
        handleEndCall(); // Cleanup resources
    };

    const handleEndCall = () => {
        if (peerRef.current) peerRef.current.close();
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
        }

        socket.emit('end-call', { to: caller })
        setIsConnected(false);
        // Ensure modal closes and context is reset if not already
        if (show) setShow(false);
        if (incomingCall) setIncomingCall(null);

    };

    return (
        <>
            {/* Incoming call modal */}
            <Modal show={show} onHide={handleReject} centered backdrop="static" keyboard={false}>
                <Modal.Header closeButton>
                    <Modal.Title>{isConnected ? "Video Call" : `Incoming Call from ${incomingCall.fromName}`}</Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-center p-0"> {/* Adjusted padding */}
                    <div style={{ position: "relative", width: "100%", height: isConnected ? "400px" : "auto", background: "#000" }}>
                        {/* Remote video */}
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                display: isConnected ? 'block' : 'none' // Hide remote video until connected
                            }}
                        />

                        {/* Connecting/Ringing Overlay */}
                        {!isConnected && (
                            <div style={{ padding: '20px' }}>
                                <h3>Ringing...</h3>
                                <Spinner animation="border" />
                            </div>
                        )}

                        {/* Local video (Muted, Picture-in-Picture) */}
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            style={{
                                position: "absolute",
                                bottom: "10px",
                                right: "10px",
                                width: isConnected ? "100px" : "0", // Hide when not connected
                                height: isConnected ? "80px" : "0",
                                objectFit: "cover",
                                borderRadius: "8px",
                                border: "2px solid white",
                                transition: 'width 0.3s, height 0.3s'
                            }}
                        />
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    {!isConnected ? (
                        <>
                            <Button variant="success" onClick={handleAccept} disabled={connecting}>
                                {connecting ? <Spinner as="span" animation="border" size="sm" /> : <FaPhoneAlt />} Accept
                            </Button>
                            <Button variant="danger" onClick={handleReject} disabled={connecting}>
                                <FaPhoneSlash /> Reject
                            </Button>
                        </>
                    ) : (
                        <Button variant="danger" onClick={handleEndCall}>
                            <FaPhoneSlash /> End Call
                        </Button>
                    )}
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default IncomingCall;