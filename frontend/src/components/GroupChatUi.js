import React, { useEffect, useState, useRef, useContext, useMemo } from 'react';
import EmojiPicker from 'emoji-picker-react';
import '../css/chat-bubbles.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  FaArrowLeft,
  FaTrashAlt,
  FaUsers,
  FaEllipsisV,
  FaSignOutAlt,
  FaUserPlus,
} from "react-icons/fa";
import {
  faSmile,
  faCheck,
  faPaperPlane,
  faPaperclip,
  faImage,
  faVideo,
  faFileAlt

} from '@fortawesome/free-solid-svg-icons';

import { UserContext } from '../contexts/UserContext';
import { ThemeContext } from "../contexts/ThemeContext";
import CryptoUtils from '../utils/CryptoUtils';
import { fetchMessage } from '../services/messageService';
import { callSendMessage } from '../services/messageService';
import {
  getFriendsforGroupCreation,
  deleteGroup,
  addGroupMember,
  removeGroupMember,
  leaveGroup,
  updateGroupInfo,
} from '../services/conversations';
import MessageReactions from './MessageReactions';
import ReactionMenu from './ReactionMenu';

// Same burst-grouping idea as ChatUi.js, but a group has more than one
// "other side" — bursts only merge while the same person keeps sending,
// not just "same side", or two different members' messages would run
// together under one name.
const BURST_GAP_MS = 5 * 60 * 1000;

function groupMessagesIntoBursts(messages, userId) {
  const bursts = [];
  for (const message of messages) {
    const senderId = message.senderId?._id || message.senderId;
    const isReceived = senderId !== userId;
    const time = new Date(message?.timestamp || message.createdAt).getTime();
    const last = bursts[bursts.length - 1];
    const sameSender = last && last.senderId === senderId;
    const withinGap = last && time - last.lastTime <= BURST_GAP_MS;

    if (sameSender && withinGap) {
      last.messages.push(message);
      last.lastTime = time;
    } else {
      bursts.push({ isReceived, senderId, messages: [message], lastTime: time });
    }
  }
  return bursts;
}

const GroupChatUi = ({ conversation, setMsgCounts, onBack, setSelectedConversation }) => {
  const { socket, user } = useContext(UserContext);
  const { isDark } = useContext(ThemeContext);
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [decryptedMessages, setDecryptedMessages] = useState({});
  const [groupKey, setGroupKey] = useState(null);
  const [keyError, setKeyError] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentPopup, setShowAttachmentPopup] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]); // userIds currently typing
  const [activeReactionMessage, setActiveReactionMessage] = useState(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [editName, setEditName] = useState(conversation?.groupName || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [candidateFriends, setCandidateFriends] = useState([]);
  const [addSearch, setAddSearch] = useState('');
  const messagesEndRef = useRef(null);
  const userId = user?._id;

  const participantsById = useMemo(() => {
    const map = new Map();
    (conversation?.participants || []).forEach((p) => map.set(p._id, p));
    return map;
  }, [conversation?.participants]);

  const memberCount = conversation?.participants?.length || 0;
  const isAdmin = conversation?.groupAdmin === userId || conversation?.groupAdmin?._id === userId;

  useEffect(() => {
    setEditName(conversation?.groupName || '');
  }, [conversation?.groupName]);

  // Candidate members to add — friends who aren't already in the group.
  useEffect(() => {
    if (!showGroupInfo || !isAdmin) return;
    let cancelled = false;
    getFriendsforGroupCreation()
      .then((friends) => { if (!cancelled) setCandidateFriends(friends || []); })
      .catch(() => { if (!cancelled) setCandidateFriends([]); });
    return () => { cancelled = true; };
  }, [showGroupInfo, isAdmin]);

  const existingMemberIds = useMemo(
    () => new Set((conversation?.participants || []).map((p) => p._id)),
    [conversation?.participants]
  );
  const filteredCandidates = candidateFriends.filter((f) =>
    !existingMemberIds.has(f._id) && f.userName?.toLowerCase().includes(addSearch.toLowerCase())
  );

  // 1. Unwrap this conversation's shared group key with our private key,
  // then load message history.
  useEffect(() => {
    if (!conversation?._id) return;
    let cancelled = false;

    const init = async () => {
      setKeyError(false);
      const privateKey = await CryptoUtils.loadKeyLocally();
      const ownEntry = conversation.encryptedKeys?.find((k) => k.userId === userId || k.userId?._id === userId);

      if (!privateKey || !ownEntry) {
        if (!cancelled) setKeyError(true);
        return;
      }

      try {
        const key = await CryptoUtils.unwrapGroupKey(ownEntry.encryptedKey, privateKey);
        if (!cancelled) setGroupKey(key);
      } catch (err) {
        console.error("Failed to unwrap group key:", err);
        if (!cancelled) setKeyError(true);
      }
    };

    init();
    callFetchMessages();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation?._id]);

  const callFetchMessages = async (page = 1, limit = 30) => {
    if (!conversation?._id) { setMessages([]); return; }
    try {
      const data = await fetchMessage(conversation._id, page, limit);
      if (!data || data.length === 0) return;
      setMessages(() => data.reverse());
    } catch (error) {
      console.error("Error fetching group chat history:", error);
    }
  };

  // 2. Incoming messages for this conversation
  useEffect(() => {
    if (!socket || !conversation?._id) return;

    const handleIncomingMessage = (incomingMessage) => {
      if (String(incomingMessage.conversationId) !== String(conversation._id)) return;

      setMessages(prev => {
        const exists = prev.some(m => m._id === incomingMessage._id);
        if (exists) return prev;
        return [...prev, incomingMessage];
      });
    };

    socket.on("message:received", handleIncomingMessage);
    return () => socket.off("message:received", handleIncomingMessage);
  }, [socket, conversation?._id]);

  // 3. Typing indicators — a group can have more than one person typing
  useEffect(() => {
    if (!socket || !conversation?._id) return;

    const handleTypingStart = ({ senderId, conversationId }) => {
      if (String(conversationId) !== String(conversation._id)) return;
      setTypingUsers(prev => prev.includes(senderId) ? prev : [...prev, senderId]);
    };

    const handleTypingStop = ({ senderId, conversationId }) => {
      if (String(conversationId) !== String(conversation._id)) return;
      setTypingUsers(prev => prev.filter(id => id !== senderId));
    };

    socket.on("message:typing_received", handleTypingStart);
    socket.on("message:typing_stop_received", handleTypingStop);
    return () => {
      socket.off("message:typing_received", handleTypingStart);
      socket.off("message:typing_stop_received", handleTypingStop);
    };
  }, [socket, conversation?._id]);

  // 4. Reactions / deletions from other members
  useEffect(() => {
    if (!socket) return;

    const handleReacted = ({ messageId, reactions }) => {
      setMessages(prev => prev.map(msg => msg._id === messageId ? { ...msg, reactions } : msg));
    };

    const handleDeleted = ({ messageId }) => {
      setMessages(prev => prev.filter(m => m._id !== messageId));
    };

    socket.on("message:reacted", handleReacted);
    socket.on("message:deleted", handleDeleted);
    return () => {
      socket.off("message:reacted", handleReacted);
      socket.off("message:deleted", handleDeleted);
    };
  }, [socket]);

  // Decrypt whenever new messages arrive or the group key becomes available
  useEffect(() => {
    if (!groupKey || messages.length === 0) return;
    let cancelled = false;

    const decryptAll = async () => {
      const result = {};
      for (const msg of messages) {
        if (!msg.content) continue;
        result[msg._id] = await CryptoUtils.decryptGroupMessage(msg, groupKey);
      }
      if (!cancelled) setDecryptedMessages(result);
    };

    decryptAll();
    return () => { cancelled = true; };
  }, [messages, groupKey]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (attachment) => {
    if ((!messageInput.trim() && !attachment) || !groupKey) return;
    try {
      let finalContentPayload = "";
      if (messageInput.trim()) {
        const encrypted = await CryptoUtils.encryptGroupMessage(messageInput, groupKey);
        finalContentPayload = JSON.stringify(encrypted);
      }

      const formData = new FormData();
      formData.append('conversationId', conversation._id);
      formData.append('content', finalContentPayload);
      if (attachment) formData.append('attachment', attachment);

      const response = await callSendMessage(formData);
      socket.emit("message:send", { conversationId: conversation._id, message: response.message });

      setMessages((prev) => [...prev, response.message]);
      setMessageInput('');
      setSelectedFile(null);
    } catch (error) {
      console.error('Sending group message failed:', error);
    }
  };

  const handleTyping = () => {
    if (socket) socket.emit("message:typing", { conversationId: conversation._id });
  };

  const handleBlur = () => {
    if (socket) socket.emit("message:typing_stop", { conversationId: conversation._id });
  };

  const handleDeleteMessage = (message) => {
    if (!socket) return;
    if (!window.confirm("Delete this message?")) return;
    socket.emit(
      "message:delete",
      { messageId: message._id, conversationId: conversation._id },
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
      { messageId: message._id, conversationId: conversation._id, emoji },
      (response) => {
        if (response?.status === "ok") {
          setMessages(prev => prev.map(msg => msg._id === message._id ? { ...msg, reactions: response.reactions } : msg));
        }
      }
    );
  };

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

  const handleEmojiClick = (emojiObject) => setMessageInput((prev) => prev + emojiObject.emoji);

  const handleSaveGroupInfo = async () => {
    try {
      const updated = await updateGroupInfo(conversation._id, { groupName: editName, groupAvatar: avatarFile });
      setSelectedConversation(updated);
      setAvatarFile(null);
    } catch (err) {
      console.error("Failed to update group info:", err);
    }
  };

  const handleAddMember = async (friend) => {
    if (!groupKey || !friend.publicKey) return;
    try {
      const [{ encryptedKey }] = await CryptoUtils.wrapGroupKeyForMembers(groupKey, [
        { userId: friend._id, publicKey: friend.publicKey },
      ]);
      const updated = await addGroupMember(conversation._id, friend._id, encryptedKey);
      setSelectedConversation(updated);
    } catch (err) {
      console.error("Failed to add member:", err);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm("Remove this member from the group?")) return;
    try {
      const updated = await removeGroupMember(conversation._id, memberId);
      setSelectedConversation(updated);
    } catch (err) {
      console.error("Failed to remove member:", err);
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm("Leave this group?")) return;
    try {
      await leaveGroup(conversation._id);
      onBack();
    } catch (err) {
      console.error("Failed to leave group:", err);
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm("Delete this group for everyone? This can't be undone.")) return;
    try {
      await deleteGroup(conversation._id);
      onBack();
    } catch (err) {
      console.error("Failed to delete group:", err);
    }
  };

  const typingLabel = typingUsers
    .map((id) => participantsById.get(id)?.userName)
    .filter(Boolean)
    .join(", ");

  const messageBursts = useMemo(
    () => groupMessagesIntoBursts(messages, userId),
    [messages, userId]
  );

  return (
    <div className="chat-surface chat-shell d-flex flex-column w-100">
      {/* Header Row */}
      <div className="chat-surface d-flex align-items-center justify-content-between p-2 border-bottom chat-surface-line" style={{ height: '60px' }}>
        <div className="d-flex align-items-center gap-2 w-100">
          <button className="btn p-1 text-inherit" onClick={onBack}>
            <FaArrowLeft size={18} />
          </button>

          <div className="d-flex align-items-center gap-2">
            <div className="avatar-ring" style={{ width: "40px", height: "40px" }}>
              <img src={conversation?.groupAvatar} alt="group" />
            </div>

            <div>
              <h6 className="m-0 text-truncate" style={{ maxWidth: "180px" }}>
                {conversation?.groupName}
              </h6>
              <small style={{ color: "var(--color-ink-muted)" }}>
                {typingLabel ? `${typingLabel} typing...` : (
                  <span><FaUsers size={10} /> {memberCount} members</span>
                )}
              </small>
            </div>
          </div>

          <div className="position-relative ms-auto">
            <button className="chat-icon-btn" onClick={() => setShowGroupInfo((prev) => !prev)}>
              <FaEllipsisV size={14} />
            </button>

            {showGroupInfo && (
              <div
                className="chat-surface position-absolute end-0 shadow-lg rounded border chat-surface-line p-3"
                style={{ top: "44px", width: "300px", zIndex: 1050, maxHeight: "70vh", overflowY: "auto" }}
              >
                <h6 className="mb-3">Group Info</h6>

                {isAdmin && (
                  <div className="mb-3">
                    <input
                      type="text"
                      className="chat-pill-input mb-2 w-100"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Group name"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      className="form-control form-control-sm mb-2"
                      onChange={(e) => setAvatarFile(e.target.files[0])}
                    />
                    <button className="btn btn-sm btn-primary w-100" onClick={handleSaveGroupInfo}>
                      Save changes
                    </button>
                  </div>
                )}

                <div className="mb-3">
                  <strong className="small">Members ({memberCount})</strong>
                  <ul className="list-unstyled mt-2 mb-0">
                    {(conversation?.participants || []).map((p) => (
                      <li key={p._id} className="d-flex justify-content-between align-items-center py-1">
                        <span className="small text-truncate">
                          {p.userName}{(conversation.groupAdmin === p._id || conversation.groupAdmin?._id === p._id) ? " (admin)" : ""}
                        </span>
                        {isAdmin && p._id !== userId && (
                          <button className="btn btn-sm py-0 text-danger" onClick={() => handleRemoveMember(p._id)}>
                            Remove
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                {isAdmin && (
                  <div className="mb-3">
                    <strong className="small d-flex align-items-center gap-1"><FaUserPlus size={11} /> Add member</strong>
                    <input
                      type="text"
                      className="chat-pill-input my-2 w-100"
                      placeholder="Search friends..."
                      value={addSearch}
                      onChange={(e) => setAddSearch(e.target.value)}
                    />
                    <ul className="list-unstyled mb-0" style={{ maxHeight: "150px", overflowY: "auto" }}>
                      {filteredCandidates.map((f) => (
                        <li key={f._id} className="d-flex justify-content-between align-items-center py-1">
                          <span className="small text-truncate">{f.userName}</span>
                          <button className="btn btn-sm py-0 btn-outline-primary" onClick={() => handleAddMember(f)}>
                            Add
                          </button>
                        </li>
                      ))}
                      {filteredCandidates.length === 0 && (
                        <li className="small text-muted">No matching friends</li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="d-flex flex-column gap-2 mt-3 pt-2 border-top chat-surface-line">
                  <button className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center gap-2" onClick={handleLeaveGroup}>
                    <FaSignOutAlt /> Leave Group
                  </button>
                  {isAdmin && (
                    <button className="btn btn-sm btn-outline-danger d-flex align-items-center justify-content-center gap-2" onClick={handleDeleteGroup}>
                      <FaTrashAlt /> Delete Group
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {keyError && (
        <div className="text-center small py-2 px-3" style={{ color: "#ef4444" }}>
          Couldn't unlock this group's encryption key on this device — messages can't be sent or decrypted here.
        </div>
      )}

      {/* Message Area */}
      <div className="chat-surface-muted flex-grow-1 p-3 overflow-y-auto">
        {messageBursts.length === 0 ? (
          <div className="d-flex align-items-center justify-content-center h-100 text-muted">
            <p>Say hello to {conversation?.groupName}!</p>
          </div>
        ) : (
          messageBursts.map((burst, burstIndex) => {
            const lastMessage = burst.messages[burst.messages.length - 1];
            const sender = participantsById.get(burst.senderId);
            return (
              <div
                key={burst.messages[0]._id || burstIndex}
                className={`d-flex ${burst.isReceived ? "justify-content-start" : "justify-content-end"}`}
              >
                <div className={`msg-burst ${burst.isReceived ? "" : "msg-burst-self"}`}>
                  {burst.isReceived && (
                    <p className="msg-burst-label">{sender?.userName || "Unknown"}</p>
                  )}

                  <div className="msg-burst-body">
                    {burst.messages.map((message) => (
                      <div key={message._id} className="msg-line">
                        {decryptedMessages[message._id] && (
                          <p className="msg-line-text">{decryptedMessages[message._id]}</p>
                        )}

                        {message?.attachment && (
                          <div className="chat-attachment">
                            {message.attachment.type === "image" && (
                              <img src={message.attachment.name} alt="Attachment" className="img-fluid w-100" style={{ maxHeight: "200px", objectFit: "cover", display: "block" }} />
                            )}
                            {message.attachment.type === "video" && (
                              <video controls className="w-100" style={{ maxHeight: "200px" }}>
                                <source src={message.attachment.name} type="video/mp4" />
                              </video>
                            )}
                            {(!message.attachment.type || message.attachment.type === "file") && (
                              <a href={message.attachment.name} target="_blank" rel="noopener noreferrer" className="chat-file-link">
                                <span className="chat-file-icon"><FontAwesomeIcon icon={faFileAlt} /></span>
                                <span className="text-truncate flex-grow-1">{message.attachment.name || "Download File"}</span>
                              </a>
                            )}
                          </div>
                        )}

                        <div className="msg-line-actions">
                          <button
                            type="button"
                            onClick={() => setActiveReactionMessage((prev) => prev === message._id ? null : message._id)}
                            aria-label="React to message"
                          >
                            <FontAwesomeIcon icon={faSmile} />
                          </button>

                          {!burst.isReceived && (
                            <button type="button" onClick={() => handleDeleteMessage(message)} aria-label="Delete message">
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
                      {new Date(lastMessage?.timestamp || lastMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {!burst.isReceived && (
                      <span className={lastMessage?.status === "read" ? "chat-read" : ""}>
                        <FontAwesomeIcon icon={faCheck} />
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
          <button className="chat-icon-btn" onClick={() => setShowAttachmentPopup(!showAttachmentPopup)} disabled={!!keyError}>
            <FontAwesomeIcon icon={faPaperclip} />
          </button>

          <input
            type="text"
            className="chat-pill-input"
            placeholder={keyError ? "Encryption key unavailable" : "Message the group..."}
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onFocus={handleTyping}
            onBlur={handleBlur}
            disabled={!!keyError}
          />

          <button className="chat-icon-btn" onClick={() => setShowEmojiPicker(!showEmojiPicker)} disabled={!!keyError}>
            <FontAwesomeIcon icon={faSmile} />
          </button>

          <button className="chat-send-btn" onClick={() => sendMessage(selectedFile)} disabled={!!keyError || (!messageInput.trim() && !selectedFile)}>
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
    </div>
  );
};

export default GroupChatUi;
