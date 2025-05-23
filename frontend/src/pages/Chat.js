import React, { useEffect, useState, useCallback } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { useDispatch, useSelector } from "react-redux";
import { addMessage, setInitialMessages } from "../store/store";
import { useSocket } from "../components/socketContext";
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
const ChatComponent = () => {
  const { setSocket, setUserId, userId } = useSocket();
  const [userName, setUserName] = useState("");
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [msgCounts, setMsgCounts] = useState({});
  const [profilePicture, setProfilePicture] = useState("");
  const [isMobileView, setIsMobileView] = useState(false);
  const navigate = useNavigate();
  const chatHistory = useSelector((state) => state.chat.chatHistory);
  const token = localStorage.getItem("token");
  const dispatch = useDispatch();
  const apiUrl = process.env.REACT_APP_API_URL;
  const socket = useSelector((state) => state.socket.socket);
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
        console.log(data, 'dayaa')
        setUserId(data._id);
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
  }, [token, socket, setSocket, setUserId, dispatch]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  useEffect(() => {
    if (socket && userId) {
      socket.on("restatus", (data) => {
        setActiveUsers(data)
      }
      );
      socket.emit("joinRoom", { userId, friends });
      socket.on("status", (data) => {
        setActiveUsers((prevActiveUsers) => [...prevActiveUsers, data])
      }
      );
      socket.on("userLeft", (activeMembers) => setActiveUsers(activeMembers));
      return () => {
        socket.off("status");
        socket.off("userLeft");
      };
    }
  }, [socket, userId]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleFriendSelect = (friend) => {
    setSelectedFriend(friend);
  };

  const handleBackToFriendList = () => {
    setSelectedFriend(null);
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
          
              activeUsers={activeUsers}
              msgCounts={msgCounts}
              selectedFriend={selectedFriend}
              handleFriendSelect={handleFriendSelect}
              handleBackToFriendList={handleBackToFriendList}/>
            <CreateGroupModal  friends={friends}/>
          </div>
        )}

        {/* Main Chat Area */}
        <div className={`main-chat-area ${isMobileView && !selectedFriend ? 'hide-on-mobile' : ''}`}>
          {selectedFriend ? (
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
            <div className="container bg-dark ">
              <div className="welcome-message">
                <h2>Welcome</h2>
                <p>Select a friend to start chatting or discover new connections</p>
              </div>
              <UsersList />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatComponent;