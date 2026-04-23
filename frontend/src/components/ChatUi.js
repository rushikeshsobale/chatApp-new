import React, { useEffect, useState, useRef, useContext } from 'react';
import EmojiPicker from 'emoji-picker-react';
import '../css/Chat.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { createNotification } from '../services/notificationService'
import { deleteMessages } from '../services/messageService';
import {
  faCheckDouble,
  faEllipsisV,
  faTrashAlt,
  faSmile,
  faShare,
  faCheck,
  faPaperPlane,
  faPaperclip,
  faImage,
  faVideo,
  faFileAlt
} from '@fortawesome/free-solid-svg-icons';
import { FaArrowLeft, FaVideo } from 'react-icons/fa';
import { UserContext } from '../contexts/UserContext';
import OutGoingCall from './videoCall/OutGoingCall';
import { fetchUserKeys, recieverpublickey } from '../services/keyse2e';
import CryptoUtils from '../utils/CryptoUtils';
import { createOrGetConversation } from '../services/conversations';
import { fetchMessage } from '../services/messageService';
const ChatUi = ({ conversation, member, setMsgCounts, onBack, setSelectedConversation }) => {
  const { socket, loadUnseenMessages } = useContext(UserContext);
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typingUser, setTypingUser] = useState('');
  const messagesEndRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showAttachmentPopup, setShowAttachmentPopup] = useState(false);
  const apiUrl = process.env.REACT_APP_API_URL;
  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.userId;
  const [chatId, setChatId] = useState([userId, member._id].sort().join("_"));
  const inputRef = useRef(null);
  const messageTone = new Audio('https://bigsoundbank.com/UPLOAD/mp3/1313.mp3');
  const [showOutgoingCall, setOutgoingCall] = useState(false);
  const [decryptedMessages, setDecryptedMessages] = useState({});
  const [publicKey, setPublicKey] = useState(null);
  const [userPrivateKey, setUserPrivateKey] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [senderPublicKey, setSenderPublicKey] = useState(null);
  useEffect(() => {
    const initializeKey = async () => {
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

  useEffect(() => {
    recieverpublickey(member._id).then((publicKey) => {
      setPublicKey(publicKey);
    }).catch((error) => {
      console.error('Error fetching receiver public key:', error);
    });
  }, []);
  async function importReceiverPublicKey(base64Key) {
    const binary = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
    return await crypto.subtle.importKey(
      "spki",
      binary.buffer,
      {
        name: "RSA-OAEP",
        hash: "SHA-256"
      },
      true,
      ["encrypt"]
    );
  }
  const [receiverCryptoKey, setReceiverCryptoKey] = useState(null);
  useEffect(() => {
    if (!publicKey) return;
    async function loadKey() {
      const imported = await importReceiverPublicKey(publicKey);
      setReceiverCryptoKey(imported);
    }

    loadKey();
  }, [publicKey]);

  async function encryptForMultiple(text, receiverPublicKey, senderPublicKey) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);

    // 1. Generate a random AES-GCM key
    const aesKey = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
    // 2. Encrypt the message with that AES key
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      aesKey,
      data
    );
    const rawKey = await crypto.subtle.exportKey("raw", aesKey);
    const encryptedKeyForReceiver = await crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      receiverPublicKey,
      rawKey
    );

    const encryptedKeyForSender = await crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      senderPublicKey, // This is YOUR public key
      rawKey
    );

    return {
      ciphertext: arrayBufferToBase64(ciphertext),
      iv: arrayBufferToBase64(iv),
      // Send both versions in the payload
      keyForReceiver: arrayBufferToBase64(encryptedKeyForReceiver),
      keyForSender: arrayBufferToBase64(encryptedKeyForSender)
    };
  }
  async function encryptMessageForUser(message, receiverPublicKey) {

    // 1. Generate AES key
    const aesKey = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt"]
    );

    // 2. Encrypt message
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedMessage = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      aesKey,
      new TextEncoder().encode(message)
    );

    // 3. Export AES key
    const rawAesKey = await crypto.subtle.exportKey("raw", aesKey);
    // 4. Encrypt AES key using receiver public key
    const encryptedAesKey = await crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      receiverPublicKey,
      rawAesKey
    );

    return {
      ciphertext: arrayBufferToBase64(encryptedMessage),
      encryptedKey: arrayBufferToBase64(encryptedAesKey),
      iv: arrayBufferToBase64(iv)
    };
  }

  async function encryptForMultiple(text, receiverKey, senderKey) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    // Generate AES Session Key
    const aesKey = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, data);

    // Export AES key to encrypt it with RSA
    const rawAesKey = await crypto.subtle.exportKey("raw", aesKey);

    // Encrypt for Friend
    const encryptedKeyForReceiver = await crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      receiverKey,
      rawAesKey
    );
    // Encrypt for YOU (Sender)
    const encryptedKeyForSender = await crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      senderKey,
      rawAesKey
    );

    return {
      ciphertext: arrayBufferToBase64(ciphertext),
      iv: arrayBufferToBase64(iv),
      keyForReceiver: arrayBufferToBase64(encryptedKeyForReceiver),
      keyForSender: arrayBufferToBase64(encryptedKeyForSender)
    };
  }
  function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  function base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  async function decryptMessage(data, privateKey, currentUserId) {
    try {
      const payload = data.content
      const isMe = data.senderId._id === currentUserId || data.senderId === currentUserId;
      const encryptedKeyBase64 = isMe ? payload.keyForSender : payload.keyForReceiver;
      const rawAesKey = await crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        base64ToArrayBuffer(encryptedKeyBase64)
      );
      const aesKey = await crypto.subtle.importKey(
        "raw",
        rawAesKey,
        "AES-GCM",
        false,
        ["decrypt"]
      );
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: base64ToArrayBuffer(payload.iv) },
        aesKey,
        base64ToArrayBuffer(payload.ciphertext)
      );
      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error("Decryption failed:", error);
      return "[Unable to decrypt]";
    }
  }
  useEffect(() => {
    setChatId([userId, member._id].sort().join("_"));
  }, [userId, member._id]);
  const callFetchMessages = async (page = 1, limit = 20) => {
    if (!conversation) return;
    try {
  
      const data = await fetchMessage(conversation._id, page, limit)
      if (!data || data.length === 0) return;
      if (limit === 1) {
        // Append new incoming message (like real-time update)
        setMessages((prev) => [...prev, data[0]]);
      } else {
        // Initial load or pagination
        setMessages((prev) =>
          page === 1
            ? data.reverse() // first load
            : [...data.reverse(), ...prev] // prepend older messages
        );
      }

    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };
  useEffect(() => {
    if (chatId) callFetchMessages();
  }, [chatId]);

  useEffect(() => {
    if (!userPrivateKey || !messages.length) return;

    let cancelled = false;

    async function decryptMessages() {
      const result = {};
      for (const message of messages) {
        // Determine the unique ID for the mapping
        const msgId = message._id || message.id || Math.random();
        try {

          const text = await decryptMessage(
            message,
            userPrivateKey,
            userId // Pass this to help the function choose the key
          );

          result[msgId] = text;
        } catch (err) {
          console.error("Decryption loop error:", err);
          result[msgId] = "[Unable to decrypt]";
        }
      }

      if (!cancelled) {
        setDecryptedMessages(result);
      }
    }

    decryptMessages();
    return () => {
      cancelled = true;
    };
  }, [messages, userPrivateKey]);

  async function decryptMessage(message, privateKey, currentUserId) {

    try {
      // 1. Handle content whether it's a string OR an already-parsed object
      let payload;
      if (typeof message.content === 'string') {
        payload = JSON.parse(message.content);
      } else {
        payload = message.content; // It's already an object
      }
      // 2. Fix the ID comparison (Ensure isMe is a Boolean)
      const msgSenderId = (message.senderId?._id || message.senderId || "").toString();
      const myId = (currentUserId || "").toString();
      const isMe = msgSenderId === myId;
      const encryptedKeyBase64 = isMe ? payload.keyForSender : payload.keyForReceiver;

      // 3. Decrypt the AES key with your RSA Private Key
      const rawAesKey = await crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        base64ToArrayBuffer(encryptedKeyBase64)
      );

      // 4. Import the AES key
      const aesKey = await crypto.subtle.importKey(
        "raw", rawAesKey, "AES-GCM", false, ["decrypt"]
      );

      // 5. Decrypt the actual text
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: base64ToArrayBuffer(payload.iv) },
        aesKey,
        base64ToArrayBuffer(payload.ciphertext)
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error("Internal Decryption Error:", error);
      return "[Decryption Error]";
    }
  }


  useEffect(() => {
    fetchUserKeys().then(async (response) => {
      const publicKeyBuffer = new Uint8Array(response.publicKey.data);
      const importedKey = await crypto.subtle.importKey(
        "spki", // Common format for public keys
        publicKeyBuffer,
        {
          name: "RSA-OAEP",
          hash: "SHA-256",
        },
        true, // allow the key to be used for encryption
        ["encrypt"]
      );
      setSenderPublicKey(importedKey);
    });
  }, []);
  const sendMessage = async (attachment) => {
    if (!messageInput.trim()) return;
    try {
      const encryptedPayload = await encryptForMultiple(
        messageInput,
        receiverCryptoKey,
        senderPublicKey
      );
  
      const formData = new FormData();
      formData.append('senderId', userId);
      formData.append('receiverId', member._id);
      formData.append('content', JSON.stringify(encryptedPayload));
      if (attachment) {
        formData.append('attachment', attachment); // Ensure `attachment` is a File object
      }
      const response = await fetch(`${apiUrl}/messages/postMessage`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      const message = data.message;
     setSelectedConversation(data.conversation);
      const normalizedMessage = {
        ...message,
        content: JSON.parse(message.content), // 🔥 IMPORTANT
      };
      setMessages((prev) => {
        return [...prev, normalizedMessage];
      });

   
      if (!response.ok) throw new Error('Failed to send message');
      if (response.ok) {
        const notificationData = {
          recipient: member._id,
          sender: userId,
          type: 'message',
          message: `${user.userName} has messaged you `,
          createdAt: new Date().toISOString(),
          read: false
        };
        // await createNotification(notificationData);
        // socket.emit('emit_notification', notificationData)
      }
      socket.emit('sendMessage', message);
      setMessageInput('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  useEffect(() => {
    socket.on("setDoubleCheckRecieved", (payload) => {
      setMessages(prev => {
        const last = prev[prev.length - 1];

        if (!last || last._id !== payload._id) return prev;

        return [
          ...prev.slice(0, -1),
          { ...last, status: payload.status }
        ];
      });
    });

    socket.on("recievedMessage", (message) => {
      if (message.senderId._id || message.senderId == member._id) {
        messageTone.play().catch((err) => {
          console.error("Failed to play message tone:", err);
        });
        callFetchMessages(1, 1)
        if (chatId) {
          const friendId = member._id
          socket.emit('setDoubleCheck', { friendId, chatId, message });
        }
      }
      else {
        loadUnseenMessages()
      }
    });
    socket.on('messagesRead', ({ messageIds }) => {
      const count = messageIds.length; // number of messages that became 'read'
      setMessages(prev => {
        const updated = [...prev];
        const startIndex = Math.max(updated.length - count, 0);
        for (let i = startIndex; i < updated.length; i++) {
          updated[i] = { ...updated[i], status: 'read' };
        }
        return updated;
      });
    });
    return () => {
      socket.off('messageRead')
      socket.off("recievedMessage")
      socket.off('setDoubleCheckRecieved')
    }
  }, [member._id, messages]);
  const deleteMessage = async (messageId) => {
    try {
      const response = await fetch(`${apiUrl}/deleteMessage/${messageId}`, { method: "POST" });
      if (!response.ok) throw new Error("Failed to delete message");
      setMessages(messages.filter((msg) => msg._id !== messageId));
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };
  const handleTyping = () => socket.emit("typing", { userId: member._id, myId: userId });
  const handleBlur = () => socket.emit("stopped_typing", { myId: userId, userId: member._id });
  useEffect(() => {
    socket.on("typing", ({ myId }) => {
      setTypingUser(myId)
    });
    socket.on("stopped_typing", () => setTypingUser(null));
    return () => {
      socket.off("typing");
      socket.off("stopped_typing");
    };
  }, []);
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => {
    scrollToBottom();
    setMsgCounts((prevCounts) => ({ ...prevCounts, [member._id]: 0 }));
  }, [messages]);
  const handleEmojiClick = (emojiObject) => setMessageInput((prev) => prev + emojiObject.emoji);
  const toggleReactions = (messageId) => setMessages((prev) => prev.map((msg) => (msg._id === messageId ? { ...msg, showReactions: !msg.showReactions } : msg)));
  const addReaction = async (messageId, emoji) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/messages/${messageId}/reactions`, {
        method: 'POST', headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId, emoji })
      });
      if (!response.ok) throw new Error("Failed to add reaction");
      const updatedMessage = await response.json();
      setMessages((prev) => prev.map((msg) => (msg._id === messageId ? { ...msg, reaction: emoji, showReactions: false } : msg)));
      setMessages((prev) => prev.map((msg) => (msg._id === messageId ? updatedMessage : msg)));
    } catch (error) {
      console.error("Error adding reaction:", error);
    }
  };
  const forwardMessage = () => {
  }
  const handleFileSelect = (type) => {
    setShowAttachmentPopup(false); // Close popup
    const input = document.createElement("input");
    input.type = "file";
    if (type === "image") input.accept = "image/*";
    if (type === "video") input.accept = "video/*";
    if (type === "document") input.accept = ".pdf,.doc,.docx,.txt";

    input.onchange = (event) => {
      const file = event.target.files[0];
      if (file) {
        setSelectedFile(file);
      }
    };
    input.click();
  };
  useEffect(() => {
    if (selectedFile?.file instanceof File) {
      const objectURL = URL.createObjectURL(selectedFile.file);
      setSelectedFile(prev => ({ ...prev, url: objectURL }));
      return () => URL.revokeObjectURL(objectURL); // cleanup
    }
  }, [selectedFile?.file]);
  // const handleMarkMessagesAsRead = async (messages) => {
  //   const messageIds = messages.map(msg => msg._id);
  //   if (messageIds.length > 0) {
  //     try {
  //       const result = await updateMessageStatus(messageIds, 'read');
  //       console.log(result.message);  // "Message status updated successfully"
  //       if (result) {
  //         console.log("checkUnseenMsg");
  //       }
  //     } catch (err) {
  //       console.error('Error marking messages as read:', err);
  //     }
  //   }
  // };
  useEffect(() => {

    const messageIds = messages
      .filter(msg => msg.status === 'sent' && msg.senderId !== userId) // include only "sent" messages from other users
      .map(msg => msg._id);
    if (messageIds.length > 0) {
      socket.emit('checkUnseenMsg', { friendId: member._id, messageIds });
    }
  }, [messages]);


  return (
    <div className="chat-ui-container">
      {/* Chat Header */}
      <div className="chat-header">
        <button className="back-button" onClick={onBack}>
          <FaArrowLeft />
        </button>
        <div className="user-info d-flex flex-row">
          <div className="user-avatar">
            <img
              style={{ width: "48px", height: "48px", objectFit: "cover" }}
              src={member?.profilePicture}
              alt={"user"}
            />
            {typingUser && typingUser !== userId && typingUser == member._id && (
              <div className="typing-indicator">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
            )}
          </div>
          <div className="user-details">
            <h3 className="text-truncate" style={{ width: '100px' }}>
              {member?.userName}
            </h3>
            <p>
              {typingUser && typingUser !== userId && typingUser == member._id ? "typing..." : "online"}
            </p>
          </div>
        </div>
        {/* Floating Call Button */}
        <button
          onClick={() => setOutgoingCall(true)}
          style={{
            padding: "0.4rem 1.0rem",
            fontSize: "1rem",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            background: "none",
            color: "black",
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          }}
        >
          <FaVideo />
        </button>
        <div className="mx-3">
          <div className="dropdown">
            <button className="action-button">
              <FontAwesomeIcon icon={faEllipsisV} />
            </button>
            <div className="dropdown-menu">
              <button onClick={() => deleteMessages(userId, member.id)} >
                <FontAwesomeIcon icon={faTrashAlt} /> clear chat
              </button>

            </div>
          </div>
        </div>

      </div>

      {/* Messages Area */}
      <div className="messages-area" style={{ background: "rgb(177 177 177)" }}>
        {messages?.length === 0 ? (
          <div className="empty-state">
            <p>Start a conversation with {member?.userName} !</p>
          </div>
        ) : (
          messages?.map((message, index) => (

            <div
              key={message._id || index}
              className={`message-container ${message.receiverId === userId ? 'received ' : 'sent text-light'}`}
            >
              <div className="message-bubble">
                {/* {console.log(decryptedMessages[message._id], 'decrypted message')} */}
                {decryptedMessages[message._id] ? (
                  <div className="message-text">
                    {decryptedMessages[message._id]}
                  </div>
                ) : (
                  <div className="message-text loading">
                    …
                  </div>
                )}

                {/* Attachment */}
                {message?.attachment && (
                  <div className="message-attachment">
                    {message.attachment.type === 'image' && (
                      <img
                        src={message.attachment.name}
                        alt={message.attachment.name || 'Attachment'}
                        className="media-image"
                      />
                    )}

                    {message.attachment.type === 'video' && (
                      <video controls className="media-video">
                        <source src={message.attachment.name} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    )}

                    {(!message.attachment.type || message.attachment.type === 'file') && (
                      <a
                        href={message.attachment.name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="media-file"
                      >
                        <FontAwesomeIcon icon={faFileAlt} />{' '}
                        <span>{message.attachment.name || 'Download File'}</span>
                      </a>
                    )}
                  </div>
                )}


                {/* Message Meta */}
                <div className="message-meta">
                  <span className="timestamp">
                    {new Date(message?.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  {message?.receiverId !== userId && (
                    <span className={`status ${message?.status === 'read' ? 'read' : ''}`}>
                      {message?.status === 'read' ? (
                        <FontAwesomeIcon icon={faCheckDouble} />
                      ) : (
                        <FontAwesomeIcon icon={faCheck} />
                      )}
                    </span>
                  )}
                </div>

                {/* Message Actions */}
                <div className="message-actions">
                  <div className="dropdown">
                    <button className="action-button">
                      <FontAwesomeIcon icon={faEllipsisV} />
                    </button>
                    <div className="dropdown-menu">
                      <button onClick={() => deleteMessage(message?._id)}>
                        <FontAwesomeIcon icon={faTrashAlt} /> Delete
                      </button>
                      <button onClick={() => toggleReactions(message?._id)}>
                        <FontAwesomeIcon icon={faSmile} /> React
                      </button>
                      <button onClick={() => forwardMessage(message?._id)}>
                        <FontAwesomeIcon icon={faShare} /> Forward
                      </button>
                    </div>
                  </div>
                </div>

                {/* Reactions */}
                {message?.showReactions && (
                  <div className="reactions-picker">
                    {['👍', '❤️', '😂', '😮', '😢', '😡'].map((emoji) => (
                      <span
                        key={emoji}
                        onClick={() => addReaction(message?._id, emoji)}
                      >
                        {emoji}
                      </span>
                    ))}
                  </div>
                )}
                {message?.reactions?.length > 0 && (
                  <div className="message-reactions">
                    {message.reactions.map((reaction, i) => (
                      <span key={i}>{reaction.emoji}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      {/* Input Area */}
      <div className="input-area">
        {/* Attachment Popup */}
        {showAttachmentPopup && (
          <div className="attachment-popup">
            <div className="attachment-options">
              <button onClick={() => handleFileSelect("image")}>
                <FontAwesomeIcon icon={faImage} />
                <span>Photo</span>
              </button>
              <button onClick={() => handleFileSelect("video")}>
                <FontAwesomeIcon icon={faVideo} />
                <span>Video</span>
              </button>
              <button onClick={() => handleFileSelect("document")}>
                <FontAwesomeIcon icon={faFileAlt} />
                <span>Document</span>
              </button>
            </div>
          </div>
        )}
        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div className="emoji-picker-container">
            <EmojiPicker onEmojiClick={handleEmojiClick} width="100%" height={300} />
          </div>
        )}
        {/* Input Controls */}
        <div className="input-controls">
          <button
            className="attachment-button"
            onClick={() => setShowAttachmentPopup(!showAttachmentPopup)}
          >
            <FontAwesomeIcon icon={faPaperclip} />
          </button>
          <input
            type="text"
            ref={inputRef}
            className="message-input"
            placeholder="Type a message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onFocus={handleTyping}
            onBlur={handleBlur}
          />
          <button
            className="emoji-button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
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

        {/* File Preview */}
        {selectedFile && (
          <div className="file-preview">
            {selectedFile.type.startsWith("image/") ? (
              <>
                <img src={URL.createObjectURL(selectedFile)} alt="Preview" />
                <button onClick={() => setSelectedFile(null)}>×</button>
              </>
            ) : (
              <>
                <span>{selectedFile.name}</span>
                <button onClick={() => setSelectedFile(null)}>×</button>
              </>
            )}
          </div>
        )}
      </div>
      {showOutgoingCall &&
        <OutGoingCall
          show={showOutgoingCall}
          member={member}
          onCancel={() => setOutgoingCall(false)}
        />
      }

    </div>
  );
};
export default ChatUi;