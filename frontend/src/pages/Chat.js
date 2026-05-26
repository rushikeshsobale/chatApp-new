import React, { useEffect, useState, useCallback, useContext, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { useDispatch, useSelector } from "react-redux";
import { setUser } from "../store/action";
import ChatUi from "../components/ChatUi";
import FriendList from "../components/FriendList";
import { useNavigate } from "react-router-dom";
import UsersList from "./Users";
import GroupChatUi from "../components/GroupChatUi";
import { UserContext } from "../contexts/UserContext";
import { updateMessageStatus } from "../services/messageService";
import { FaArrowLeft, FaUsers, FaCog, FaTrash, FaBellSlash, FaArchive, FaTimes, FaSun, FaMoon } from "react-icons/fa";
import CreateGroupDrawer from "../components/CreateGroup";
import UserSearchBox from "../components/UserSearchBox";
import { fetchConversations } from "../services/conversations";
import NewGroup from "../components/NewGroup";
import { createOrGetConversation } from "../services/conversations";
import { fetchUserKeys } from "../services/keyse2e";
import CryptoUtils from "../utils/CryptoUtils";
import { decryptGroupKey } from "../utils/CryptoUtils";
import { ThemeContext } from "../contexts/ThemeContext";
const ChatComponent = () => {
  const navigate = useNavigate();
  const groupModalRef = useRef();
  const menuRef = useRef();
  const touchStartX = useRef(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [conversations, setConversations] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [msgCounts, setMsgCounts] = useState({});
  const [profilePicture, setProfilePicture] = useState("");
  const [isMobileView, setIsMobileView] = useState(false);
  const [activeList, setActiveList] = useState("friends");
  const [open, setOpen] = useState(false);
  const [senderPublicKey, setSenderPublicKey] = useState(null);
 const { isDark } = useContext(ThemeContext); 
  const { socket, userId, activeUsers, unseenMessages, loadUnseenMessages } = useContext(UserContext);
  const chatHistory = useSelector((state) => state.chat.chatHistory);
  const token = localStorage.getItem("token");
  const dispatch = useDispatch();
  const apiUrl = process.env.REACT_APP_API_URL;

  // Theme Constants
  const themeBg = isDark ? "bg-dark text-light" : "bg-light text-dark";
  const themeCard = isDark ? "bg-secondary text-light" : "bg-white text-dark";
  const themeBorder = isDark ? "border-secondary" : "border-light";
  useEffect(() => { 
    console.log("Checking login status on Chat mount...");
      const loggedIn = JSON.parse(localStorage.getItem('user'));
          if(!loggedIn){
            console.log("User is logged in: going to login", loggedIn);
          navigate('/login')
          }
        },[]);
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

        const updatedConversations = await Promise.all(
          data.map(async (conv) => {
            try {
              if (!conv.isGroup || !conv.encryptedGroupKey) {
                return conv;
              }
              const groupKey = await decryptGroupKey(conv, privateKey);
              return { ...conv, groupKey };
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
  }, [selectedFriend]);

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
      if (diffX > 0 && activeList === "groups") {
        setActiveList("friends");
      } else if (diffX < 0 && activeList === "friends") {
        setActiveList("groups");
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
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }, [token, dispatch, apiUrl]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  useEffect(() => {
    loadUnseenMessages();
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, [selectedFriend]);

  const handleFriendSelect = async (member) => {
    setSelectedFriend(member);
    setSelectedConversation(null);
  };

  const handleConversationSelect = async (conversation, lastUnseenMsg = []) => {
    if (conversation?.isGroup) {
      setSelectedGroup(conversation);
      setSelectedFriend(null);
    }
    setSelectedConversation(conversation);
    const friend = conversation.participants.find((p) => p._id !== userId);
    setSelectedFriend(friend);

    const messageIds = lastUnseenMsg.map((msg) => msg._id);
    if (messageIds.length > 0) {
      try {
        await updateMessageStatus(messageIds);
        socket.emit("updateMessageStatus", { messageIds, friend });
        await loadUnseenMessages();
      } catch (error) {
        console.error("Error updating message status:", error);
      }
    } else {
      loadUnseenMessages();
    }
  };

  const handleBackToFriendList = () => {
    setSelectedFriend(null);
    setSelectedGroup(null);
    setActiveList("friends");
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleCreateGroup = async (group) => {
    try {
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
              data: Array.from(senderPublicKey),
            },
          },
        },
      ];
      const encryptedKeys = [];
      for (const user of allParticipants) {
        const bufferData = new Uint8Array(user.keysId.publicKey.data);
        const publicKey = await crypto.subtle.importKey(
          "spki",
          bufferData,
          { name: "RSA-OAEP", hash: "SHA-256" },
          true,
          ["encrypt"]
        );
        const encryptedGroupKey = await crypto.subtle.encrypt(
          { name: "RSA-OAEP" },
          publicKey,
          exportedGroupKey
        );
        encryptedKeys.push({
          userId: user._id,
          encryptedKey: btoa(String.fromCharCode(...new Uint8Array(encryptedGroupKey))),
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
    <div className={`vh-100 d-flex flex-column overflow-hidden ${themeBg}`}>
      
      {/* Settings Action Bar Dropdown */}
      <div ref={menuRef} style={{ position: "relative" }}>
        {open && (
          <div 
            className={`position-absolute end-0 m-2 shadow-lg rounded border p-2 ${isDark ? "bg-dark border-secondary" : "bg-white border-light"}`}
            style={{ top: "50px", width: "220px", zIndex: 1050 }}
          >
            <div className="d-flex align-items-center p-2 rounded cursor-pointer btn btn-link text-decoration-none w-100 text-start text-reset" onClick={() => groupModalRef.current.open()}>
              <FaUsers className="me-2" /> Create Group
            </div>
            <div className="d-flex align-items-center p-2 rounded btn btn-link text-decoration-none w-100 text-start text-reset">
              <FaTrash className="me-2" /> Clear Chat History
            </div>
            <div className="d-flex align-items-center p-2 rounded btn btn-link text-decoration-none w-100 text-start text-reset">
              <FaBellSlash className="me-2" /> Mute Notifications
            </div>
            <div className="d-flex align-items-center p-2 rounded btn btn-link text-decoration-none w-100 text-start text-reset">
              <FaArchive className="me-2" /> Archived Chats
            </div>
            <hr className="my-1 opacity-20" />
            <div className="d-flex align-items-center p-2 rounded text-danger btn btn-link text-decoration-none w-100 text-start" onClick={() => setOpen(false)}>
              <FaTimes className="me-2" /> Close
            </div>
          </div>
        )}
      </div>

      <NewGroup 
        ref={groupModalRef} 
        users={[]} 
        onCreate={(group) => {
          handleCreateGroup(group);
          groupModalRef.current?.close();
        }} 
        onClose={() => setIsModalOpen(false)} 
      />

      {/* Main Responsive Application Navbar */}
      <div className={`d-flex align-items-center justify-content-between px-3 py-2 border-bottom ${themeBorder} ${(selectedFriend || selectedGroup) ? "d-none d-md-flex" : ""}`}>
        <button className="btn btn-outline-secondary rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: "40px", height: "40px" }} onClick={handleBack}>
          <FaArrowLeft />
        </button>
        <div className="text-center flex-grow-1">
          <h5 className="mb-0 fw-bold">Messages</h5>
        </div>
        <div className="d-flex align-items-center gap-2">  
          <button 
            className="btn btn-outline-secondary rounded-circle p-2 d-flex align-items-center justify-content-center" 
            style={{ width: "40px", height: "40px" }}
            onClick={() => setOpen(!open)}
          >
            <FaCog />
          </button>
        </div>
      </div>

      {/* User Search Context */}
      {(!selectedFriend && !selectedGroup) && (
        <div className="px-3 py-2">
          <UserSearchBox onUserSelect={(user) => handleFriendSelect(user)} />
        </div>
      )}

      {/* Main Content Layout Body */}
      <div className="d-flex flex-grow-1 overflow-hidden w-100 position-relative">
        
        {/* Left Side Navigation Pane (Conversations Inventory) */}
        {(!isMobileView || (!selectedFriend && !selectedGroup)) && (
          <div 
            className={`h-100 d-flex flex-column border-end ${themeBorder} ${isMobileView ? "w-100" : "col-md-4 col-lg-3"}`}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="flex-grow-1 overflow-auto">
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
          </div>
        )}

        {/* Right Side Working Content Sandbox (Active Chat Terminal) */}
        {(!isMobileView || selectedFriend || selectedGroup) && (
          <div className={`h-100 d-flex flex-column flex-grow-1 ${isMobileView ? "w-100 position-absolute top-0 start-0" : ""}`}>
            {selectedGroup ? (
              <GroupChatUi
                group={selectedGroup}
                userId={userId}
                socket={socket}
                onBack={handleBackToFriendList}
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
                onBack={handleBackToFriendList}
              />
            ) : (
              <div className={`h-100 d-flex flex-column align-items-center justify-content-center p-4 text-center ${isDark ? "bg-dark" : "bg-light"}`}>
                <div className="mb-4" style={{ fontSize: "4rem" }}>💬</div>
                <h3 className="fw-bold">Welcome to Messages</h3>
                <p className="text-muted max-width-auto mb-4" style={{ maxWidth: "400px" }}>
                  Select a conversation or start a new one to begin chatting securely.
                </p>
                
                {/* Visual Accent Display Cards */}
                <div className="d-flex gap-3 justify-content-center mb-5 flex-wrap">
                  <div className={`d-flex flex-column align-items-center p-3 rounded border ${themeBorder} ${themeCard}`} style={{ minWidth: "100px" }}>
                    <div className="fs-4 mb-1">👥</div>
                    <small className="fw-bold">Group Chats</small>
                  </div>
                  <div className={`d-flex flex-column align-items-center p-3 rounded border ${themeBorder} ${themeCard}`} style={{ minWidth: "100px" }}>
                    <div className="fs-4 mb-1">⚡</div>
                    <small className="fw-bold">Real-time</small>
                  </div>
                  <div className={`d-flex flex-column align-items-center p-3 rounded border ${themeBorder} ${themeCard}`} style={{ minWidth: "100px" }}>
                    <div className="fs-4 mb-1">🔒</div>
                    <small className="fw-bold">Secure</small>
                  </div>
                </div>
                <UsersList />
              </div>
            )}
          </div>
        )}
      </div>

      <CreateGroupDrawer
        conversations={conversations}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGroupCreated={handleCreateGroup}
      />
    </div>
  );
};

export default ChatComponent;