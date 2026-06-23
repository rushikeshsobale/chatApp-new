import React, { useEffect, useState, useCallback, useContext, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { useDispatch, useSelector } from "react-redux";
import { setUser } from "../store/action";
import ChatUi from "../components/ChatUi";
import ConversationList from "../components/ConversationList";
import { useNavigate } from "react-router-dom";
import UsersList from "./Users";
import GroupChatUi from "../components/GroupChatUi";
import { UserContext } from "../contexts/UserContext";
import { FaArrowLeft, FaUsers, FaCog, FaTrash, FaBellSlash, FaArchive, FaTimes } from "react-icons/fa";
import CreateGroupDrawer from "../components/CreateGroup";
import { fetchConversations } from "../services/conversations";
import NewGroup from "../components/NewGroup";
import { createOrGetConversation } from "../services/conversations";
import { fetchUserKeys } from "../services/keyse2e";
import CryptoUtils from "../utils/CryptoUtils";
import { ThemeContext } from "../contexts/ThemeContext";
import UserSearchBox from "../components/UserSearchBox";

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
 
  const [profilePicture, setProfilePicture] = useState("");
  const [isMobileView, setIsMobileView] = useState(false);
  const [activeList, setActiveList] = useState("friends");
  const [open, setOpen] = useState(false);
  const [senderPublicKey, setSenderPublicKey] = useState(null);

  const { isDark } = useContext(ThemeContext);
  const { socket, user, activeUsers } = useContext(UserContext);
  const userId = user?._id; // Read ID directly out of our user state structure cleanly

  const chatHistory = useSelector((state) => state.chat.chatHistory);
  const token = localStorage.getItem("token");
  const dispatch = useDispatch();
  const apiUrl = process.env.REACT_APP_API_URL;

  // Theme Constants
  const themeBg = isDark ? "bg-dark text-light" : "bg-light text-dark";
  const themeCard = isDark ? "bg-secondary text-light" : "bg-white text-dark";
  const themeBorder = isDark ? "border-secondary" : "border-light";

  // Auth Guard
  useEffect(() => {
    const loggedIn = localStorage.getItem('user');
    if (!loggedIn || loggedIn === "undefined" || loggedIn === "null") {
      navigate('/login');
    }
  }, [navigate]);


  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch Conversations and unlock group symmetric keys
  useEffect(() => {
    const loadConversations = async () => {
      if (!userId) return;
      try {
        const data = await fetchConversations();
        const privateKey = await CryptoUtils.loadKeyLocally();
        if (!privateKey) {
          setConversations(data);
          return;
        }

        const updatedConversations = await Promise.all(
          data.map(async (conv) => {
            try {
              if (!conv.isGroup || !conv.encryptedGroupKey) {
                return conv;
              }
              const groupKey = await CryptoUtils.decryptGroupKey(conv, privateKey);
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
    console.log(activeUsers, 'activeUsers')
  }, [userId]);

  // Responsive Swipe Handlers
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


  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);


  
  const handleBack = () => {
    navigate(-1);
  };


  return (
    <div className={`vh-100 d-flex flex-column overflow-hidden ${themeBg}`}>

      {/* Settings Dropdown Drawer Layout */}
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

      {/* <NewGroup
        ref={groupModalRef}
        users={[]}
        onCreate={(group) => {
          handleCreateGroup(group);
          groupModalRef.current?.close();
        }}
        onClose={() => setIsModalOpen(false)}
      /> */}

      {/* Main Top App Branding Header Grid */}
      

      {/* Search Layout Box */}
     
    
      {/* Application Splines Window Context */}
      <div className="d-flex flex-grow-1 overflow-hidden w-100 position-relative">

        {/* Left Grid Sidebar - Message Inbox Hub */}
        {(!isMobileView || (!selectedFriend && !selectedGroup)) && (
         
            <div className="flex-grow-1 overflow-auto">
              <ConversationList isMobileView={isMobileView} />
            </div>
         
        )}

        {/* Right Active Sandboxed Chat Shell */}
        {/* {(!isMobileView || selectedFriend || selectedGroup) && (
          <div className={`h-100 d-flex flex-column flex-grow-1 ${isMobileView ? "w-100 position-absolute top-0 start-0" : ""}`}>
              <div className={`h-100 d-flex flex-column align-items-center justify-content-center p-4 text-center ${isDark ? "bg-dark" : "bg-light"}`}>
                <div className="mb-4" style={{ fontSize: "4rem" }}>💬</div>
                <h3 className="fw-bold">Welcome to Messages</h3>
                <p className="text-muted mb-4" style={{ maxWidth: "400px" }}>
                  Select a conversation or start a new one to begin chatting securely.
                </p>

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
            
          </div>
        )} */}
      </div>

      {/* <CreateGroupDrawer
        conversations={conversations}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGroupCreated={handleCreateGroup}
      /> */}
    </div>
  );
};

export default ChatComponent;