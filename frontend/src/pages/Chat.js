import React, { useEffect, useState, useCallback, useContext, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { useDispatch, useSelector } from "react-redux";
import { setUser } from "../store/action";
import "../css/Chat.css";
import ChatUi from "../components/ChatUi";
import FriendList from "../components/FriendList";
import { useNavigate } from "react-router-dom";
import UsersList from "./Users";
import GroupList from "../components/GroupList"
import GroupChatUi from "../components/GroupChatUi"
import { UserContext } from "../contexts/UserContext";
import { fetchUnseenMessages } from "../services/messageService";
import { updateMessageStatus } from "../services/messageService";
import { FaArrowLeft, FaPlusCircle, FaUserFriends, FaUsers, FaSearch, FaCog } from "react-icons/fa";
import CreateGroupDrawer from "../components/CreateGroup";

const ChatComponent = () => {
  const navigate = useNavigate()
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [msgCounts, setMsgCounts] = useState({});
  const [profilePicture, setProfilePicture] = useState("");
  const [isMobileView, setIsMobileView] = useState(false);
  const [activeList, setActiveList] = useState('friends');
  const [searchQuery, setSearchQuery] = useState("");
  const touchStartX = useRef(0);
  const { socket, userId, activeUsers, unseenMessages, setUnseenMessages, loadUnseenMessages } = useContext(UserContext);
  const chatHistory = useSelector((state) => state.chat.chatHistory);
  const token = localStorage.getItem("token");
  const dispatch = useDispatch();
  const apiUrl = process.env.REACT_APP_API_URL;

  // Swipe Handlers
  const handleTouchStart = (e) => {
    if (isMobileView && !selectedFriend && !selectedGroup) {
      touchStartX.current = e.touches[0].clientX;
    }
  };

  const handleTouchEnd = (e) => {
    if (!isMobileView || selectedFriend || selectedGroup) return;

    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchEndX - touchStartX.current;
    const swipeThreshold = 50;

    if (Math.abs(diffX) > swipeThreshold) {
      if (diffX > 0 && activeList === 'groups') {
        setActiveList('friends');
      } else if (diffX < 0 && activeList === 'friends') {
        setActiveList('groups');
      }
    }
  };

  const fetchUserData = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/profile/getUser`, {
        method: "GET",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUserName(data.userName);
        setProfilePicture(data.profilePicture);
        setFriends(data.followers);
        dispatch(setUser({ userId: data._id, name: data.firstName }));
      } else {
        console.error("Failed to fetch user data:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }, [token, dispatch, apiUrl]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  useEffect(() => {
    loadUnseenMessages()
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, [loadUnseenMessages]);

  const handleFriendSelect = async (friend, lastUnseenMsg = []) => {
    setSelectedGroup(null);
    setSelectedFriend(friend);
    const messageIds = lastUnseenMsg.map(msg => msg._id);
    if (messageIds.length > 0) {
      try {
        await updateMessageStatus(messageIds);
        socket.emit('updateMessageStatus', { messageIds, friend })
        await loadUnseenMessages();
      } catch (error) {
        console.error('Error updating message status:', error);
      }
    } else {
      loadUnseenMessages();
    }
  };

  const handleGroupSelect = (group) => {
    setSelectedFriend(null);
    setSelectedGroup(group);
  }

  const handleBackToFriendList = () => {
    setSelectedFriend(null);
    setSelectedGroup(null);
    setActiveList('friends');
  };

  useEffect(() => {
    if (!socket) return;
    const handleRecievedMessage = () => {
      console.log("received message on frontend!");
      loadUnseenMessages();
    };
    socket.on('recievedMessage', handleRecievedMessage);
    return () => {
      socket.off('recievedMessage', handleRecievedMessage);
    };
  }, [socket, loadUnseenMessages]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleGroupCreated = (newGroup) => {
    console.log("New group created, refresh list:", newGroup);
  };

  return (
    <div className="chat-container-genz">
      {/* Header */}
      <div className={`chat-header-glass ${(selectedFriend||selectedGroup)?'d-none':''}`}>
        <button className="back-btn-glass" onClick={handleBack}>
          <FaArrowLeft />
        </button>
        <div className="header-content">
          <h2 className="header-title">Messages 💬</h2>
          <p className="header-subtitle">Chat with friends and groups</p>
        </div>
        <button className="settings-btn-glass">
          <FaCog />
        </button>
      </div>

      <div className="chat-layout-genz">
        {/* Sidebar */}
        {(!isMobileView || (!selectedFriend && !selectedGroup)) && (
          <div
            className="sidebar-glass"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Search Bar */}
            <div className="search-container">
              <div className="search-bar-glass">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="tab-nav-genz">
              <button
                onClick={() => setActiveList('friends')}
                className={`tab-btn-genz ${activeList === 'friends' ? 'active' : ''}`}
              >
                <FaUserFriends className="tab-icon" />
                <span>Friends</span>
                {unseenMessages && Object.keys(unseenMessages).length > 0 && (
                  <span className="notification-bubble">
                    {Object.keys(unseenMessages).length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveList('groups')}
                className={`tab-btn-genz ${activeList === 'groups' ? 'active' : ''}`}
              >
                <FaUsers className="tab-icon" />
                <span>Groups</span>
              </button>
            </div>

            {/* Sliding Content */}
            <div className={`slide-wrapper-genz ${activeList === 'groups' ? 'show-groups' : ''}`}>
              {/* Friends Slide */}
              <div className="slide-content friend-slide">
                <FriendList
                  friends={friends}
                  activeUsers={activeUsers}
                  msgCounts={msgCounts}
                  unseenMessages={unseenMessages}
                  selectedFriend={selectedFriend}
                  handleFriendSelect={handleFriendSelect}
                  handleBackToFriendList={handleBackToFriendList}
                />
              </div>

              {/* Groups Slide */}
              <div className="slide-content group-slide">
                <div className="groups-header">
                  <h4>Your Groups</h4>
                  <button
                    className="create-group-btn-genz"
                    onClick={() => setIsModalOpen(true)}
                  >
                    <FaPlusCircle className="me-2" />
                    New Group
                  </button>
                </div>
                <GroupList
                  msgCounts={msgCounts}
                  handleGroupSelect={handleGroupSelect}
                  handleBackToFriendList={handleBackToFriendList}
                />
              </div>
            </div>
          </div>
        )}

        {/* Main Chat Area */}
        <div className={`main-chat-genz ${isMobileView && !selectedFriend && !selectedGroup ? 'hidden-mobile' : ''}`}>
          {selectedGroup ? (
            <GroupChatUi
              group={selectedGroup}
              setSelectedGroup={setSelectedGroup}
              userId={userId}
              userName={userName}
              socket={socket}
              history={chatHistory}
              setMsgCounts={setMsgCounts}
              onBack={isMobileView ? handleBackToFriendList : () => setSelectedGroup(null)}
            />
          ) : selectedFriend ? (
            <ChatUi
              member={selectedFriend}
              setSelectedFriend={setSelectedFriend}
              userId={userId}
              userName={userName}
              socket={socket}
              history={chatHistory}
              setMsgCounts={setMsgCounts}
              onBack={isMobileView ? handleBackToFriendList : () => setSelectedFriend(null)}
            />
          ) : (
            <div className="welcome-screen-genz">
              <div className="welcome-content">
                <div className="welcome-icon">💬</div>
                <h2>Welcome to Messages</h2>
                <p>Select a conversation or start a new one to begin chatting</p>
                <div className="welcome-features">
                  <div className="feature-card">
                    <div className="feature-icon">👥</div>
                    <span>Group Chats</span>
                  </div>
                  <div className="feature-card">
                    <div className="feature-icon">⚡</div>
                    <span>Real-time</span>
                  </div>
                  <div className="feature-card">
                    <div className="feature-icon">🔒</div>
                    <span>Secure</span>
                  </div>
                </div>
              </div>
              <UsersList />
            </div>
          )}
        </div>
      </div>

      <CreateGroupDrawer            
        friends={friends}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGroupCreated={handleGroupCreated}
      />

      <style jsx>{`
        .chat-container-genz {
          height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          flex-direction: column;
        }

        .chat-header-glass {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .back-btn-glass, .settings-btn-glass {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .back-btn-glass:hover, .settings-btn-glass:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.1);
        }

        .header-content {
          text-align: center;
          flex-grow: 1;
        }

        .header-title {
          color: white;
          font-weight: 700;
          margin: 0;
          font-size: 1.5rem;
        }

        .header-subtitle {
          color: rgba(255, 255, 255, 0.8);
          margin: 0;
          font-size: 0.9rem;
        }

        .chat-layout-genz {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .sidebar-glass {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-right: 1px solid rgba(255, 255, 255, 0.2);
          width: 350px;
          min-width: 350px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .search-container {
          padding: 20px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }

        .search-bar-glass {
          display: flex;
          align-items: center;
          background: rgba(0, 0, 0, 0.05);
          border-radius: 20px;
          padding: 10px 16px;
          transition: all 0.3s ease;
        }

        .search-bar-glass:focus-within {
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .search-icon {
          color: #666;
          margin-right: 10px;
        }

        .search-input {
          border: none;
          background: none;
          outline: none;
          flex: 1;
          font-size: 0.9rem;
        }

        .tab-nav-genz {
          display: flex;
          padding: 0 20px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }

        .tab-btn-genz {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 15px 0;
          background: none;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 600;
          color: #666;
          position: relative;
        }

        .tab-btn-genz.active {
          color: #667eea;
          border-bottom: 3px solid #667eea;
        }

        .tab-btn-genz:hover:not(.active) {
          background: rgba(0, 0, 0, 0.05);
        }

        .notification-bubble {
          background: #ff4757;
          color: white;
          border-radius: 10px;
          padding: 2px 8px;
          font-size: 0.7rem;
          position: absolute;
          top: 8px;
          right: 20px;
        }

        .slide-wrapper-genz {
          display: flex;
          width: 200%;
          flex: 1;
          transition: transform 0.3s ease-in-out;
        }

        .slide-wrapper-genz.show-groups {
          transform: translateX(-50%);
        }

        .slide-content {
          width: 50%;
          height: 100%;
          overflow-y: auto;
        }

        .groups-header {
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }

        .groups-header h4 {
          margin: 0;
          font-weight: 600;
          color: #333;
        }

        .create-group-btn-genz {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 20px;
          padding: 8px 16px;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
        }

        .create-group-btn-genz:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .main-chat-genz {
          flex: 1;
          background: white;
          position: relative;
        }

        .main-chat-genz.hidden-mobile {
          display: none;
        }

        .welcome-screen-genz {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: white;
          padding: 40px;
        }

        .welcome-content {
          text-align: center;
          max-width: 400px;
        }

        .welcome-icon {
          font-size: 4rem;
          margin-bottom: 20px;
        }

        .welcome-content h2 {
          color: #333;
          margin-bottom: 10px;
          font-weight: 700;
        }

        .welcome-content p {
          color: #666;
          margin-bottom: 30px;
        }

        .welcome-features {
          display: flex;
          gap: 20px;
          justify-content: center;
          margin-bottom: 40px;
        }

        .feature-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 15px;
          border-radius: 15px;
          background: rgba(102, 126, 234, 0.1);
          min-width: 80px;
        }

        .feature-icon {
          font-size: 1.5rem;
        }

        .feature-card span {
          font-size: 0.8rem;
          font-weight: 600;
          color: #667eea;
        }

        @media (max-width: 768px) {
          .sidebar-glass {
            width: 100%;
            min-width: 100%;
          }
          
          .chat-header-glass {
            padding: 12px 16px;
          }
          
          .header-title {
            font-size: 1.3rem;
          }
        }
      `}</style>
    </div>
  );
};

export default ChatComponent;