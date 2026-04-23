import React, { useEffect, useRef, useState, useContext, useCallback } from "react";
import { Modal, Button, Spinner } from "react-bootstrap";
import { FaPhoneAlt, FaPhoneSlash, FaVideo } from "react-icons/fa";
import { UserContext } from "../../contexts/UserContext";

const IncomingCall = () => {
    const { socket, incomingCall, setIncomingCall } = useContext(UserContext);
    const [show, setShow] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    
    const peerRef = useRef(null);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const localStreamRef = useRef(null);
    const pendingIceCandidates = useRef([]);

    useEffect(() => {
        if (incomingCall) {
            setShow(true);
            setConnecting(false);
        } else {
            setShow(false);
            setIsConnected(false);
        }
    }, [incomingCall]);

    const handleIncomingSignal = useCallback(async (data) => {
        if (data.type !== 'ice-candidate') return;
        const candidate = data.candidate;
        if (!candidate) return;

        if (peerRef.current && peerRef.current.remoteDescription) {
            try {
                await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
                console.error("Error adding ICE candidate:", err);
            }
        } else {
            pendingIceCandidates.current.push(candidate);
        }
    }, []);

    const cleanup = useCallback(() => {
        if (peerRef.current) {
            peerRef.current.close();
            peerRef.current = null;
        }
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }
        setIsConnected(false);
        setConnecting(false);
        setIncomingCall(null);
        setShow(false);
    }, [setIncomingCall]);

    useEffect(() => {
        if (!socket) return;
        socket.on('call-ended', cleanup);
        socket.on("receive-signal", handleIncomingSignal);
        socket.on("call-canceled", cleanup);
        return () => {
            socket.off('call-ended', cleanup);
            socket.off("receive-signal", handleIncomingSignal);
            socket.off("call-canceled", cleanup);
        };
    }, [socket, handleIncomingSignal, cleanup]);

    const handleAccept = async () => {
        if (!incomingCall) return;
        setConnecting(true);

        try {
            const peer = new RTCPeerConnection({
                iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
            });
            peerRef.current = peer;

            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });

            if (localVideoRef.current) localVideoRef.current.srcObject = stream;
            localStreamRef.current = stream;
            stream.getTracks().forEach((track) => peer.addTrack(track, stream));

            peer.ontrack = (event) => {
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = event.streams[0];
                    setIsConnected(true);
                    setConnecting(false);
                }
            };

            peer.onicecandidate = event => {
                if (event.candidate) {
                    socket.emit("send-signal", {
                        to: incomingCall.from,
                        type: 'ice-candidate',
                        candidate: event.candidate
                    });
                }
            };

            await peer.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
            
            for (let candidate of pendingIceCandidates.current) {
                await peer.addIceCandidate(new RTCIceCandidate(candidate));
            }
            pendingIceCandidates.current = [];

            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            socket.emit("answer", { to: incomingCall.from, answer });

        } catch (err) {
            console.error("❌ Error accepting call:", err);
            setConnecting(false);
        }
    };

    const handleReject = () => {
        if (incomingCall) socket.emit("reject-call", { to: incomingCall.from });
        cleanup();
    };

    const handleEndCall = () => {
        if (incomingCall) socket.emit('end-call', { to: incomingCall.from });
        cleanup();
    };

    return (
        <Modal 
            show={show} 
            onHide={handleReject} 
            centered 
            backdrop="static" 
            contentClassName="bg-dark text-white border-0 shadow-lg"
            style={{ borderRadius: '15px', overflow: 'hidden' }}
        >
            <Modal.Body className="p-0 position-relative" style={{ backgroundColor: '#121212', minHeight: '450px' }}>
                
                {/* Header Overlay */}
                <div className="position-absolute top-0 w-100 p-4 z-3 d-flex justify-content-between align-items-start" 
                     style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)' }}>
                    <div>
                        <h5 className="mb-1 fw-bold text-uppercase tracking-wider">
                            {isConnected ? "In Call" : "Incoming Video Call"}
                        </h5>
                        <p className="small text-light opacity-75 mb-0">
                            {incomingCall?.fromName || "Unknown User"}
                        </p>
                    </div>
                    {isConnected && (
                        <div className="badge bg-danger px-3 py-2 d-flex align-items-center">
                            <span className="me-2 d-inline-block" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white', animation: 'pulse 1.5s infinite' }}></span>
                            LIVE
                        </div>
                    )}
                </div>

                {/* Main View Area */}
                <div className="w-100 h-100 d-flex align-items-center justify-content-center" style={{ minHeight: '450px' }}>
                    {/* Placeholder when not connected */}
                    {!isConnected && !connecting && (
                        <div className="text-center">
                            <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center mx-auto mb-4" 
                                 style={{ width: '100px', height: '100px', fontSize: '2.5rem' }}>
                                {incomingCall?.fromName?.charAt(0) || <FaVideo />}
                            </div>
                            <h4 className="mb-2">{incomingCall?.fromName}</h4>
                            <p className="text-muted">Is calling you...</p>
                        </div>
                    )}

                    {/* Connecting Spinner */}
                    {connecting && (
                        <div className="text-center">
                            <Spinner animation="grow" variant="primary" />
                            <p className="mt-3 text-muted">Establishing connection...</p>
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

                    {/* Local Video (PiP) */}
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`position-absolute bottom-0 end-0 m-3 rounded shadow-lg border border-secondary ${isConnected ? 'opacity-100' : 'opacity-0'}`}
                        style={{ 
                            width: '120px', 
                            height: '160px', 
                            objectFit: 'cover', 
                            zIndex: 10,
                            transition: 'opacity 0.5s ease-in'
                        }}
                    />
                </div>

                {/* Action Buttons Overlay */}
                <div className="position-absolute bottom-0 w-100 p-4 d-flex justify-content-center gap-4 z-3"
                     style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)' }}>
                    
                    {!isConnected ? (
                        <>
                            <Button 
                                variant="success" 
                                onClick={handleAccept} 
                                disabled={connecting}
                                className="rounded-circle p-3 d-flex align-items-center justify-content-center border-0 shadow"
                                style={{ width: '60px', height: '60px' }}
                            >
                                <FaPhoneAlt size={24} />
                            </Button>
                            <Button 
                                variant="danger" 
                                onClick={handleReject} 
                                className="rounded-circle p-3 d-flex align-items-center justify-content-center border-0 shadow"
                                style={{ width: '60px', height: '60px' }}
                            >
                                <FaPhoneSlash size={24} />
                            </Button>
                        </>
                    ) : (
                        <Button 
                            variant="danger" 
                            onClick={handleEndCall}
                            className="rounded-pill px-5 py-2 d-flex align-items-center justify-content-center border-0 shadow fw-bold"
                        >
                            <FaPhoneSlash className="me-2" /> End Call
                        </Button>
                    )}
                </div>
            </Modal.Body>
            
            {/* Minimal CSS for the pulse effect */}
            <style>{`
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.3; }
                    100% { opacity: 1; }
                }
            `}</style>
        </Modal>
    );
};

export default IncomingCall;