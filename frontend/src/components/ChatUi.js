import React, { useEffect, useState, useRef, useContext } from 'react';
import EmojiPicker from 'emoji-picker-react';
import '../css/Chat.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { deleteMessages } from '../services/messageService';
import { ThemeContext } from "../contexts/ThemeContext";
import {

  FaPhone,
  FaVideo,
  FaEllipsisV
} from "react-icons/fa";
import {
  faCheckDouble,
  faEllipsisV,
  faTrashAlt,
  faSmile,
  faCheck,
  faPaperPlane,
  faPaperclip,
  faImage,
  faVideo,
  faFileAlt

} from '@fortawesome/free-solid-svg-icons';
import { FaArrowLeft } from 'react-icons/fa';
import { UserContext } from '../contexts/UserContext';
import CryptoUtils from '../utils/CryptoUtils';
import { fetchMessage } from '../services/messageService';
import { callSendMessage } from '../services/messageService';
import OutGoingCall from './videoCall/OutGoingCall';


const ChatUi = ({ conversation, member, setMsgCounts, onBack }) => {
  const { socket, user } = useContext(UserContext);
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [userPrivateKey, setUserPrivateKey] = useState(null);
  const [receiverCryptoKey, setReceiverCryptoKey] = useState(null);
  const [decryptedMessages, setDecryptedMessages] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentPopup, setShowAttachmentPopup] = useState(false);
  const [senderPublicKey, setSenderPublicKey] = useState(null);
  const [typingUser, setTypingUser] = useState(null);
  const [outgoingCallType, setOutgoingCallType] = useState(null);
  // null | "audio" | "video"
  const userId = user?._id;
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const CallMessage = ({ message }) => {
    const { callType, callStatus, duration } =
      message.callDetails || {};

    const formatDuration = (seconds = 0) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;

      const isOutgoing =
        message.senderId === user.id;
      return `${mins}m ${secs}s`;
    };

    return (
      <div className="text-center my-2">
        <div className="d-inline-block p-2 rounded bg-secondary-subtle">
          <div>
            {callType === "video" ? "📹" : "📞"}{" "}
            {callType === "video"
              ? "Video Call"
              : "Voice Call"}
          </div>

          <small>
            {callStatus === "completed" &&
              `Duration: ${formatDuration(duration)}`}
            {callStatus === "missed" && "Missed Call"}
            {callStatus === "rejected" && "Rejected"}
            {callStatus === "cancelled" && "Cancelled"}
          </small>
        </div>
      </div>
    );
  };
  // 1. Crypto Init & Initial Fetch
  useEffect(() => {
    const init = async () => {
      const key = await CryptoUtils.loadKeyLocally();
      if (key) setUserPrivateKey(key);

      if (member?.publicKey) {
        const imported = await CryptoUtils.importPublicKeyString(member.publicKey);
        setReceiverCryptoKey(imported);
      }

      if (user?.publicKey) {
        const imported = await CryptoUtils.importPublicKeyString(user.publicKey);
        setSenderPublicKey(imported);
      }
      setIsLoading(false);
    };
    init();
    callFetchMessages();
  }, [member]);


  useEffect(() => {
    if (!socket) return;

    const handleRead = ({ messageId }) => {
      if (messageId) {
        setMessages(prev => {
          return prev.map(msg =>
            msg._id === messageId
              ? {
                ...msg,
                status: "read",
              }
              : msg
          );
        });
      }
      else {
        setMessages(prev =>
          prev.map(msg => {
            if (
              msg.conversationId === conversation._id &&
              msg.senderId === user._id &&
              msg.status !== "read"
            ) {
              return {
                ...msg,
                status: "read",
              };
            }

            return msg;
          })
        );
      }


    };

    socket.on(
      "message:read_received",
      handleRead
    );

    return () => {
      socket.off(
        "message:read_received",
        handleRead
      );
    };
  }, [socket]);

  // 2. BACKEND EVENT: Listening for incoming messages
  useEffect(() => {
    if (!socket) return;

    const handleIncomingMessage = (incomingMessage) => {
      const sender = incomingMessage.senderId?._id || incomingMessage.senderId;

      // Safety filter: ensure the incoming message belongs to this active chat window
      if (sender !== member._id) return;

      setMessages(prev => {
        const exists = prev.some(m => m._id === incomingMessage._id);
        if (exists) return prev;
        return [...prev, incomingMessage];
      });

      socket.emit("message:read", {
        receiverId: sender,
        message: incomingMessage,
      });
    };

    socket.on("message:received", handleIncomingMessage);

    return () => {
      socket.off("message:received", handleIncomingMessage);
    };
  }, [socket, member]);

  // 3. BACKEND EVENTS: Listening for incoming typing signals
  useEffect(() => {
    if (!socket) return;

    const handleTypingStart = ({ senderId }) => {
      if (senderId === member._id) setTypingUser(senderId);
    };

    const handleTypingStop = ({ senderId }) => {
      if (senderId === member._id) setTypingUser(null);
    };

    socket.on("message:typing_received", handleTypingStart);
    socket.on("message:typing_stop_received", handleTypingStop);

    return () => {
      socket.off("message:typing_received", handleTypingStart);
      socket.off("message:typing_stop_received", handleTypingStop);
    };
  }, [socket, member]);

  // 4. BACKEND EMIT: Emitting message send actions
  const sendMessage = async (attachment) => {
    if (!messageInput.trim() && !attachment) return;
    try {
      let finalContentPayload = "";
      if (messageInput.trim()) {
        const encrypted = await CryptoUtils.encryptDirectMessage(
          messageInput,
          senderPublicKey,
          receiverCryptoKey
        );
        finalContentPayload = JSON.stringify(encrypted);
      }
      const formData = new FormData();
      formData.append('senderId', user._id);
      formData.append('receiverId', member._id);
      formData.append('content', finalContentPayload);
      if (attachment) formData.append('attachment', attachment);
      const response = await callSendMessage(formData);
      socket.emit("message:send", {
        receiverId: member._id,
        message: response.message,
      });

      setMessages((prev) => [...prev, response.message]);
      setMessageInput('');
      setSelectedFile(null);
    } catch (error) {
      console.error('Sending failure:', error);
    }
  };

  // 5. BACKEND EMIT: Emitting typing presence events
  const handleTyping = () => {
    if (socket) socket.emit("message:typing", { receiverId: member._id });
  };

  const handleBlur = () => {
    if (socket) socket.emit("message:typing_stop", { receiverId: member._id });
  };

  // 6. Message History Fetch Engine
  const callFetchMessages = async (page = 1, limit = 20) => {
    if (!conversation) return;
    try {
      const data = await fetchMessage(conversation._id, page, limit);
      if (!data || data.length === 0) return;

      if (limit === 1) {
        setMessages((prev) => {
          if (prev.find(m => m._id === data[0]._id)) return prev;
          return [...prev, data[0]];
        });
      } else {
        setMessages(() => data.reverse());
      }
    } catch (error) {
      console.error("Error fetching chat layout context:", error);
    }
  };

  // Decryption Routine Pipeline
  useEffect(() => {
    if (!userPrivateKey || messages.length === 0) return;
    let cancelled = false;

    const processDecryptionPipeline = async () => {
      const result = {};
      for (const msg of messages) {
        try {
          const clearText = await CryptoUtils.decryptMessage(msg, userPrivateKey, userId);
          if (!cancelled) result[msg._id || Math.random()] = clearText;
        } catch (err) {
          result[msg._id] = "⚠️ Decryption Error";
        }
      }
      if (!cancelled) setDecryptedMessages(result);
    };

    processDecryptionPipeline();
    return () => { cancelled = true; };
  }, [messages, userPrivateKey, userId]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    console.log(messages);
    scrollToBottom();
    setMsgCounts((prevCounts) => ({ ...prevCounts, [member?._id]: 0 }));
  }, [messages]);

  const handleEmojiClick = (emojiObject) => setMessageInput((prev) => prev + emojiObject.emoji);

  const handleFileSelect = (type) => {
    setShowAttachmentPopup(false);
    const input = document.createElement("input");
    input.type = "file";
    if (type === "image") input.accept = "image/*";
    if (type === "video") input.accept = "video/*";
    if (type === "document") input.accept = ".pdf,.doc,.docx,.txt";

    input.onchange = (event) => {
      const file = event.target.files[0];
      if (file) setSelectedFile(file);
    };
    input.click();
  };

  const { isDark } = useContext(ThemeContext);
  const themeBg = isDark ? "bg-dark text-light" : "bg-white text-dark";
  const headerFooterBg = isDark ? "bg-secondary text-white border-secondary" : "bg-light text-dark border-light";
  const messagesAreaBg = isDark ? "#121212" : "#f0f2f5";
  const sentBubbleBg = isDark ? "#005c4b" : "#d9fdd3";
  const receivedBubbleBg = isDark ? "#202c33" : "#ffffff";
  const bubbleTextColor = isDark ? "text-white" : "text-dark";

  return (
    <div className={`d-flex flex-column w-100 ${themeBg}`} style={{ height: "100vh", overflow: "hidden" }}>
      {/* Header Row */}
      <div className={`d-flex align-items-center justify-content-between p-2 border-bottom ${headerFooterBg}`} style={{ height: '60px' }}>
        <div className="d-flex align-items-center justify-content-between w-100">

          <div className="d-flex align-items-center gap-2">
            <button className="btn p-1 text-inherit" onClick={onBack}>
              <FaArrowLeft size={18} />
            </button>

            <div className="d-flex align-items-center gap-2">
              <div
                className="position-relative"
                style={{ width: "40px", height: "40px" }}
              >
                <img
                  className="rounded-circle w-100 h-100"
                  style={{ objectFit: "cover" }}
                  src={member?.profilePicture}
                  alt="user"
                />

                {typingUser && (
                  <div
                    className="position-absolute bottom-0 end-0 bg-success rounded-circle"
                    style={{ width: "10px", height: "10px" }}
                  />
                )}
              </div>

              <div>
                <h6
                  className="m-0 text-truncate"
                  style={{ maxWidth: "120px" }}
                >
                  {member?.userName}
                </h6>

                <small className={isDark ? "text-light-50" : "text-muted"}>
                  {typingUser ? "typing..." : "online"}
                </small>
              </div>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-sm"
              onClick={() => setOutgoingCallType("audio")}
            >
              <FaPhone size={16} />
            </button>

            <button
              className="btn btn-sm"
              onClick={() => setOutgoingCallType("video")}
            >
              <FaVideo size={16} />
            </button>

            <button className="btn btn-sm">
              <FaEllipsisV size={16} />
            </button>
          </div>

        </div>


      </div>

      {/* Message Area */}
      <div className="flex-grow-1 p-3 overflow-y-auto" style={{ background: messagesAreaBg }}>
        {messages?.length === 0 ? (
          <div className="d-flex align-items-center justify-content-center h-100 text-muted">
            <p>Start a conversation with {member?.userName}!</p>
          </div>
        ) : (

          messages?.map((message, index) => {
            const isReceived = (message.receiverId?._id || message.receiverId) === userId;
            return (
              <div key={message._id || index} className={`d-flex mb-2 ${isReceived ? 'justify-content-start' : 'justify-content-end'}`}>
                <div className={`p-2 rounded-3 shadow-sm position-relative ${bubbleTextColor}`} style={{ backgroundColor: isReceived ? receivedBubbleBg : sentBubbleBg, maxWidth: "75%", minWidth: "60px" }}>
                  <div className="small text-break mb-1">
                    {decryptedMessages[message._id] ? decryptedMessages[message._id] : "…hi"}
                  </div>

                  {message?.attachment && (
                    <div className="mt-1 mb-1 rounded overflow-hidden">
                      {message.attachment.type === 'image' && (
                        <img src={message.attachment.name} alt="Attachment" className="img-fluid w-100" style={{ maxHeight: "200px", objectFit: "cover" }} />
                      )}
                      {message.attachment.type === 'video' && (
                        <video controls className="w-100" style={{ maxHeight: "200px" }}>
                          <source src={message.attachment.name} type="video/mp4" />
                        </video>
                      )}
                      {(!message.attachment.type || message.attachment.type === 'file') && (
                        <a href={message.attachment.name} target="_blank" rel="noopener noreferrer" className="d-flex align-items-center gap-2 p-2 border rounded text-decoration-none small text-truncate">
                          <FontAwesomeIcon icon={faFileAlt} />
                          <span>{message.attachment.name || 'Download File'}</span>
                        </a>
                      )}
                    </div>
                  )}

                  {message.messageType === "call_log" && (
                    <CallMessage message={message} />

                  )}
                  <div className="d-flex align-items-center justify-content-end gap-1" style={{ fontSize: "0.65rem", opacity: 0.7 }}>
                    <span>{new Date(message?.timestamp || message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {!isReceived && (
                      <span className={message?.status === 'read' ? 'text-info' : ''}>
                        <FontAwesomeIcon icon={message?.status === 'read' ? faCheckDouble : faCheck} />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Dock Panel */}
      <div className={`p-2 border-top position-relative ${headerFooterBg}`}>
        {showAttachmentPopup && (
          <div className={`position-absolute bottom-100 start-0 m-2 p-2 rounded shadow ${isDark ? 'bg-secondary' : 'bg-white'}`} style={{ zIndex: 1050 }}>
            <div className="d-flex flex-column gap-1">
              <button className="btn btn-sm text-start text-reset" onClick={() => handleFileSelect("image")}>
                <FontAwesomeIcon icon={faImage} className="me-2" /> Photo
              </button>
              <button className="btn btn-sm text-start text-reset" onClick={() => handleFileSelect("video")}>
                <FontAwesomeIcon icon={faVideo} className="me-2" /> Video
              </button>
              <button className="btn btn-sm text-start text-reset" onClick={() => handleFileSelect("document")}>
                <FontAwesomeIcon icon={faFileAlt} className="me-2" /> Document
              </button>
            </div>
          </div>
        )}

        {showEmojiPicker && (
          <div className="position-absolute bottom-100 end-0 m-2 shadow" style={{ zIndex: 1050 }}>
            <EmojiPicker onEmojiClick={handleEmojiClick} width={280} height={320} theme={isDark ? "dark" : "light"} />
          </div>
        )}

        <div className="d-flex align-items-center gap-1">
          <button className="btn border-0 p-2 text-reset" onClick={() => setShowAttachmentPopup(!showAttachmentPopup)}>
            <FontAwesomeIcon icon={faPaperclip} />
          </button>

          <input
            type="text"
            ref={inputRef}
            className={`form-control form-control-sm border-0 ${isDark ? 'bg-dark text-white' : 'bg-white text-dark'}`}
            placeholder="Type a message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onFocus={handleTyping}
            onBlur={handleBlur}
            style={{ borderRadius: "20px" }}
          />

          <button className="btn border-0 p-2 text-reset" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
            <FontAwesomeIcon icon={faSmile} />
          </button>

          <button className="btn btn-success rounded-circle d-flex align-items-center justify-content-center p-2" onClick={() => sendMessage(selectedFile)} disabled={!messageInput.trim() && !selectedFile} style={{ width: "36px", height: "36px" }}>
            <FontAwesomeIcon icon={faPaperPlane} size="sm" className="text-white" />
          </button>
        </div>

        {selectedFile && (
          <div className="d-flex align-items-center justify-content-between p-1 mt-2 border rounded bg-opacity-10 bg-black small">
            <span className="text-truncate px-1">{selectedFile.name}</span>
            <button className="btn btn-sm py-0 text-danger" onClick={() => setSelectedFile(null)}>×</button>
          </div>
        )}
      </div>
      {outgoingCallType && (
        <OutGoingCall
          conversation={conversation}
          show={true}
          member={member}
          callType={outgoingCallType}
          onCancel={() => setOutgoingCallType(null)}
        />
      )}
    </div>
  );
};

export default ChatUi;