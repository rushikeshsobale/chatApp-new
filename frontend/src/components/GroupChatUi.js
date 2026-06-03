import React, { useEffect, useState, useRef } from 'react';
import EmojiPicker from 'emoji-picker-react';
import '../css/Chat.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckDouble,
  faSmile,
  faCheck,
  faPaperPlane,
  faPaperclip
} from '@fortawesome/free-solid-svg-icons';
import { CiMenuKebab } from "react-icons/ci";
import { FaArrowLeft } from 'react-icons/fa';
import CryptoUtils from '../utils/CryptoUtils'; // 🔐 Keeping the valid default import
import { fetchMessage } from '../services/messageService';

const GroupChatUi = ({ group, userId, socket, onBack }) => {
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [groupKey, setGroupKey] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showAttachmentPopup, setShowAttachmentPopup] = useState(false);
  const [userPrivateKey, setUserPrivateKey] = useState(null);
  const [loading, setIsLoading] = useState(false);
  const apiUrl = process.env.REACT_APP_API_URL;

  const getSender = (senderId) => {
    if (typeof senderId === "object") return senderId;
    return group?.participants?.find((p) => p._id === senderId);
  };

  // Load private key on mount
  useEffect(() => {
    const initializeKey = async () => {
      setIsLoading(true);
      try {
        const key = await CryptoUtils.loadKeyLocally();
        if (key) {
          setUserPrivateKey(key);
        } else {
          console.warn("No Private Key found in local storage.");
        }
      } catch (err) {
        console.error("Error accessing IndexedDB:", err);
      } finally {
        setIsLoading(false);
      }
    };
    initializeKey();
  }, []);

  // Decrypt group key once private key is loaded
  useEffect(() => {
    const loadGroupKey = async () => {
      if (!userPrivateKey || !group) return;
      try {
        // Fixed: Access function via default CryptoUtils object
        const decryptedKey = await CryptoUtils.decryptGroupKey(group, userPrivateKey);
        setGroupKey(decryptedKey);
      } catch (err) {
        console.error("Error decrypting group key:", err);
      }
    };
    loadGroupKey();
  }, [userPrivateKey, group]);

  // 🔐 Decrypt incoming live messages (Socket)
  useEffect(() => {
    if (!socket) return;

    socket.on('fetchMessage', async (data) => {
      try {
        if (!groupKey || !data.content) return;
        
        // Fixed: Access function via default CryptoUtils object
        const decryptedContent = await CryptoUtils.decryptGroupMessage(
          JSON.parse(data.content),
          groupKey
        );
        
        const finalMessage = {
          ...data,
          content: decryptedContent,
        };
        
        if (data.senderId !== userId) {
          setMessages((prev) => [...prev, finalMessage]);
        }
      } catch (err) {
        console.error("Decrypt error:", err);
      }
    });

    return () => socket.off('fetchMessage');
  }, [socket, userId, groupKey]);

  // Listen for realtime group room events
  useEffect(() => {
    if (!socket) return;

    socket.on("receiveGroupMessage", async (data) => {
      try {
        if (!groupKey || !data.content) return;

        // Fixed: Access function via default CryptoUtils object
        const decryptedContent = await CryptoUtils.decryptGroupMessage(
          JSON.parse(data.content),
          groupKey
        );

        setMessages(prev => [
          ...prev,
          { ...data, content: decryptedContent }
        ]);

      } catch (err) {
        console.error("Realtime decryption error:", err);
      }
    });

    // Fixed: Standardized cleanup string name targeting your real hook channel listener
    return () => socket.off("receiveGroupMessage");
  }, [socket, groupKey]);

  // Join and Leave Socket Group Rooms
  useEffect(() => {
    if (!group?._id || !socket) return;

    socket.emit("joinGroup", group._id);

    return () => {
      socket.emit("leaveGroup", group._id);
    };
  }, [group, socket]);

  const sendMessage = async (attachment) => {
    if ((!messageInput.trim() && !attachment) || !groupKey) return;
    try {
      // Fixed: Access function via default CryptoUtils object
      const encryptedPayload = await CryptoUtils.encryptGroupMessage(
        messageInput,
        groupKey
      );
      
      const formData = new FormData();
      formData.append('senderId', userId);
      formData.append('groupId', group._id);
      formData.append('content', JSON.stringify(encryptedPayload));
      
      if (attachment) {
        formData.append('attachment', attachment);
      }
      
      const response = await fetch(`${apiUrl}/messages/postGroupMessage`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      const normalizedMessage = {
        ...data,
        content: messageInput
      };
      
      setMessages((prev) => [...prev, normalizedMessage]);
      socket.emit('sendGroupMessage', data);
      setMessageInput('');
      setSelectedFile(null);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleEmojiClick = (emojiObject) => {
    setMessageInput((prev) => prev + emojiObject.emoji);
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

  const darkThemeStyles = {
    container: { backgroundColor: '#0f0f0f', color: '#e0e0e0' },
    header: { backgroundColor: '#121212', borderBottom: '1px solid #222' },
    sentBubble: { backgroundColor: '#ffffff', color: '#000' },
    receivedBubble: { backgroundColor: '#1e1e1e', color: '#e0e0e0', border: '1px solid #333' },
    inputArea: { backgroundColor: '#121212', borderTop: '1px solid #222' }
  };

  const callFetchMessages = async (page = 1, limit = 20) => {
    if (!group || !groupKey) return;
    try {
      const data = await fetchMessage(group._id, page, limit);
      if (!data || data.length === 0) return;
      
      // 🔐 Decrypt all historical messages
      const decryptedMessages = await Promise.all(
        data.map(async (msg) => {
          try {
            if (!msg.content) return msg;
            // Fixed: Access function via default CryptoUtils object
            const decryptedText = await CryptoUtils.decryptGroupMessage(
              JSON.parse(msg.content),
              groupKey
            );
            return {
              ...msg,
              content: decryptedText,
            };
          } catch (err) {
            return {
              ...msg,
              content: "[Unable to decrypt]",
            };
          }
        })
      );

      if (limit === 1) {
        setMessages((prev) => [...prev, decryptedMessages[0]]);
      } else {
        setMessages((prev) =>
          page === 1
            ? decryptedMessages.reverse()
            : [...decryptedMessages.reverse(), ...prev]
        );
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  useEffect(() => {
    if (group && groupKey) {
      callFetchMessages();
    }
  }, [group, groupKey]);

  return (
    <div className="chat-ui-container" style={darkThemeStyles.container}>
      <div className="chat-header px-3 py-2 d-flex justify-content-between align-items-center" style={darkThemeStyles.header}>
        <div className="d-flex align-items-center">
          <button className="back-button text-muted me-3" onClick={onBack}>
            <FaArrowLeft/>
          </button>
          <div className="d-flex align-items-center">
            <img
              src={group?.groupAvatar || "https://via.placeholder.com/40"}
              alt=""
              className="rounded-circle me-2"
              style={{ height: '40px', width: '40px', objectFit: 'cover' }}
            />
            <p className="mb-0 small text-white">{group?.groupName || "Group Chat"}</p>
          </div>
        </div>
        <CiMenuKebab size={20} />
      </div>

      {/* MESSAGES AREA */}
      <div className="messages-area px-3" style={{ height: 'calc(100vh - 140px)', overflowY: 'auto' }}>
        {messages.map((message, index) => {
          const sender = getSender(message.senderId);
          const isMe = sender?._id === userId;
          const time = message?.timestamp || message?.createdAt;
          return (
            <div key={index} className={`d-flex flex-column mb-3 ${isMe ? 'align-items-end' : 'align-items-start'}`}>
              {!isMe && sender && (
                <div className="d-flex align-items-center mb-1">
                  <img
                    src={sender?.profilePicture || "https://via.placeholder.com/18"}
                    className="rounded-circle me-2"
                    alt=""
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '0.7rem' }}>{sender?.userName || "Unknown"}</span>
                </div>
              )}
              <div
                className="px-3 py-2 rounded-4"
                style={isMe ? darkThemeStyles.sentBubble : darkThemeStyles.receivedBubble}
              >
                {message.content}
                <div className={`mt-1 ${isMe ? 'text-end' : ''}`} style={{ fontSize: '0.65rem', opacity: 0.6 }}>
                  {time ? new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                  {isMe && (
                    <FontAwesomeIcon
                      icon={message?.status === 'read' ? faCheckDouble : faCheck}
                      className="ms-1"
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT CONTROLS AREA */}
      <div className="p-3" style={darkThemeStyles.inputArea}>
        <div className="input-controls">
          <button className="attachment-button" onClick={() => setShowAttachmentPopup(!showAttachmentPopup)}>
            <FontAwesomeIcon icon={faPaperclip} />
          </button>
          <input
            type="text"
            ref={inputRef}
            className="message-input"
            placeholder="Type a message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage(selectedFile)}
          />
          <button className="emoji-button" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
            <FontAwesomeIcon icon={faSmile} />
          </button>
          <button
            className="send-button"
            onClick={() => sendMessage(selectedFile)}
            disabled={!messageInput.trim() && !selectedFile}
          >
            <FontAwesomeIcon icon={faPaperPlane} />
          </button>
        </div>
        {showEmojiPicker && (
          <div className="position-absolute bottom-100 end-0 z-3">
            <EmojiPicker onEmojiClick={handleEmojiClick} />
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupChatUi;