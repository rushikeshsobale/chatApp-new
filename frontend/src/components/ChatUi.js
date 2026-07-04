import React, { useEffect, useState, useRef, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import EmojiPicker from 'emoji-picker-react';
import '../css/chat-bubbles.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { clearChat } from '../services/messageService';
import { blockUser, unblockUser, getBlockStatus } from '../services/relationships';
import { muteConversation, archiveConversation } from '../services/conversations';
import { ThemeContext } from "../contexts/ThemeContext";
import {
  FaArrowLeft,
  FaPhone,
  FaVideo,
  FaEllipsisV,
  FaUserCircle,
  FaBan,
  FaTrashAlt,
  FaBellSlash,
  FaBell,
  FaArchive,

} from "react-icons/fa";
import {
  faDownload,
  faCheckDouble,
  faSmile,
  faCheck,
  faPaperPlane,
  faPaperclip,
  faImage,
  faVideo,
  faFileAlt

} from '@fortawesome/free-solid-svg-icons';

import { UserContext } from '../contexts/UserContext';
import CryptoUtils from '../utils/CryptoUtils';
import { fetchMessage } from '../services/messageService';
import { callSendMessage } from '../services/messageService';
import OutGoingCall from './videoCall/OutGoingCall';
import MessageReactions from './MessageReactions';
import ReactionMenu from './ReactionMenu';

// Groups consecutive messages from the same side into one visual "burst"
// (a single card) as long as they're within a few minutes of each other —
// a derived view only, the underlying flat `messages` state/handlers are
// untouched.
const BURST_GAP_MS = 5 * 60 * 1000;

function groupMessagesIntoBursts(messages, userId) {
  const bursts = [];
  for (const message of messages) {
    const isReceived = (message.receiverId?._id || message.receiverId) === userId;
    const time = new Date(message?.timestamp || message.createdAt).getTime();
    const last = bursts[bursts.length - 1];
    const sameSide = last && last.isReceived === isReceived;
    const withinGap = last && time - last.lastTime <= BURST_GAP_MS;

    if (sameSide && withinGap) {
      last.messages.push(message);
      last.lastTime = time;
    } else {
      bursts.push({ isReceived, messages: [message], lastTime: time });
    }
  }
  return bursts;
}

const ChatUi = ({ conversation, member, setMsgCounts, onBack, setSelectedConversation }) => {
  const { socket, user } = useContext(UserContext);
  const navigate = useNavigate();
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
  const [activeReactionMessage, setActiveReactionMessage] = useState(null);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [blockStatus, setBlockStatus] = useState({ blockedByMe: false, blockedMe: false });
  // null | "audio" | "video"
  const userId = user?._id;
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const headerMenuRef = useRef(null);
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
    console.log(member)
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

  // Block status between the current user and this chat's member
  useEffect(() => {
    if (!member?._id) return;
    let cancelled = false;
    getBlockStatus(member._id)
      .then((status) => {
        if (!cancelled && status) setBlockStatus(status);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [member]);

  // Close the header "..." dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target)) {
        setShowHeaderMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // BACKEND EVENT: the other participant deleted a message they sent us
  useEffect(() => {
    if (!socket) return;

    const handleDeleted = ({ messageId }) => {
      setMessages(prev => prev.filter(m => m._id !== messageId));
    };

    socket.on("message:deleted", handleDeleted);

    return () => {
      socket.off("message:deleted", handleDeleted);
    };
  }, [socket]);


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
              msg.conversationId === conversation?._id &&
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

  // BACKEND EVENT: Listening for the other participant's reactions
  // (the reactor's own client is updated via the message:react ack instead)
  useEffect(() => {
    if (!socket) return;

    const handleReacted = ({ messageId, reactions }) => {
      setMessages(prev =>
        prev.map(msg =>
          msg._id === messageId ? { ...msg, reactions } : msg
        )
      );
    };

    socket.on("message:reacted", handleReacted);

    return () => {
      socket.off("message:reacted", handleReacted);
    };
  }, [socket]);

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

      // First message in a brand-new chat: the conversation didn't exist
      // client-side until the backend just created it. Report it back up
      // so the parent stops passing conversation=null (history refetch,
      // sidebar entry, calls, etc. all key off this).
      if (!conversation?._id && setSelectedConversation) {
        setSelectedConversation({
          _id: response.conversationId || response.message.conversationId,
          participants: [user, member],
          lastMessage: response.message,
          unreadCount: { [user._id]: 0, [member._id]: 0 },
          updatedAt: new Date(),
        });
      }

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
    if (!conversation) {
      setMessages([]);
      return
    };
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

  const handleViewContact = () => {
    setShowHeaderMenu(false);
    if (member?._id) navigate(`/ProfilePage/${member._id}`);
  };

  const handleClearChat = async () => {
    setShowHeaderMenu(false);
    if (!conversation?._id) return;
    if (!window.confirm("Clear all messages in this chat? This can't be undone.")) return;
    try {
      await clearChat(conversation._id);
      setMessages([]);
      setDecryptedMessages({});
    } catch (error) {
      console.error("Failed to clear chat:", error);
    }
  };

  const handleToggleBlock = async () => {
    setShowHeaderMenu(false);
    if (!member?._id) return;
    try {
      if (blockStatus.blockedByMe) {
        await unblockUser(member._id);
        setBlockStatus((prev) => ({ ...prev, blockedByMe: false }));
      } else {
        if (!window.confirm(`Block ${member?.userName || "this user"}? They won't be able to message you.`)) return;
        await blockUser(member._id);
        setBlockStatus((prev) => ({ ...prev, blockedByMe: true }));
      }
    } catch (error) {
      console.error("Failed to toggle block state:", error);
    }
  };

  const handleToggleMute = async () => {
    setShowHeaderMenu(false);
    if (!conversation?._id) return;
    try {
      const updated = await muteConversation(conversation._id, !isMuted);
      setSelectedConversation(updated);
    } catch (error) {
      console.error("Failed to toggle mute state:", error);
    }
  };

  const handleToggleArchive = async () => {
    setShowHeaderMenu(false);
    if (!conversation?._id) return;
    try {
      const updated = await archiveConversation(conversation._id, !isArchived);
      setSelectedConversation(updated);
      onBack();
    } catch (error) {
      console.error("Failed to toggle archive state:", error);
    }
  };

  const handleDeleteMessage = (message) => {
    if (!socket) return;
    if (!window.confirm("Delete this message?")) return;
    socket.emit(
      "message:delete",
      {
        messageId: message._id,
        receiverId: member._id,
      },
      (response) => {
        if (response?.status === "ok") {
          setMessages((prev) => prev.filter((m) => m._id !== message._id));
        }
      }
    );
  };

  const handleReaction = (message, emoji) => {
    if (!socket) return;
    socket.emit(
      "message:react",
      {
        messageId: message._id,
        receiverId: member._id,
        emoji,
      },
      (response) => {
        if (response?.status === "ok") {
          setMessages(prev =>
            prev.map(msg =>
              msg._id === message._id
                ? { ...msg, reactions: response.reactions }
                : msg
            )
          );
        }
      }
    );
  };
  const isBlocked = blockStatus.blockedByMe || blockStatus.blockedMe;
  const isMuted = !!conversation?.mutedBy?.[userId];
  const isArchived = !!conversation?.archivedBy?.[userId];
  const { isDark } = useContext(ThemeContext);
  const messageBursts = useMemo(
    () => groupMessagesIntoBursts(messages, userId),
    [messages, userId]
  );

  return (
    <div className="chat-surface d-flex flex-column w-100" style={{ height: "100vh", overflow: "hidden" }}>
      {/* Header Row */}
      <div className="chat-surface d-flex align-items-center justify-content-between p-2 border-bottom chat-surface-line" style={{ height: '60px' }}>
        <div className="d-flex align-items-center justify-content-between w-100">

          <div className="d-flex align-items-center gap-2">
            <button className="btn p-1 text-inherit" onClick={onBack}>
              <FaArrowLeft size={18} />
            </button>

            <div className="d-flex align-items-center gap-2">
              <div className="avatar-ring is-online" style={{ width: "40px", height: "40px" }}>
                <img src={member?.profilePicture} alt="user" />
              </div>

              <div>
                <h6
                  className="m-0 text-truncate"
                  style={{ maxWidth: "120px" }}
                >
                  {member?.userName}
                </h6>

                <small style={{ color: "var(--color-ink-muted)" }}>
                  {typingUser ? "typing..." : "online"}
                </small>
              </div>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              className="chat-icon-btn"
              onClick={() => setOutgoingCallType("audio")}
            >
              <FaPhone size={14} />
            </button>

            <button
              className="chat-icon-btn"
              onClick={() => setOutgoingCallType("video")}
            >
              <FaVideo size={14} />
            </button>

            <div ref={headerMenuRef} className="position-relative">
              <button
                className="chat-icon-btn"
                onClick={() => setShowHeaderMenu((prev) => !prev)}
              >
                <FaEllipsisV size={14} />
              </button>

              {showHeaderMenu && (
                <div
                  className="chat-surface position-absolute end-0 shadow-lg rounded border chat-surface-line p-2"
                  style={{ top: "40px", width: "200px", zIndex: 1050 }}
                >
                  <button
                    className="d-flex align-items-center gap-2 p-2 rounded btn btn-link text-decoration-none w-100 text-start text-reset"
                    onClick={handleViewContact}
                  >
                    <FaUserCircle /> View Contact
                  </button>
                  <button
                    className="d-flex align-items-center gap-2 p-2 rounded btn btn-link text-decoration-none w-100 text-start text-reset"
                    onClick={handleClearChat}
                  >
                    <FaTrashAlt /> Clear Chat
                  </button>
                  <button
                    className="d-flex align-items-center gap-2 p-2 rounded btn btn-link text-decoration-none w-100 text-start text-reset"
                    onClick={handleToggleMute}
                  >
                    {isMuted ? <FaBell /> : <FaBellSlash />} {isMuted ? "Unmute Notifications" : "Mute Notifications"}
                  </button>
                  <button
                    className="d-flex align-items-center gap-2 p-2 rounded btn btn-link text-decoration-none w-100 text-start text-reset"
                    onClick={handleToggleArchive}
                  >
                    <FaArchive /> {isArchived ? "Unarchive Chat" : "Archive Chat"}
                  </button>
                  <button
                    className="d-flex align-items-center gap-2 p-2 rounded btn btn-link text-decoration-none w-100 text-start text-danger"
                    onClick={handleToggleBlock}
                  >
                    <FaBan /> {blockStatus.blockedByMe ? "Unblock User" : "Block User"}
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>


      </div>

      {(blockStatus.blockedByMe || blockStatus.blockedMe) && (
        <div className="chat-surface-muted text-center small py-1">
          {blockStatus.blockedByMe
            ? "You have blocked this user. Unblock to send messages."
            : "You can no longer message this user."}
        </div>
      )}

      {/* Message Area */}
      <div className="chat-surface-muted flex-grow-1 p-3 overflow-y-auto">
        {messageBursts.length === 0 ? (
          <div className="d-flex align-items-center justify-content-center h-100 text-muted">
            <p>Start a conversation with {member?.userName}!</p>
          </div>
        ) : (

          messageBursts.map((burst, burstIndex) => {
            const lastMessage = burst.messages[burst.messages.length - 1];
            return (
              <div
                key={burst.messages[0]._id || burstIndex}
                className={`d-flex ${burst.isReceived ? "justify-content-start" : "justify-content-end"}`}
              >
                <div className={`msg-burst ${burst.isReceived ? "" : "msg-burst-self"}`}>
                  {burst.isReceived && (
                    <p className="msg-burst-label">{member?.userName}</p>
                  )}

                  <div className="msg-burst-body">
                    {burst.messages.map((message) => (
                      <div key={message._id} className="msg-line">
                        {decryptedMessages[message._id] && (
                          <p className="msg-line-text">
                            {decryptedMessages[message._id]}
                          </p>
                        )}

                        {message?.attachment && (
                          <div className="chat-attachment">
                            {message.attachment.type === "image" && (
                              <img
                                src={message.attachment.name}
                                alt="Attachment"
                                className="img-fluid w-100"
                                style={{ maxHeight: "200px", objectFit: "cover", display: "block" }}
                              />
                            )}
                            {message.attachment.type === "video" && (
                              <video controls className="w-100" style={{ maxHeight: "200px" }}>
                                <source src={message.attachment.name} type="video/mp4" />
                              </video>
                            )}
                            {(!message.attachment.type || message.attachment.type === "file") && (
                              <a
                                href={message.attachment.name}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="chat-file-link"
                              >
                                <span className="chat-file-icon">
                                  <FontAwesomeIcon icon={faFileAlt} />
                                </span>
                                <span className="text-truncate flex-grow-1">
                                  {message.attachment.name || "Download File"}
                                </span>
                                <FontAwesomeIcon icon={faDownload} className="chat-file-download" />
                              </a>
                            )}
                          </div>
                        )}

                        {message.messageType === "call_log" && <CallMessage message={message} />}

                        <div className="msg-line-actions">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveReactionMessage((prev) =>
                                prev === message._id ? null : message._id
                              )
                            }
                            aria-label="React to message"
                          >
                            <FontAwesomeIcon icon={faSmile} />
                          </button>

                          {!burst.isReceived && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(message)}
                              aria-label="Delete message"
                            >
                              <FaTrashAlt />
                            </button>
                          )}
                        </div>

                        <MessageReactions reactions={message.reactions} isReceived={burst.isReceived} />

                        {activeReactionMessage === message._id && (
                          <ReactionMenu
                            isReceived={burst.isReceived}
                            onSelect={(emoji) => {
                              handleReaction(message, emoji);
                              setActiveReactionMessage(null);
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="chat-meta">
                    <span>
                      {new Date(lastMessage?.timestamp || lastMessage.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {!burst.isReceived && (
                      <span className={lastMessage?.status === "read" ? "chat-read" : ""}>
                        <FontAwesomeIcon icon={lastMessage?.status === "read" ? faCheckDouble : faCheck} />
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
      <div className="chat-surface p-2 border-top chat-surface-line position-relative">
        {showAttachmentPopup && (
          <div className="chat-surface position-absolute bottom-100 start-0 m-2 p-2 rounded shadow" style={{ zIndex: 1050 }}>
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

        <div className="d-flex align-items-center gap-2">
          <button className="chat-icon-btn" onClick={() => setShowAttachmentPopup(!showAttachmentPopup)} disabled={isBlocked}>
            <FontAwesomeIcon icon={faPaperclip} />
          </button>

          <input
            type="text"
            ref={inputRef}
            className="chat-pill-input"
            placeholder={isBlocked ? "You can't send messages in this chat" : "Type a message..."}
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onFocus={handleTyping}
            onBlur={handleBlur}
            disabled={isBlocked}
          />

          <button className="chat-icon-btn" onClick={() => setShowEmojiPicker(!showEmojiPicker)} disabled={isBlocked}>
            <FontAwesomeIcon icon={faSmile} />
          </button>

          <button className="chat-send-btn" onClick={() => sendMessage(selectedFile)} disabled={isBlocked || (!messageInput.trim() && !selectedFile)}>
            <FontAwesomeIcon icon={faPaperPlane} size="sm" />
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