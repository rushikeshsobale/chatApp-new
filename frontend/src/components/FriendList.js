import React, { useState, useEffect, useContext } from "react";
import { ThemeContext } from "../contexts/ThemeContext"; // 🌓 Adjust this path to match your project structure
import CryptoUtils from "../utils/CryptoUtils";
import { FaCheck, FaCheckDouble } from "react-icons/fa";
import { decryptGroupMessage } from "../utils/CryptoUtils";

const FriendList = ({
  conversations,
  activeUsers,
  selectedConversation,
  handleConversationSelect,
}) => {
  // 1. Consume your existing theme context values directly here
  // Note: If your context returns an object like { theme: 'dark' } instead of a boolean,
  // change this to: const { theme } = useContext(ThemeContext); const isDark = theme === 'dark';
  const { isDark } = useContext(ThemeContext); 

  const [decryptedMessages, setDecryptedMessages] = useState({});
  const [privateKey, setUserPrivateKey] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem("user"));
  const currentUserId = user?._id;

  // 2. Dynamic style switching synchronized with your theme context map
  const themeBg = isDark ? "bg-dark" : "bg-white";
  const themeBorder = isDark ? "border-secondary" : "border-light-subtle";
  const nameColorDefault = isDark ? "text-light-emphasis" : "text-dark-emphasis";
  const nameColorUnread = isDark ? "text-white" : "text-dark";
  const previewColorDefault = isDark ? "text-secondary" : "text-muted";
  const previewColorUnread = isDark ? "text-light" : "text-dark fw-medium";
  
  const selectedBgColor = isDark ? "#161616" : "#e9ecef";
  const hoverBgColor = isDark ? "#0a0a0a" : "#f8f9fa";

  useEffect(() => {
    const initializeKey = async () => {
      try {
        const key = await CryptoUtils.loadKeyLocally();
        if (key) setUserPrivateKey(key);
      } catch (err) {
        console.error("Error accessing IndexedDB:", err);
      } finally {
        setIsLoading(false);
      }
    };
    initializeKey();
  }, []);

  useEffect(() => {
    const decryptAll = async () => {
      if (!conversations?.length) return;
      const results = {};
      for (const conv of conversations) {
        if (!conv.lastMessage) continue;
        try {
          if (conv.isGroup && conv.groupKey) {
            const decryptedText = await decryptGroupMessage(
              JSON.parse(conv.lastMessage.content),
              conv.groupKey
            );
            const sender = conv.participants.find((p) => p._id === conv.lastMessage.senderId);
            results[conv._id] = `${sender?.userName || "Unknown"}: ${decryptedText}`;
          } else {
            const text = await CryptoUtils.decryptMessage(conv.lastMessage, privateKey, currentUserId);
            results[conv._id] = text;
          }
        } catch (err) {
          console.error("Decrypt error:", err);
          results[conv._id] = "[Unable to decrypt]";
        }
      }
      setDecryptedMessages(results);
    };
    decryptAll();
  }, [conversations, privateKey, currentUserId]);

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24)
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className={`h-100 d-flex flex-column ${themeBg}`}>
      <div className="flex-grow-1 overflow-auto" style={{ scrollbarWidth: "none" }}>
        {conversations?.map((conversation) => {
          const isGroup = conversation?.isGroup;
          const friend = !isGroup ? conversation?.participants.find((p) => p._id !== currentUserId) : null;
          
          const displayName = isGroup ? conversation.groupName : friend?.userName;
          const avatar = isGroup
            ? conversation.groupAvatar || "https://via.placeholder.com/40"
            : friend?.profilePicture || "https://via.placeholder.com/40";

          const isActive = !isGroup && activeUsers.includes(friend?._id);
          const unreadCount = conversation?.unreadCount?.[currentUserId] || 0;
          const hasUnread = unreadCount > 0;
          const isSelected = selectedConversation?._id === conversation?._id;

          return (
            <div
              key={conversation._id}
              onClick={() => handleConversationSelect(conversation)}
              className={`d-flex align-items-center px-3 py-2 border-bottom ${themeBorder} gap-3 w-100`}
              style={{
                cursor: "pointer",
                transition: "background 0.2s ease",
                backgroundColor: isSelected ? selectedBgColor : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) e.currentTarget.style.backgroundColor = hoverBgColor;
              }}
              onMouseLeave={(e) => {
                if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              {/* Profile Avatar Wrapper */}
              <div className="position-relative flex-shrink-0">
                <img src={avatar} alt="" className="rounded-circle object-fit-cover bg-secondary" style={{ width: "44px", height: "44px" }} />
                {!isGroup && isActive && (
                  <div 
                    className={`position-absolute bg-success rounded-circle border ${isDark ? "border-dark" : "border-white"}`}
                    style={{ width: "10px", height: "10px", bottom: "2px", right: "2px" }}
                  />
                )}
              </div>

              {/* Conversational Text Data Node */}
              <div className="flex-grow-1 min-w-0">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className={`text-truncate small ${hasUnread ? `${nameColorUnread} fw-bold` : `${nameColorDefault} fw-medium`}`}>
                    {displayName}
                  </span>
                  <span className="text-secondary tracking-tight" style={{ fontSize: "0.7rem" }}>
                    {formatTime(conversation?.updatedAt)}
                  </span>
                </div>

                <div className="d-flex justify-content-between align-items-center">
                  <span className={`text-truncate small d-flex align-items-center gap-1 ${hasUnread ? previewColorUnread : previewColorDefault}`} style={{ fontSize: "0.75rem" }}>
                    {!isGroup && conversation?.lastMessage?.senderId === currentUserId && (
                      <span className="d-inline-flex align-items-center">
                        {conversation?.lastMessage?.status === "read" ? (
                          <FaCheckDouble size={8} color="#28fa5c" />
                        ) : (
                          <FaCheck size={8} className="text-secondary" />
                        )}
                      </span>
                    )}
                    <span className="text-truncate">
                      {decryptedMessages[conversation?._id]}
                    </span>
                  </span>

                  {/* Context Unread Alert Badges */}
                  {conversation?.lastMessage?.senderId !== currentUserId &&
                    conversation?.lastMessage?.status === "sent" && (
                      <span 
                        className="badge rounded-pill bg-success text-white d-flex align-items-center justify-content-center px-2 py-1 fw-semibold"
                        style={{ fontSize: "0.65rem", minWidth: "18px", height: "18px" }}
                      >
                        {isGroup ? unreadCount : "New"}
                      </span>
                    )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FriendList;