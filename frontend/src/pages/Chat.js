import React, { useEffect, useState, useCallback, useContext } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { useDispatch, useSelector } from "react-redux";
import { addMessage, setInitialMessages } from "../store/store";
import { setUser } from "../store/action";
import io from "socket.io-client";
import "../css/Chat.css";
import ChatUi from "../components/ChatUi";
import FriendList from "../components/FriendList";
import ProfileDisplay from "../components/ProfileDisplay";
import { useNavigate } from "react-router-dom";
import UsersList from "./Users";
import CreateGroupModal from "../components/CreateGroup";
import GroupList from "../components/GroupList"
import GroupChatUi from "../components/GroupChatUi"
import { UserContext } from "../contexts/UserContext";
const ChatComponent = () => {
  const [userName, setUserName] = useState("");
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [msgCounts, setMsgCounts] = useState({});
  const [profilePicture, setProfilePicture] = useState("");
  const [isMobileView, setIsMobileView] = useState(false);
  const { socket, userId, activeUsers } = useContext(UserContext);
  const navigate = useNavigate();
  const chatHistory = useSelector((state) => state.chat.chatHistory);
  const token = localStorage.getItem("token");
  const dispatch = useDispatch();
  const apiUrl = process.env.REACT_APP_API_URL;
  const fetchUserData = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/getUser`, {
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
  }, [token, socket,dispatch]);
  
  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const handleFriendSelect = (friend) => {
    setSelectedGroup(null)
    setSelectedFriend(friend);
  };
  const handleGroupSelect = (group) => {
    setSelectedFriend(null);
    setSelectedGroup(group);
  }
  const handleBackToFriendList = () => {
    setSelectedFriend(null);
    setSelectedGroup(null);
  };
  return (
    <div className="chat-container ">
      <div className="chat-layout">
        {/* Sidebar/Friend List */}
        {(!isMobileView || !selectedFriend) && (
          <div className={`friend-list-container ${isMobileView && selectedFriend ? 'hide-on-mobile' : ''}`}>
            <div className="friend-list-header">
              <h3>Connections</h3>
              <div className="active-users-count">
                {activeUsers.length} active
              </div>
            </div>
            <FriendList
              friends={friends}
              activeUsers={activeUsers}
              msgCounts={msgCounts}
              selectedFriend={selectedFriend}
              handleFriendSelect={handleFriendSelect}
              handleBackToFriendList={handleBackToFriendList}
            />
            <GroupList
              msgCounts={msgCounts}
              handleGroupSelect={handleGroupSelect}
              handleBackToFriendList={handleBackToFriendList} />

            <CreateGroupModal friends={friends} />
          </div>
        )}

        {/* Main Chat Area */}
        <div className={`main-chat-area ${isMobileView && !selectedFriend && !selectedGroup ? 'hide-on-mobile' : ''}`}>
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
            <div className="container bg-dark welcome-container"> {/* Added a class for specific styling if needed */}
              <div className="welcome-message">
                <h2>Welcome</h2>
                <p>Select a friend or a group to start chatting, or discover new connections</p>
              </div>
              {/* You might want to pass props to UsersList if it needs to interact with state */}
              <UsersList />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default ChatComponent;