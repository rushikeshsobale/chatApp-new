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
import { updateMessageStatus } from "../services/messageService";
import { FaArrowLeft, FaPlusCircle, FaUsers, FaCog, FaTrash, FaBellSlash, FaArchive, FaTimes } from "react-icons/fa";
import CreateGroupDrawer from "../components/CreateGroup";
import UserSearchBox from "../components/UserSearchBox";
import { fetchConversations } from "../services/conversations";
import NewGroup from "../components/NewGroup";
import { createOrGetConversation } from "../services/conversations";
import { fetchUserKeys } from "../services/keyse2e";
import CryptoUtils from "../utils/CryptoUtils";
import { decryptGroupKey } from "../utils/CryptoUtils";
const ChatComponent = () => {
  const navigate = useNavigate()
  const groupModalRef = useRef();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [conversations, setConversations] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [msgCounts, setMsgCounts] = useState({});
  const [profilePicture, setProfilePicture] = useState("");
  const [isMobileView, setIsMobileView] = useState(false);
  const [activeList, setActiveList] = useState('friends');
  const touchStartX = useRef(0);
  const { socket, userId, activeUsers, unseenMessages, setUnseenMessages, loadUnseenMessages } = useContext(UserContext);
  const chatHistory = useSelector((state) => state.chat.chatHistory);
  const token = localStorage.getItem("token");
  const dispatch = useDispatch();
  const apiUrl = process.env.REACT_APP_API_URL;
  const [senderPublicKey, setSenderPublicKey] = useState(null)
  const [open, setOpen] = useState(false);
  const menuRef = useRef();
  useEffect(() => {
    fetchUserKeys().then(async (response) => {
      const publicKeyBuffer = new Uint8Array(response.publicKey.data);

      setSenderPublicKey(publicKeyBuffer);
    });
  }, []);
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);


  useEffect(() => {
  const loadConversations = async () => {
    try {
      const data = await fetchConversations();
   
      const privateKey = await CryptoUtils.loadKeyLocally();
      if (!privateKey) return;
      // 🔐 Decrypt group keys for all conversations
      const updatedConversations = await Promise.all(
        data.map(async (conv) => {
          try {
            // only for group chats
            if (!conv.isGroup || !conv.encryptedGroupKey) {
              return conv;
            }
            
            const groupKey = await decryptGroupKey(conv, privateKey);
           
            return {
              ...conv,
              groupKey // ✅ attach decrypted key
            };
          } catch (err) {
            console.error("Group key decrypt failed:", err);
            return conv;
          }
        })
      );

      setConversations(updatedConversations);
     

    } catch (err) {
      console.error("Error loading conversations:", err);
    }
  };

  loadConversations();
}, [selectedFriend, unseenMessages]);
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
  }, [selectedFriend]);
  const handleFriendSelect = async (member) => {
    setSelectedFriend(member);
  };
  const handleConversationSelect = async (conversation, lastUnseenMsg = []) => {
    if (conversation?.isGroup) {
      setSelectedGroup(conversation);
      setSelectedFriend(null);
    }
    setSelectedConversation(conversation);
    const friend = conversation.participants.find(
      (p) => p._id !== userId
    );
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
  }

  const handleBackToFriendList = () => {
    setSelectedFriend(null);
    setSelectedGroup(null);
    setActiveList('friends');
  };
  const handleBack = () => {
    navigate(-1);
  };
  const handleCreateGroup = async (group) => {
    try {
      // 1️⃣ Generate group AES key
      const groupKey = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
      );
      const exportedGroupKey = await crypto.subtle.exportKey("raw", groupKey);
      const allParticipants = [
        ...group.participants,
        {
          _id: userId,
          keysId: {
            publicKey: {
              type: "Buffer",
              data: Array.from(senderPublicKey)
            }
          }
        }
      ];
    
      const encryptedKeys = [];
      for (const user of allParticipants) {
        // 🔥 Convert Buffer → ArrayBuffer
        const bufferData = new Uint8Array(user.keysId.publicKey.data);
        // 🔥 Import DER (SPKI) public key
        const publicKey = await crypto.subtle.importKey(
          "spki",
          bufferData,
          {
            name: "RSA-OAEP",
            hash: "SHA-256",
          },
          true,
          ["encrypt"]
        );
        // Encrypt group key
        const encryptedGroupKey = await crypto.subtle.encrypt(
          { name: "RSA-OAEP" },
          publicKey,
          exportedGroupKey
        );
        encryptedKeys.push({
          userId: user._id,
          encryptedKey: btoa(
            String.fromCharCode(...new Uint8Array(encryptedGroupKey))
          ),
        });
      }
      const payload = {
        groupName: group.groupName,
        groupCaption: group.groupCaption,
        groupAvatar: group.groupAvatar,
        participants: group.participants.map((p) => p._id),
        encryptedKeys,
      };
      await createOrGetConversation(payload);
    } catch (err) {
      console.error("Group creation error:", err);
    }
  };
  return (
    <div className="chat-container-genz " style={{ background: "black" }} >
      {/* Header */}
      <div ref={menuRef} style={{ position: "relative" }}>
        {open && (
          <div className="settings-dropdown-glass">
            <div className="dropdown-item" onClick={() => groupModalRef.current.open()} >
              <FaUsers className="menu-icon" />
              Create Group
            </div>
            <div className="dropdown-item">
              <FaTrash className="menu-icon" />
              Clear Chat History
            </div>
            <div className="dropdown-item">
              <FaBellSlash className="menu-icon" />
              Mute Notifications
            </div>
            <div className="dropdown-item">
              <FaArchive className="menu-icon" />
              Archived Chats
            </div>
            <div className="dropdown-divider"></div>
            <div className="dropdown-item danger">
              <FaTimes className="menu-icon" />
              Close
            </div>
          </div>
        )}
      </div>
      <NewGroup ref={groupModalRef} users={[]} onCreate={(group) => {
        handleCreateGroup(group)
        groupModalRef.current?.close();
      }} onClose={() => setIsModalOpen(false)} />
      <div className={` bg-light text-dark chat-header-glass  ${(selectedFriend || selectedGroup) ? 'd-none' : ''}`}  >
        <button className="back-btn-glass" onClick={handleBack}>
          <FaArrowLeft />
        </button>
        <div className="header-content " >
          <h2 className="header-title">Messages </h2>
        </div>
        <button
          className="settings-btn-glass"
          onClick={() => setOpen(!open)}
        >
          <FaCog />
        </button>
      </div>
      {!selectedFriend && <UserSearchBox
        onUserSelect={(user) => {
          handleFriendSelect(user);
          // setSelectedUser(user);
        }}
      />}
      <div className="chat-layout-genz">
        {/* Sidebar */}
        {(!isMobileView || (!selectedFriend && !selectedGroup)) && (
          <div
            className="sidebar-glass"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >

            {/* <div className="tab-nav-genz">
              <button
                onClick={() => setActiveList('friends')}
                className={`tab-btn-genz ${activeList === 'friends' ? 'active' : ''}`}
              >
                <FaUserFriends className="tab-icon" />
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
              </button>
            </div> */}
            <div className={`slide-wrapper-genz ${activeList === 'groups' ? 'show-groups' : ''}`}>
              {/* Friends Slide */}
              <div className="slide-content friend-slide">
                <FriendList
                  currentUserId={userId}
                  conversations={conversations}
                  selectedConversation={selectedConversation}
                  setSelectedConversation={setSelectedConversation}
                  activeUsers={activeUsers}
                  msgCounts={msgCounts}
                  unseenMessages={unseenMessages}
                  selectedFriend={selectedFriend}
                  handleFriendSelect={handleFriendSelect}
                  handleConversationSelect={handleConversationSelect}
                  handleBackToFriendList={handleBackToFriendList}
                />
              </div>
              <div className="slide-content group-slide d-flex flex-column" style={{ height: '100%' }}>
                <div className="flex-grow-1 overflow-auto">
                </div>
                <div className="p-3 border-top d-flex justify-content-center">
                  <button
                    className="create-group-btn-genz text-dark  btn-sm"
                    onClick={() => setIsModalOpen(true)}
                  >
                    <FaPlusCircle className="me-2 text-dark" />
                    New Group
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Chat Area */}
        <div className={`main-chat-genz ${isMobileView && !selectedFriend && !selectedGroup ? 'hidden-mobile' : ''}`}>
          {selectedGroup ? (
            <GroupChatUi
              group={selectedGroup}
              userId={userId}
              socket={socket}
              onBack={isMobileView ? handleBackToFriendList : () => setSelectedGroup(null)}
            />
          ) : selectedFriend ? (
            <ChatUi
              conversation={selectedConversation} 
              setSelectedConversation={setSelectedConversation}
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
        conversations={conversations}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGroupCreated={handleCreateGroup}
      />

      <style jsx>{`
  /* --- Dark Mode Theme Overrides --- */
 .chat-container-genz {
          height: 100vh;
          display: flex;
          flex-direction: column;

        }

        .chat-header-glass {
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding: 6px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .back-btn-glass, .settings-btn-glass {
          /* Darker button background */
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .back-btn-glass:hover, .settings-btn-glass:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.1);
        }
        .header-content {
          text-align: center;
          flex-grow: 1;
        }
        .header-title {
          margin: 0;
          font-size: 1.2rem;
        }
        .header-subtitle {
          color: rgba(255, 255, 255, 0.6); /* Dimmer white */
          margin: 0;
          font-size: 0.9rem;
        }
        .chat-layout-genz {
          display: flex;
          flex: 1;
          overflow: hidden;
        }
        .sidebar-glass {
         
          border-right: 1px solid rgba(255, 255, 255, 0.1);
          width: 350px;
         
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .search-container {
          padding: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .search-bar-glass {
          display: flex;
          align-items: center;
          border-radius: 20px;
          padding: 10px 16px;
          transition: all 0.3s ease;
        }

        .tab-nav-genz {
          display: flex;
          padding: 0 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .tab-btn-genz {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 5px 0;
          background: none;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 600;
          color: #94a3b8; /* Muted slate */
          position: relative;
        }

        .tab-btn-genz.active {
          color: rgb(255, 255, 255); /* Bright Indigo */
          border-bottom: 3px solid #f3f3f3;
        }

        .tab-btn-genz:hover:not(.active) {
          background: rgba(255, 255, 255, 0.05);
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
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .groups-header h4 {
          margin: 0;
          font-weight: 600;
          color: #f1f5f9; /* Near white */
        }

        .create-group-btn-genz {
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
          position: relative;
        }

        .main-chat-genz.hidden-mobile {
          display: none;
        }

        .welcome-screen-genz {
         background: whitesmoke,
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
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
          color: #ffffff;
          margin-bottom: 10px;
          font-weight: 700;
        }

        .welcome-content p {
          color: #94a3b8;
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
          min-width: 80px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .feature-icon {
          font-size: 1.5rem;
        }

        .feature-card span {
          font-size: 0.8rem;
          font-weight: 600;
          color: #818cf8; /* Light Indigo */
        }

        .settings-dropdown-glass{
  position:absolute;
  top:40px;
  right:0;

  width:220px;

  backdrop-filter: blur(14px);
  background: rgba(30,30,30,0.7);

  border-radius:12px;
  border:1px solid rgba(255,255,255,0.1);

  padding:6px 0;

  box-shadow:0 8px 25px rgba(0,0,0,0.35);

  animation:dropdownFade 0.2s ease;
  z-index:1000;
}

.dropdown-item{
  display:flex;
  align-items:center;
  gap:10px;

  padding:10px 16px;
  font-size:14px;
  color:white;

  cursor:pointer;
  transition:0.2s;
}

.dropdown-item:hover{
  background:rgba(255,255,255,0.08);
}

.menu-icon{
  font-size:14px;
  opacity:0.8;
}

.dropdown-divider{
  height:1px;
  background:rgba(255,255,255,0.1);
  margin:6px 0;
}

.danger{
  color:#ff6b6b;
}

@keyframes dropdownFade{
  from{
    opacity:0;
    transform:translateY(-6px);
  }
  to{
    opacity:1;
    transform:translateY(0);
  }
}
`}</style>
    </div>
  );
};

export default ChatComponent;