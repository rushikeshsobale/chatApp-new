import React from "react";
import { current } from "@reduxjs/toolkit";
import { useState, useEffect } from "react";
import CryptoUtils from '../utils/CryptoUtils';
import { FaCheck, FaCheckDouble } from "react-icons/fa";
import { decryptGroupMessage } from "../utils/CryptoUtils";
const FriendList = ({
  conversations,
  activeUsers,
  selectedConversation,
  handleConversationSelect,
}) => {
  const [decryptedMessages, setDecryptedMessages] = useState({});
  const [privateKey, setUserPrivateKey] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem("user"));
  const currentUserId = user?.userId;
  useEffect(() => {
    const initializeKey = async () => {
      try {
        const key = await CryptoUtils.loadKeyLocally();
        if (key) {
          setUserPrivateKey(key);
        } else {
          console.warn("No Private Key found in local storage.");
          // Trigger the 'Restore Keys' flow here if needed
        }
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
          // 🔐 GROUP CHAT
          if (conv.isGroup && conv.groupKey) {
            const decryptedText = await decryptGroupMessage(
              JSON.parse(conv.lastMessage.content),
              conv.groupKey
            );
            if (conv.isGroup) {
              const sender = conv.participants.find(
                p => p._id === conv.lastMessage.senderId
              );
              results[conv._id] = `${sender?.userName}: ${decryptedText}`;
            }
          }
          else {
            const text = await CryptoUtils.decryptMessage(
              conv.lastMessage,
              privateKey,
              currentUserId
            );
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
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit"
      });

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    });
  };
  return (
    <div className="prof-chat-list">
      <div className="prof-scroll-container">
        {conversations?.map((conversation) => {
          const isGroup = conversation?.isGroup;
          const friend = !isGroup
            ? conversation?.participants.find(p => p._id !== currentUserId)
            : null;
          const groupMembers = isGroup
            ? conversation?.participants.filter(p => p._id !== currentUserId)
            : [];
          const displayName = isGroup
            ? conversation.groupName
            : friend?.userName;
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
              onClick={() => {
             
                handleConversationSelect(conversation)
              }
              }
              className={`prof-chat-row ${isSelected ? "selected" : ""} ${hasUnread ? "unread" : ""}`}
            >
              {/* Avatar */}
              <div className="prof-avatar-wrapper">
                <img
                  src={avatar}
                  alt=""
                  className="prof-avatar-img"
                />
                {!isGroup && isActive && <div className="prof-online-dot" />}
              </div>

              {/* Info */}
              <div className="prof-chat-info">
                <div className="prof-chat-top">

                  <span className="prof-user-name">
                    {displayName}
                  </span>

                  <span className="prof-timestamp">
                    {formatTime(conversation?.updatedAt)}
                  </span>

                </div>

                <div className="prof-chat-bottom">

                  <span className="prof-preview-text">

                    {/* message ticks only for private */}
                    {!isGroup && conversation?.lastMessage?.senderId === currentUserId && (
                      <>
                        {conversation?.lastMessage?.status === "read" ? (
                          <span className="double-tick mx-1">
                            <FaCheckDouble size={6} color="#28fa5c" />
                          </span>
                        ) : (
                          <span className="single-tick mx-1">
                            <FaCheck size={6} />
                          </span>
                        )}
                      </>
                    )}


                    {decryptedMessages[conversation?._id]}

                  </span>

                  {/* unread indicator */}
                  {conversation?.lastMessage?.senderId !== currentUserId &&
                    conversation?.lastMessage?.status === "sent" && (
                      <span className="prof-unread-count">
                        {isGroup ? unreadCount : "New"}
                      </span>
                    )}

                </div>

                {/* Optional group member preview */}
                {/* {isGroup && (
              <div className="prof-group-members">
                {groupMembers.slice(0, 3).map(m => m.userName).join(", ")}
                {groupMembers.length > 3 && ` +${groupMembers.length - 3}`}
              </div>
            )} */}

              </div>
            </div>
          );
        })}
      </div>
      <style jsx>{`
        .prof-chat-list {
          height: 100%;
          background: #000;
          display: flex;
          flex-direction: column;
        }
        .prof-scroll-container {
          flex: 1;
          overflow-y: auto;
          scrollbar-width: none;
        }
        .prof-chat-row {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          cursor: pointer;
          transition: background 0.2s ease;
          gap: 12px;
          border-bottom: 1px solid #111;
        }

        .prof-chat-row:hover {
          background: #0a0a0a;
        }

        .prof-chat-row.selected {
          background: #161616;
        }

        .prof-avatar-wrapper {
          position: relative;
          flex-shrink: 0;
        }

        .prof-avatar-img {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          object-fit: cover;
          background: #222;
        }

        .prof-online-dot {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 10px;
          height: 10px;
          background: #22c55e;
          border: 2px solid #000;
          border-radius: 50%;
        }

        .prof-chat-info {
          flex: 1;
          min-width: 0;
        }

        .prof-chat-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .prof-user-name {
          color: #efefef;
          font-size: 0.85rem;
          font-weight: 400;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .prof-timestamp {
          color: #666;
          font-size: 0.7rem;
        }

        .prof-chat-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .prof-preview-text {
          color: #888;
          font-size: 0.75rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .prof-unread-count {
          background: #4ff88a;
          color: #f1f1f1;
          font-size: 0.65rem;
          min-width: 16px;
          height: 16px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          font-weight: 600;
        }

        .prof-chat-row.unread .prof-user-name {
          color: #fff;
        }

        .prof-chat-row.unread .prof-preview-text {
          color: #ccc;
        }
      `}</style>
    </div>
  );
};

export default FriendList;
