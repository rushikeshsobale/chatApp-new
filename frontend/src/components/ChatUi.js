import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addMessage, updateMessageStatus } from '../store/store';
import EmojiPicker from 'emoji-picker-react';
import '../css/Chat.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckDouble, faEllipsisV, faTrashAlt, faUserSlash, faSmile, faShare, faCheck } from '@fortawesome/free-solid-svg-icons';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { CiMenuKebab } from "react-icons/ci";
import { FaArrowLeft } from 'react-icons/fa';
import { PiAlignCenterHorizontalSimpleLight } from 'react-icons/pi';

const ChatUi = ({ member, userId, socket, setMsgCounts, setSelectedFriend, onBack }) => {
  const [messageInput, setMessageInput] = useState('');
  const friendId = member.friendId._id;
  const [messages, setMessages] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typingUser, setTypingUser] = useState('');
  const messagesEndRef = useRef(null);
  const apiUrl = process.env.REACT_APP_API_URL;
  const dispatch = useDispatch();
  const [chatId, setChatId] = useState([userId, friendId].sort().join("_"));

  useEffect(() => {
    setChatId([userId, friendId].sort().join("_"));
  }, [userId, friendId]);

  const fetchMessages = async (page = 1, limit = 20) => {
    try {
      const response = await fetch(`${apiUrl}/getMessages/${chatId}?page=${page}&limit=${limit}`);
      if (!response.ok) throw new Error("Failed to fetch messages");
      const data = await response.json();

      setMessages((prev) => [...prev, ...data.reverse()]);


    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  useEffect(() => {
    console.log(messages)
  }, [messages])
  useEffect(() => {
    if (chatId) fetchMessages();
  }, [chatId]);

  const sendMessage = async (attachment) => {
    console.log(attachment, 'attachment');
    if (!messageInput.trim()) return;

    try {
      const formData = new FormData();
      formData.append('chatId', chatId);
      formData.append('senderId', userId);
      formData.append('receiverId', friendId);
      formData.append('content', messageInput);
      // Append file if exists  
      if (attachment) {
        formData.append('attachment', attachment); // Ensure `attachment` is a File object
      }

      setMessages((prev) => [...prev, { chatId, senderId: userId, receiverId: friendId, content: messageInput, attachment }]);

      const response = await fetch(`${apiUrl}/postMessage`, {
        method: 'POST',
        body: formData, // Removed incorrect 'Content-Type' header
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json(); // Get response data
      console.log(data, 'data')
      socket.emit('sendMessage', data); // Emit actual saved message

      setMessageInput('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };


  const updateMsgStatus = async (chatId) => {
    try {
      const response = await fetch(`${apiUrl}/updateMsgStatus/${chatId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      if (!response.ok) console.log('Error updating message status');
    } catch (err) {
      console.log(err, 'error');
    }
  };
  useEffect(() => {
    socket.on("setDoubleCheckRecieved", (payload) => {
      console.log(payload, 'payload');
      setMessages((prev) => {
        if (prev.length === 0) return [payload]; // If no messages, just add it
        return [...prev.slice(0, -1), payload]; // Replace last message with payload
      });
    });
    socket.on("recievedMessage", (message) => {
      console.log(message, 'message')
      if (chatId) {
        fetchMessages(1, 1);
        socket.emit('setDoubleCheck', { friendId, chatId, message });
      }
    });
    return () => {
      socket.off("recievedMessage")
      socket.off('setDoubleCheckRecieved')
    }
  }, []);

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

  const handleTyping = () => socket.emit("typing", { userId: friendId, myId: userId });
  const handleBlur = () => socket.emit("stopped_typing", { myId: userId, userId: friendId });

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
    setMsgCounts((prevCounts) => ({ ...prevCounts, [friendId]: 0 }));
  }, [messages]);

  const handleEmojiClick = (emojiObject) => setMessageInput((prev) => prev + emojiObject.emoji);

  const toggleReactions = (messageId) => setMessages((prev) => prev.map((msg) => (msg._id === messageId ? { ...msg, showReactions: !msg.showReactions } : msg)));

  const addReaction = async (messageId, emoji) => {
    try {
      const response = await fetch(`${apiUrl}/${messageId}/reactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, emoji }) });
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

  const [selectedFile, setSelectedFile] = useState(null);
  const [showAttachmentPopup, setShowAttachmentPopup] = useState(false);

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
  return (
    <div className="d-flex flex-column rounded" style={{ height: '100vh', background: 'aliceblue', zIndex: '10000', position: 'relative' }}>
      <div className="d-flex justify-content-between align-items-center border-bottom">
        <span className='text-dark px-2' onClick={onBack}><FaArrowLeft /></span>
        <div className='m-1'>
          <h4 className="p-0 m-0">{member.friendId.firstName}</h4>
          {typingUser && typingUser !== userId && <p className="p-0 text-muted smaller fst-italic m-0">is typing...</p>}
        </div>
        <div className="dropdown">
          <button className="btn p-0" type="button" id="dropdownMenuButton" data-bs-toggle="dropdown" aria-expanded="true" style={{ backgroundColor: 'transparent', fontSize: '20px' }}>
            <CiMenuKebab />
          </button>
          <ul className="dropdown-menu" aria-labelledby="dropdownMenuButton">
            <li><a className="dropdown-item" href="#">Action 2</a></li>
            <li><a className="dropdown-item" href="#">Action 3</a></li>
          </ul>
        </div>
      </div>
      <div className="messages flex-grow-1 overflow-auto p-3">
        {messages?.length === 0 ? (
          <p className="text-center text-muted">Start a conversation!</p>
        ) : (
          messages?.map((message, index) => (
            <div key={index} className={`bg-none d-flex ${message?.senderId == userId ? 'justify-content-end' : ''} mb-1`}>
              <div className="d-flex justify-content-between align-items-center border rounded gap-1 shadow-sm px-1 position-relative">
                <div
                  className="d-flex align-items-start p-2"
                  style={{
                    maxWidth: "75%",
                    backgroundColor: "#DCF8C6", // Light green WhatsApp style
                    borderRadius: "10px",
                    padding: "8px",
                    margin: "5px 0",
                    wordBreak: "break-word",
                  }}
                >
                  <div>
                    {/* Show Text Message */}
                    {message?.content && (
                      <p className="mb-0" style={{ fontSize: "14px", color: "#000" }}>
                        {message.content}
                      </p>
                    )}

                    {/* Show Attachment (Image, Video, or File) */}
                    {message?.attachment && (
                      <>
                        {message.attachment.match(/\.(png|jpe?g|gif)$/i) ? (
                          <img
                            src={message.attachment}
                            alt="Attachment"
                            style={{
                              maxWidth: "200px",
                              maxHeight: "200px",
                              borderRadius: "8px",
                              marginTop: message.content ? "5px" : "0",
                            }}
                          />
                        ) : message.attachment.match(/\.(mp4|webm)$/i) ? (
                          <video
                            controls
                            style={{
                              maxWidth: "200px",
                              maxHeight: "200px",
                              borderRadius: "8px",
                              marginTop: message.content ? "5px" : "0",
                            }}
                          >
                            <source src={message.attachment} type="video/mp4" />
                            Your browser does not support the video tag.
                          </video>
                        ) : (
                          <a
                            href={message.attachment}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "block",
                              color: "#007bff",
                              textDecoration: "none",
                              fontSize: "14px",
                              marginTop: "5px",
                            }}
                          >
                            Download Attachment
                          </a>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <span className="message-timestamp small" style={{ fontSize: '10px', alignSelf: 'flex-end' }}>
                  {new Date(message?.timestamp).toLocaleTimeString()}
                </span>
                {message?.pending && !message?.read && (
                  <span className="text-warning small" title="Message is pending" style={{ fontSize: '10px', alignSelf: 'flex-end' }}>
                    ⏳
                  </span>
                )}
                {message?.senderId === userId && (
                  <>
                    {message?.status === 'sent' && (
                      <span
                        className="text-muted small"
                        title="Message sent"
                        style={{ fontSize: '10px', alignSelf: 'flex-end' }}
                      >
                        <FontAwesomeIcon icon={faCheck} />
                      </span>
                    )}
                    {(message.status === 'read' || message.read) && (
                      <span
                        className="text-success small"
                        title="Message read"
                        style={{ fontSize: '10px', alignSelf: 'flex-end' }}
                      >
                        <FontAwesomeIcon icon={faCheckDouble} />
                      </span>
                    )}
                  </>
                )}

                <div className="dropdown">
                  <button className="btn btn-sm border-0 p-2" data-bs-toggle="dropdown">
                    <FontAwesomeIcon icon={faEllipsisV} className="text-secondary" />
                  </button>
                  <ul className="dropdown-menu shadow border-0 rounded">
                    <li>
                      <button className="dropdown-item d-flex align-items-center gap-2 text-danger" onClick={() => deleteMessage(message?._id)}>
                        <FontAwesomeIcon icon={faTrashAlt} /> Delete for Everyone
                      </button>
                    </li>
                    <li>
                      <button className="dropdown-item d-flex align-items-center gap-2 text-warning" onClick={() => deleteMessage(message?._id)}>
                        <FontAwesomeIcon icon={faUserSlash} /> Delete for Me
                      </button>
                    </li>
                    <li>
                      <button className="dropdown-item d-flex align-items-center gap-2 text-primary" onClick={() => toggleReactions(message?._id)}>
                        <FontAwesomeIcon icon={faSmile} /> React
                      </button>
                    </li>
                    <li>
                      <button className="dropdown-item d-flex align-items-center gap-2 text-info" onClick={() => forwardMessage(message?._id)}>
                        <FontAwesomeIcon icon={faShare} /> Forward
                      </button>
                    </li>
                  </ul>
                </div>

                {message?.showReactions && (
                  <div className=" z-1  position-absolute top-100 start-0 bg-white border rounded p-1 d-flex">
                    {['👍', '❤️', '😂', '😮', '😢', '😡'].map((emoji) => (
                      <span key={emoji} className="mx-1 cursor-pointer" onClick={() => addReaction(message?._id, emoji)}>
                        {emoji}
                      </span>
                    ))}
                  </div>
                )}

                {message?.reactions?.map((reactions, index) => (
                  <span className="ms-2">{reactions.emoji}</span>
                ))}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="message-input d-flex align-items-center p-2 border-top position-relative">
        {/* Text Input */}
        <input
          type="text"
          className="form-control me-2"
          placeholder="Type your message..."
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onFocus={handleTyping}
          onBlur={handleBlur}
        />

        {/* Attachment Icon (Opens Popup) */}
        <div className="p-2 position-relative" onClick={() => setShowAttachmentPopup((prev) => !prev)}>
          📎 {/* Paperclip icon */}
        </div>

        {/* WhatsApp-style Attachment Popup */}
        {showAttachmentPopup && (
          <div className="attachment-popup position-absolute bottom-100 end-0 bg-white shadow p-2 rounded">
            <p className="mb-2 text-center fw-bold">Attach</p>
            <div className="d-flex flex-column">
              <button className="btn btn-light mb-1" onClick={() => handleFileSelect("image")}>🖼️ Image</button>
              <button className="btn btn-light mb-1" onClick={() => handleFileSelect("video")}>📹 Video</button>
              <button className="btn btn-light mb-1" onClick={() => handleFileSelect("document")}>📄 Document</button>
            </div>
          </div>
        )}

        {/* Emoji Picker */}
        <div className="p-2" onClick={() => setShowEmojiPicker((prev) => !prev)}>
          😊
        </div>

        {/* Send Button */}
        <div className="px-3 py-2 border rounded" onClick={() => sendMessage(selectedFile)}>
          <FontAwesomeIcon icon={faPaperPlane} />
        </div>

        {/* Show selected file (if any) */}
        {selectedFile && (
          <div className="preview mt-2 d-flex align-items-center">
            {selectedFile.type.startsWith("image/") ? (
              <img src={URL.createObjectURL(selectedFile)} alt="Preview" width="50" height="50" className="me-2 rounded" />
            ) : (
              <span className="me-2">{selectedFile.name}</span>
            )}
            <button className="btn btn-sm btn-danger" onClick={() => setSelectedFile(null)}>X</button>
          </div>
        )}
      </div>

    </div>
  );
};

export default ChatUi;
