// src/components/outGoingCall.js (UPDATED)

import React, { useEffect, useState, useContext, useRef, useCallback } from "react";
import { Modal, Button, Spinner } from "react-bootstrap";
import { FaPhoneSlash, FaVideo } from "react-icons/fa";
import { UserContext } from "../../contexts/UserContext";

const OutGoingCall = ({
    conversation,
    show,
    member,
    callType = "video",
    onCancel, }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [dots, setDots] = useState("");
    const { socket, user } = useContext(UserContext);

    const peerRef = useRef(null);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const localStreamRef = useRef(null);

    const handleEndCall = () => {
        if (socket && member?._id) {
            socket.emit("call:end", {
                receiverId: member._id,
            });
        }

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }

        if (peerRef.current) {
            peerRef.current.close();
            peerRef.current = null;
        }

        setIsConnected(false);

        onCancel?.();
    };
    // 🔔 Animate “Ringing...”
    useEffect(() => {
        const interval = setInterval(() => {
            setDots((d) => (d.length < 3 ? d + "." : "."));
        }, 500);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!socket) return;

        const handleAnswer = async ({ receiverId, answer }) => {
            try {
                if (!peerRef.current) return;

                await peerRef.current.setRemoteDescription(
                    new RTCSessionDescription(answer)
                );

                setIsConnected(true);
            } catch (err) {
                console.error("Failed to process answer:", err);
            }
        };

        const handleIceCandidate = async (data) => {
            console.log("Received ICE candidate:", data);
           const { candidate } = data;
            try {
                if (!peerRef.current || !candidate) return;

                await peerRef.current.addIceCandidate(
                    new RTCIceCandidate(candidate)
                );
            } catch (err) {
                console.error("Failed to add ICE candidate:", err);
            }
        };

        const handleRemoteEnd = () => {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
                localStreamRef.current = null;
            }

            if (peerRef.current) {
                peerRef.current.close();
                peerRef.current = null;
            }

            setIsConnected(false);
            onCancel?.();
        };

        socket.on("call:answer", handleAnswer);
        socket.on("call:ice_candidate", handleIceCandidate);
        socket.on("call:end", handleRemoteEnd);

        return () => {
            socket.off("call:answer", handleAnswer);
            socket.off("call:ice_candidate", handleIceCandidate);
            socket.off("call:end", handleRemoteEnd);
        };
    }, [socket, onCancel]);
    useEffect(() => {
        if (!show || !socket || !member) return;

        let active = true;

        const startCall = async () => {
            try {
                const peer = new RTCPeerConnection({
                    iceServers: [
                        {
                            urls: [
                                "stun:stun.l.google.com:19302",
                                "stun:stun1.l.google.com:19302",
                            ],
                        },
                    ],
                });

                peerRef.current = peer;

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: callType === "video",
                    audio: true,
                });

                if (!active) return;

                localStreamRef.current = stream;

                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }

                stream.getTracks().forEach(track => {
                    peer.addTrack(track, stream);
                });

                peer.ontrack = (event) => {
                    if (
                        remoteVideoRef.current &&
                        remoteVideoRef.current.srcObject !== event.streams[0]
                    ) {
                        remoteVideoRef.current.srcObject = event.streams[0];
                    }
                };

                peer.onicecandidate = (event) => {
                    if (!event.candidate) return;

                    socket.emit("call:ice_candidate", {
                        receiverId: member._id,
                        candidate: event.candidate,
                    });
                };

                const offer = await peer.createOffer();

                await peer.setLocalDescription(offer);


                socket.emit("call:start", {
                    conversationId: conversation?._id,
                    receiverId: member?._id,
                    callType,
                    offer,
                    fromName: user.userName,
                });



            } catch (err) {
                console.error("Error starting call:", err);
            }
        };

        startCall();

        return () => {
            active = false;

            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
                localStreamRef.current = null;
            }

            if (peerRef.current) {
                peerRef.current.close();
                peerRef.current = null;
            }
        };
    }, [show, socket, member]);


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
                            {isConnected
                                ? `Active ${callType === "video" ? "Video" : "Voice"} Call`
                                : `Calling ${callType === "video" ? "Video" : "Voice"}...`}
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
                                <div
                                    className="rounded-circle bg-secondary d-flex align-items-center justify-content-center position-relative z-2"
                                    style={{ width: "100%", height: "100%", fontSize: "3rem" }}
                                >
                                    {member?.userName?.charAt(0)}
                                </div>
                            </div>
                            <Spinner animation="grow" size="sm" variant="primary" className="me-2" />
                            <span className="text-muted small">Awaiting Answer...</span>
                        </div>
                    )}

                    {/* Remote Video */}
                    {callType === "video" && (
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className={`w-100 h-100 position-absolute top-0 start-0 ${isConnected ? "opacity-100" : "opacity-0"
                                }`}
                            style={{
                                objectFit: "cover",
                                transition: "opacity 0.5s ease-in",
                            }}
                        />
                    )}

                    {/* Local Video (Floating PiP) */}
                    {callType === "video" && (
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className={`position-absolute m-3 rounded shadow-lg border border-secondary ${isConnected
                                ? "bottom-0 end-0"
                                : "top-50 start-50 translate-middle opacity-0"
                                }`}
                            style={{
                                width: isConnected ? "110px" : "0px",
                                height: isConnected ? "150px" : "0px",
                                objectFit: "cover",
                                zIndex: 10,
                                transition: "all 0.4s ease-out",
                            }}
                        />
                    )}
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