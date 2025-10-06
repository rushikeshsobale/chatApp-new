import React, { useEffect, useState, useCallback, useContext } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { useDispatch, useSelector } from "react-redux";
import { setUser } from "../store/action";
import "../css/Chat.css";
import ChatUi from "../components/ChatUi";
import FriendList from "../components/FriendList";
import { useNavigate } from "react-router-dom";
import UsersList from "./Users";
import CreateGroupModal from "../components/CreateGroup";
import GroupList from "../components/GroupList"
import GroupChatUi from "../components/GroupChatUi"
import { UserContext } from "../contexts/UserContext";
import { fetchUnseenMessages } from "../services/messageService";
import { updateMessageStatus } from "../services/messageService";
const ChatComponent = () => {
  const [userName, setUserName] = useState("");
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [msgCounts, setMsgCounts] = useState({});
  const [profilePicture, setProfilePicture] = useState("");
  const [isMobileView, setIsMobileView] = useState(false);
  const { socket, userId, activeUsers, unseenMessages, setUnseenMessages, loadUnseenMessages} = useContext(UserContext);
  const chatHistory = useSelector((state) => state.chat.chatHistory);
  const token = localStorage.getItem("token");
  const dispatch = useDispatch();
  const apiUrl = process.env.REACT_APP_API_URL;
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
  }, [token, socket, dispatch]);
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
  }, []);
  const handleFriendSelect = async (friend, lastUnseenMsg = []) => {
  setSelectedGroup(null);
  setSelectedFriend(friend);
  const messageIds = lastUnseenMsg.map(msg => msg._id);
  if (messageIds.length > 0) {
    try {
      await updateMessageStatus(messageIds);  // ✅ wait until done
      socket.emit('updateMessageStatus',{messageIds,friend})
      await loadUnseenMessages();    ///
               // ✅ now refresh unseen messages
    } catch (error) {
      console.error('Error updating message status:', error);
    }
  } else {
    // If no unseen messages, still set the friend without updating
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
  };
 
  useEffect(() => {
  if (!socket) return;
  const handleRecievedMessage = () => {
    console.log("received message on frontend!");
    loadUnseenMessages();
  };
  socket.on('recievedMessage', handleRecievedMessage);
  return () => {
    socket.off('recievedMessage', handleRecievedMessage); // Proper cleanup
  };
}, [selectedFriend]);
  return (
    <div className="chat-container ">
      <div className="chat-layout">
        {/* Sidebar/Friend List */}
        {(!isMobileView || !selectedFriend) && (
          <div className={`friend-list-container ${isMobileView && selectedFriend ? 'hide-on-mobile' : ''}`}>
            
            <FriendList
              friends={friends}
              activeUsers={activeUsers}
              msgCounts={msgCounts}
              unseenMessages={unseenMessages}
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
        <div className={`main-chat-area  bg-dark ${isMobileView && !selectedFriend && !selectedGroup ? 'hide-on-mobile' : ''}`}>
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