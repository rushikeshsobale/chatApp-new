import React, { useEffect, useState, useRef, useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addMessage } from '../store/store';
import EmojiPicker from 'emoji-picker-react';
import '../css/Chat.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { createNotification } from '../services/notificationService'
import { updateMessageStatus } from '../services/messageService';
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
import { CiMenuKebab } from "react-icons/ci";
import { FaArrowLeft } from 'react-icons/fa';
import { UserContext } from '../contexts/UserContext';
const ChatUi = ({ member, setMsgCounts, onBack }) => {
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
  useEffect(() => {
    setChatId([userId, member._id].sort().join("_"));
  }, [userId, member._id]);
  const fetchMessages = async (page = 1, limit = 20) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/messages/getMessages?page=${page}&limit=${limit}&senderId=${userId}&receiverId=${member._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error("Failed to fetch messages");
      const data = await response.json();
      if (limit == 1) {
        setMessages((pre) => [...pre, data[0]])
        handleMarkMessagesAsRead(data)
      } else {
        setMessages(data.reverse());
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };
  useEffect(() => {
    if (chatId) fetchMessages();
  }, [chatId]);
  const sendMessage = async (attachment) => {
    if (!messageInput.trim()) return;
    try {
      const formData = new FormData();
      formData.append('chatId', chatId);
      formData.append('groupId', '')
      formData.append('senderId', userId);
      formData.append('receiverId', member._id);
      formData.append('content', messageInput);
      // Append file if exists  
      if (attachment) {
        formData.append('attachment', attachment); // Ensure `attachment` is a File object
      }
      setMessages((prev) => [
        ...prev,
        {
          chatId,
          senderId: { _id: userId },
          receiverId: member._id,
          content: messageInput,
          ...(attachment && {   // ✅ Only add attachment if it exists
            attachment: {
              name: URL.createObjectURL(attachment),  // ✅ This should be 'url', not 'name'
              type: attachment.type.startsWith('image')
                ? 'image'
                : attachment.type.startsWith('video')
                  ? 'video'
                  : 'file',
            }
          }),
          timestamp: Date.now(),
        },
      ]);
      const response = await fetch(`${apiUrl}/messages/postMessage`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to send message');
      if (response.ok) {
        const notificationData = {
          recipient: member._id,
          sender: userId,
          type: 'message',
          message: `${member.userName} has messaged you `,
          createdAt: new Date().toISOString(),
          read: false
        };
        await createNotification(notificationData);
      }
      const data = await response.json();
      socket.emit('sendMessage', data);
      setMessageInput('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  useEffect(() => {
    socket.on("setDoubleCheckRecieved", (payload) => {
      setMessages((prev) => {
        if (prev.length === 0) return [payload];
        return [...prev.slice(0, -1), payload];
      });
    });
    socket.on("recievedMessage", (message) => {
      if(message.senderId._id == member._id){
        messageTone.play().catch((err) => {
          console.error("Failed to play message tone:", err);
        });
        fetchMessages(1, 1)
        if (chatId) {
          const friendId = member._id
          socket.emit('setDoubleCheck', { friendId, chatId, message });
        }
      }
      else{
       loadUnseenMessages()
      }
    });
    return () => {
      socket.off("recievedMessage")
      socket.off('setDoubleCheckRecieved')
    }
  }, [member._id]);

  const deleteMessage = async (messageId) => {
    try {
      const response = await fetch(`${apiUrl}/deleteMessage/${messageId}`, { method: "POST" });
      if (!response.ok) throw new Error("Failed to delete message");
      setMessages(messages.filter((msg) => msg._id !== messageId));
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };
  const reactToMessage = async (messageId, emoji) => {
    try {
      const response = await fetch(`${apiUrl}/${messageId}/reactions`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, emoji })
      });
      if (!response.ok) throw new Error("Failed to react to message");
      const updatedMessage = await response.json();
      setMessages((prev) => prev.map((msg) => (msg._id === messageId ? updatedMessage : msg)));
    } catch (error) {
      console.error("Error reacting to message:", error);
    }
  };

  const handleTyping = () => socket.emit("typing", { userId: member._id, myId: userId });
  const handleBlur = () => socket.emit("stopped_typing", { myId: userId, userId: member._id });

  useEffect(() => {
    socket.on("typing", ({ myId }) => setTypingUser(myId));
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
        method: 'POST',
        headers: {
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

  const handleMarkMessagesAsRead = async (messages) => {
    const messageIds = messages.map(msg => msg._id);

    if (messageIds.length > 0) {
      try {
        const result = await updateMessageStatus(messageIds, 'read');
        console.log(result.message);  // "Message status updated successfully"
        if (result){
            // socket.emit('setDoubleCheck', { friendId, chatId, message });
        }
      } catch (err) {
        console.error('Error marking messages as read:', err);
      }
    }
  };

  
  return (
    <div className="chat-ui-container">
      {/* Chat Header */}
      <div className="chat-header">
        <button className="back-button" onClick={onBack}>
          <FaArrowLeft />
        </button>

        <div className="user-info">
          <div className="user-avatar">
            <img
              src={member?.profilePicture || "https://cdn.pixabay.com/photo/2021/09/20/03/24/skeleton-6639547_1280.png"}
              alt={member?.userName}
            />
            {typingUser && typingUser !== userId && (
              <div className="typing-indicator">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
            )}
          </div>

          <div className="user-details">
            <h3>{member?.userName} </h3>
            <p>
              {typingUser && typingUser !== userId ? "typing..." : "online"}
            </p>
          </div>
        </div>

        <div className="chat-actions">
          <button className="menu-button">
            <CiMenuKebab />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="messages-area">
        {messages?.length === 0 ? (
          <div className="empty-state">
            <p>Start a conversation with {member?.userName} !</p>
          </div>
        ) : (
          messages?.map((message, index) => (
            <div
              key={index}
              className={`message-container ${message?.senderId?._id === userId ? 'sent' : 'received'}`}
            >
              <div className="message-bubble">
                {/* Message Content */}
                {message?.content && (
                  <div className="message-text">{message.content}</div>
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

                  {message?.senderId?._id === userId && (
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
    </div>
  );
};

export default ChatUi;