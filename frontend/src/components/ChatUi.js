import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addMessage, updateMessageStatus } from '../store/store';
import EmojiPicker from 'emoji-picker-react';
import '../css/Chat.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckDouble } from '@fortawesome/free-solid-svg-icons';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { CiMenuKebab } from "react-icons/ci";
import { FaArrowLeft } from 'react-icons/fa';
const ChatUi = ({ member, userId, name, socket, setMsgCounts,setSelectedFriend }) => {
  const [messageInput, setMessageInput] = useState('');
  const sendId = member.friendId._id;
  const [messageArray, setMessageArray] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); // State for emoji picker
  const chatHistory = useSelector(state => state.chat.chatHistory);
  const dispatch = useDispatch();
  const messagesEndRef = useRef(null);
  const sendMessage = async () => {
    if (messageInput.trim() !== '') {
      const message = {
        text: messageInput,
        senderId: userId,
        senderName: name,
        read: false,
        pending: true,
        timestamp: new Date().toISOString()
      };
      await fetch('http://localhost:5500/sendMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sendId, message: { ...message, sentByCurrentUser: true } }),
      });
      dispatch(addMessage({
        neededId: sendId,
        message: { ...message, sentByCurrentUser: true },
      }));
      socket.emit('sendMessage', { message: messageInput, userId: sendId, sender: name, myId: userId, timestamp: new Date().toISOString(), });
      setMessageInput('');
    }
  };
  useEffect(() => {
    if (socket && sendId) {
      const messages = chatHistory[sendId] ? Object.values(chatHistory[sendId]) : [];
      setMessageArray(messages);
     
    }
  }, [sendId, chatHistory, socket]);
  useEffect(() => {
    const handleSetStatus = async (data) => {
     
      const { messageId, userId } = data;
      await fetch('http://localhost:5500/updateMessageStatus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          messageId:sendId,
          status: 'read',
        }),
      });
      dispatch(updateMessageStatus({ sendId, userId }));
    };
    if (socket) {
      socket.on('setStatus', handleSetStatus);
    }
    return () => {
      if (socket) {
        socket.off('setStatus', handleSetStatus);
      }
    };
  }, [socket, userId, dispatch]);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => {
    scrollToBottom();
    const resetMsgCount = () => {
      setMsgCounts((prevCounts) => ({
        ...prevCounts,
        [sendId]: 0,
      }));
    };
    resetMsgCount()
  }, [messageArray]);
  const clearChat = async () => {
    try {
      const response = await fetch('http://localhost:5500/deleteChat', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({
              userId: userId, // Replace with actual user ID
              messageId: sendId,      // ID of the chat/messages to clear
          }),
      });
      if (!response.ok) {
          throw new Error('Failed to clear chat');
      }
        dispatch({ type: 'CLEAR_CHAT', payload: sendId });
        setMessageArray([]);
    } catch (error) {
        console.error('Error clearing chat:', error);
        // Handle error (e.g., show an error message to the user)
    }
};
const handleEmojiClick = (emojiObject) => {
  setMessageInput(prevInput => prevInput + emojiObject.emoji); // Append emoji to message input
  // setShowEmojiPicker(false); // Close the emoji picker after selection
};
  return (
    <div className="d-flex flex-column rounded" >
      <div className="d-flex justify-content-between align-items-center p-2 border-bottom">
       <span onClick={()=>{setSelectedFriend('')}}> <FaArrowLeft/></span>
        <h4 className="mb-0 ">{member.friendId.firstName}</h4>
        <div className="dropdown">
          <button 
            className="btn  p-0"
            type="button"
            id="dropdownMenuButton"
            data-bs-toggle="dropdown"
            aria-expanded="true"
            style={{ backgroundColor: 'transparent', fontSize:'20px' }}
          >
            <CiMenuKebab />
          </button>
          <ul className="dropdown-menu" aria-labelledby="dropdownMenuButton">
            <li><a onClick={clearChat} className="dropdown-item" href="#">Clear chat</a></li>
            <li><a className="dropdown-item" href="#">Action 2</a></li>
            <li><a className="dropdown-item" href="#">Action 3</a></li>
          </ul>
        </div>
      </div>
      <div className="messages flex-grow-1 overflow-auto">
        {messageArray.length === 0 ? (
          <p className="text-center text-muted">Start a conversation!</p>
        ) : (
          messageArray.map((message, index) => (
            <div key={index} className={`bg-none d-flex ${message.sentByCurrentUser ? 'justify-content-end' : ''} mb-1`} >
              <div className="d-flex justify-content-between align-items-center border rounded gap-2 shadow-sm px-1 " style={{background:'rgb(234 222 255)'}}>
                <p className="mb-0 mx-1" style={{ height: '40px', opacity: 1 }}>{message.text}</p>
                <span className="message-timestamp small" style={{ fontSize: '10px', alignSelf: 'flex-end' }}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
                {message.pending && !message.read && (
                  <span className="text-warning small" title="Message is pending" style={{ fontSize: '10px', alignSelf: 'flex-end' }}>
                    ⏳
                  </span>
                )}
                {(message.status == 'read' || message.read) && (
                  <span className="text-success small" title="Message read" style={{ fontSize: '10px', alignSelf: 'flex-end' }}>
                    <FontAwesomeIcon icon={faCheckDouble} />
                  </span>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="message-input d-flex align-items-center p-2 border-top">
        <input
          type="text"
          className="form-control me-2"
          placeholder="Type your message..."
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
        />
        <div className="p-2" onClick={() => setShowEmojiPicker(prev => !prev)}>
            😊 {/* This can be any emoji icon to toggle the picker */}
          </div>
        <div className="px-3 py-2 border rounded" onClick={sendMessage}>
          <FontAwesomeIcon icon={faPaperPlane} />
        </div>
        <div>
          {showEmojiPicker && (
            <div className='emoji-picker '>
              <p className='p-3 text-white' onClick={()=>setShowEmojiPicker(prev => !prev)} style={{cursor:'pointer', border:'1px solid !important'}}>X</p>
               <EmojiPicker onEmojiClick={handleEmojiClick} className='emoji-picker' />
              </div>
           
          )}
        </div>
      </div>
    </div>
  );
}


export default ChatUi;
