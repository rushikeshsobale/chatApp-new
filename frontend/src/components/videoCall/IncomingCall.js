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
            console.log('Incoming call from:', incomingCall);
            setShow(true);
            setConnecting(false);
        } else {
            setShow(false);
            setIsConnected(false);
        }
    }, [incomingCall]);


    const handleAccept = async () => {
        try {
            setConnecting(true);

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
                video: incomingCall?.callType === "video",
                audio: true,
            });
            localStreamRef.current = stream;

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            stream.getTracks().forEach(track => {
                peer.addTrack(track, stream);
            });

            peer.ontrack = (event) => {
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = event.streams[0];
                }

                setIsConnected(true);
                setConnecting(false);
            };

            peer.onicecandidate = (event) => {
                if (!event.candidate) return;

                socket.emit("call:ice_candidate", {
                    receiverId: incomingCall.senderId,
                    candidate: event.candidate,
                });
            };
        console.log("Setting remote description with offer:", incomingCall);
            await peer.setRemoteDescription(
                new RTCSessionDescription(incomingCall.offer)
            );

            const answer = await peer.createAnswer();

            await peer.setLocalDescription(answer);

            socket.emit("call:answer", {
                receiverId: incomingCall.senderId,
                answer,
            });

        } catch (err) {
            console.error(err);
            setConnecting(false);
        }
    };

    useEffect(() => {
        if (!socket) return;

        const handleIce = async ({ candidate }) => {
            console.log("Received ICE candidate: incoming", candidate);
            try {
                if (!peerRef.current) return;

                await peerRef.current.addIceCandidate(
                    new RTCIceCandidate(candidate)
                );
            } catch (err) {
                console.error(err);
            }
        };

        socket.on("call:ice_candidate", handleIce);

        return () => {
            socket.off("call:ice_candidate", handleIce);
        };
    }, [socket]);

    const handleEndCall = () => {
        if (incomingCall?.senderId) {
            socket.emit("call:end", {
                receiverId: incomingCall.senderId,
                conversationId: incomingCall.conversationId,
            });
        }

        cleanup();
    };

    const handleReject = () => {

        if (incomingCall?.senderId) {
            socket.emit("call:reject", {
                receiverId: incomingCall.senderId,
                conversationId: incomingCall.conversationId,
            });
        }

        cleanup();
    }


    useEffect(() => {
        if (!socket) return;

        const handleRemoteEnd = () => {
            cleanup();
        };

        socket.on("call:end", handleRemoteEnd);

        return () => {
            socket.off("call:end", handleRemoteEnd);
        };
    }, [socket]);

    const cleanup = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }

        if (peerRef.current) {
            peerRef.current.close();
            peerRef.current = null;
        }

        setIsConnected(false);
        setConnecting(false);
        setShow(false);
        setIncomingCall(null);
    };
    return (
       <Modal
    show={show}
    onHide={handleReject}
    centered
    backdrop="static"
    contentClassName="bg-dark text-white border-0 shadow-lg"
>
    <Modal.Body
        className="p-0 position-relative overflow-hidden"
        style={{
            backgroundColor: "#121212",
            minHeight: "500px",
            borderRadius: "18px",
        }}
    >
        {/* Header */}
        <div
            className="position-absolute top-0 start-0 w-100 p-4 z-3"
            style={{
                background:
                    "linear-gradient(to bottom, rgba(0,0,0,.8), transparent)",
            }}
        >
            <div className="d-flex justify-content-between align-items-center">
                <div>
                    <h5 className="mb-1 fw-bold">
                        {isConnected
                            ? `${incomingCall?.callType === "audio"
                                ? "Voice"
                                : "Video"
                            } Call`
                            : `Incoming ${incomingCall?.callType === "audio"
                                ? "Voice"
                                : "Video"
                            } Call`}
                    </h5>

                    <small className="text-light opacity-75">
                        {incomingCall?.fromName || "Unknown User"}
                    </small>
                </div>

                {isConnected && (
                    <span className="badge bg-success px-3 py-2">
                        Connected
                    </span>
                )}
            </div>
        </div>

        {/* Main Content */}
        <div
            className="d-flex justify-content-center align-items-center w-100 h-100"
            style={{ minHeight: "500px" }}
        >
            {/* VIDEO CALL */}
            {incomingCall?.callType === "video" && (
                <>
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className={`position-absolute top-0 start-0 w-100 h-100 ${isConnected ? "opacity-100" : "opacity-0"
                            }`}
                        style={{
                            objectFit: "cover",
                            transition: "opacity .4s ease",
                        }}
                    />

                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`position-absolute bottom-0 end-0 m-3 rounded shadow border border-secondary ${isConnected ? "opacity-100" : "opacity-0"
                            }`}
                        style={{
                            width: "130px",
                            height: "170px",
                            objectFit: "cover",
                            zIndex: 100,
                            transition: "opacity .4s ease",
                        }}
                    />
                </>
            )}

            {/* VOICE CALL */}
            {incomingCall?.callType === "audio" && (
                <div className="text-center">
                    <div
                        className="rounded-circle bg-secondary d-flex align-items-center justify-content-center mx-auto mb-4"
                        style={{
                            width: "140px",
                            height: "140px",
                            fontSize: "4rem",
                            fontWeight: "bold",
                        }}
                    >
                        {incomingCall?.fromName?.charAt(0)?.toUpperCase()}
                    </div>

                    <h3 className="mb-2">
                        {incomingCall?.fromName}
                    </h3>

                    <p className="text-muted">
                        {isConnected
                            ? "Voice call connected"
                            : "Incoming voice call"}
                    </p>
                </div>
            )}

            {/* Ringing Screen */}
            {!isConnected && !connecting && (
                <div
                    className="position-absolute text-center"
                    style={{ zIndex: 20 }}
                >
                    <div
                        className="rounded-circle bg-secondary d-flex align-items-center justify-content-center mx-auto mb-4"
                        style={{
                            width: "110px",
                            height: "110px",
                            fontSize: "3rem",
                            fontWeight: "bold",
                        }}
                    >
                        {incomingCall?.fromName?.charAt(0)?.toUpperCase()}
                    </div>

                    <h4>{incomingCall?.fromName}</h4>

                    <p className="text-light opacity-75">
                        Incoming{" "}
                        {incomingCall?.callType === "audio"
                            ? "Voice"
                            : "Video"}{" "}
                        Call
                    </p>
                </div>
            )}

            {/* Connecting */}
            {connecting && (
                <div
                    className="position-absolute text-center"
                    style={{ zIndex: 20 }}
                >
                    <Spinner animation="grow" />

                    <p className="mt-3 text-light">
                        Connecting...
                    </p>
                </div>
            )}
        </div>

        {/* Bottom Controls */}
        <div
            className="position-absolute bottom-0 start-0 w-100 p-4 d-flex justify-content-center gap-4"
            style={{
                background:
                    "linear-gradient(to top, rgba(0,0,0,.8), transparent)",
                zIndex: 200,
            }}
        >
            {!isConnected ? (
                <>
                    <Button
                        variant="success"
                        onClick={handleAccept}
                        disabled={connecting}
                        className="rounded-circle border-0 shadow"
                        style={{
                            width: "70px",
                            height: "70px",
                        }}
                    >
                        <FaPhoneAlt size={28} />
                    </Button>

                    <Button
                        variant="danger"
                        onClick={handleReject}
                        className="rounded-circle border-0 shadow"
                        style={{
                            width: "70px",
                            height: "70px",
                        }}
                    >
                        <FaPhoneSlash size={28} />
                    </Button>
                </>
            ) : (
                <Button
                    variant="danger"
                    onClick={handleEndCall}
                    className="rounded-pill px-4 py-2 fw-semibold shadow"
                >
                    <FaPhoneSlash className="me-2" />
                    End Call
                </Button>
            )}
        </div>
    </Modal.Body>
</Modal>
    );
};

export default IncomingCall;