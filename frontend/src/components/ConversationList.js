import React, { useState, useEffect, useContext, useRef } from "react";
import { ThemeContext } from "../contexts/ThemeContext";
import CryptoUtils from "../utils/CryptoUtils";
import "../css/chat-bubbles.css";
import { FaCheck, FaCheckDouble, FaCog, FaArrowLeft, FaSearch, FaArchive, FaPlus } from "react-icons/fa";
import { UserContext } from "../contexts/UserContext";
import { fetchConversations, fetchConversationById, getFriendsforGroupCreation } from "../services/conversations";
import ChatUi from "./ChatUi";
import GroupChatUi from "./GroupChatUi";
import CreateGroupDrawer from "./CreateGroup";
import UserSearchBox from "./UserSearchBox";
import { useNavigate } from "react-router-dom";

const ConversationList = ({
  isMobileView,

}) => {
  const navigate = useNavigate();
  const { isDark } = useContext(ThemeContext);
  const { socket, user, activeUsers } = useContext(UserContext)
  const [decryptedMessages, setDecryptedMessages] = useState({});
  const [privateKey, setUserPrivateKey] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [msgCounts, setMsgCounts] = useState({});
  const [showSearch, setShowSearch] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupableFriends, setGroupableFriends] = useState([]);
  const currentUserId = user?._id;
  // Kept in sync with `conversations` so the socket handler below can check
  // "do we already know about this conversation?" without a stale closure.
  const conversationIdsRef = useRef(new Set());
  const nameColorDefault = isDark ? "text-light-emphasis" : "text-dark-emphasis";
  const nameColorUnread = isDark ? "text-white" : "text-dark";
  const previewColorDefault = isDark ? "text-secondary" : "text-muted";
  const previewColorUnread = isDark ? "text-light" : "text-dark fw-medium";
  const selectedBgColor = "var(--color-surface-muted)";
  const hoverBgColor = "var(--color-surface-muted)";

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
    const loadConversations = async () => {
      if (!user) return;

      try {
        const data = await fetchConversations();
        setConversations(data || []);
      } catch (err) {
        console.error(err);
      }
    };

    loadConversations();
  }, [user]);

  useEffect(() => {
    conversationIdsRef.current = new Set(conversations.map(c => c._id));
  }, [conversations]);

  // Keeps the list in sync with the currently open conversation: a freshly
  // started chat (via UserSearchBox) only becomes known here once the
  // first message round-trips and ChatUi calls setSelectedConversation,
  // and a mute/archive toggle from ChatUi's menu needs to be reflected
  // immediately without waiting on a refetch — so this upserts rather
  // than only inserting.
  useEffect(() => {
    if (!selectedConversation?._id) return;
    setConversations(prev => {
      const exists = prev.some(c => c._id === selectedConversation._id);
      if (!exists) return [selectedConversation, ...prev];
      return prev.map(c => c._id === selectedConversation._id ? selectedConversation : c);
    });
  }, [selectedConversation]);

  useEffect(() => {
    if (!socket || !user) return;

    const handleConversationUpdate = ({
      conversationId,
      lastMessage,
      unreadCount,
    }) => {
      console.log("Received conversation update for ID:", conversationId, "with message:", lastMessage);

      if (!conversationIdsRef.current.has(conversationId)) {
        // Unknown conversation — e.g. the other side just sent us the
        // first message of a brand-new chat we have no local record of
        // yet. Fetch it instead of silently dropping the update.
        fetchConversationById(conversationId)
          .then(conv => {
            setConversations(prev => {
              if (prev.some(c => c._id === conversationId)) return prev;
              return [{ ...conv, lastMessage, unreadCount }, ...prev];
            });
          })
          .catch(err => console.error("Failed to load new conversation:", err));
        return;
      }

      setConversations(prev => {

        const target = prev.find(
          c => c._id === conversationId
        );

        if (!target) return prev;

        const updatedConversation = {
          ...target,
          lastMessage,
          unreadCount,
          updatedAt: new Date(),
        };

        return [
          updatedConversation,
          ...prev.filter(
            c => c._id !== conversationId
          ),
        ];
      });
    };

    socket.on(
      "conversation:update",
      handleConversationUpdate
    );

    return () => {
      socket.off(
        "conversation:update",
        handleConversationUpdate
      );
    };
  }, [socket, user, selectedConversation]);

  // Group membership/metadata changes — covers everyone affected,
  // including the acting admin's own tab and a member who just left or
  // got removed (the server emits these to every affected participant,
  // room-broadcast style, same as any other socket event).
  useEffect(() => {
    if (!socket || !user) return;

    const handleGroupUpdated = ({ conversation }) => {
      setConversations(prev => {
        const exists = prev.some(c => c._id === conversation._id);
        if (!exists) return [conversation, ...prev];
        return prev.map(c => c._id === conversation._id ? conversation : c);
      });
      setSelectedConversation(prev => prev?._id === conversation._id ? conversation : prev);
    };

    const handleGroupRemovedOrDeleted = ({ conversationId }) => {
      setConversations(prev => prev.filter(c => c._id !== conversationId));
      setSelectedConversation(prev => prev?._id === conversationId ? null : prev);
    };

    socket.on("group:updated", handleGroupUpdated);
    socket.on("group:removed", handleGroupRemovedOrDeleted);
    socket.on("group:deleted", handleGroupRemovedOrDeleted);

    return () => {
      socket.off("group:updated", handleGroupUpdated);
      socket.off("group:removed", handleGroupRemovedOrDeleted);
      socket.off("group:deleted", handleGroupRemovedOrDeleted);
    };
  }, [socket, user]);

  // useEffect(() => {
  //   if (socket) return;

  //   const handleDelivered = ({
  //     messageId,
  //   }) => {

  //     setConversations(prev =>
  //       prev.map(conv => {

  //         if (
  //           conv.lastMessage?._id !==
  //           messageId
  //         ) {
  //           return conv;
  //         }

  //         return {
  //           ...conv,
  //           lastMessage: {
  //             ...conv.lastMessage,
  //             status: "delivered",
  //           },
  //         };
  //       })
  //     );
  //   };

  //   socket.on(
  //     "message:delivered",
  //     handleDelivered
  //   );

  //   return () => {
  //     socket.off(
  //       "message:delivered",
  //       handleDelivered
  //     );
  //   };
  // }, [socket]);


  const handleConversationSelect = (
    conversation
  ) => {

    if (conversation.isGroup) {
      setSelectedFriend(null);
      setSelectedConversation(conversation);
      socket.emit("conversation:read", { conversationId: conversation._id });
    } else {
      const friend =
        conversation.participants.find(
          p => p._id !== user._id
        );

      setSelectedFriend(friend);
      setSelectedConversation(conversation);

      socket.emit(
        "conversation:read",
        {
          conversationId:
            conversation._id,
        }
      );
    }

    setConversations(prev =>
      prev.map(conv =>
        conv._id === conversation._id
          ? {
            ...conv,
            unreadCount: {
              ...conv.unreadCount,
              [user._id]: 0,
            },
          }
          : conv
      )
    );
  };

  // Group conversations use the shared-key scheme (CryptoUtils.decryptGroupMessage),
  // not the 1:1 hybrid scheme — this caches each group's unwrapped key so the
  // preview decrypt below doesn't re-unwrap it on every conversations update.
  const groupKeyCacheRef = useRef(new Map());

  useEffect(() => {
    let isCancelled = false;

    const decryptAll = async () => {
      if (!conversations?.length || !privateKey) return;
      const results = {};

      for (const conv of conversations) {
        if (!conv?._id) continue;
        if (!conv.lastMessage || !conv.lastMessage.content) {
          results[conv._id] = "";
          continue;
        }

        try {
          if (conv.isGroup) {
            let groupKey = groupKeyCacheRef.current.get(conv._id);
            if (!groupKey) {
              const ownEntry = conv.encryptedKeys?.find(k => (k.userId?._id || k.userId) === currentUserId);
              if (!ownEntry) {
                results[conv._id] = "[Unable to decrypt]";
                continue;
              }
              groupKey = await CryptoUtils.unwrapGroupKey(ownEntry.encryptedKey, privateKey);
              groupKeyCacheRef.current.set(conv._id, groupKey);
            }
            results[conv._id] = await CryptoUtils.decryptGroupMessage(conv.lastMessage, groupKey);
          } else {
            // Direct 1-on-1 decryption architecture
            results[conv._id] = await CryptoUtils.decryptMessage(conv.lastMessage, privateKey, currentUserId);
          }
        } catch (err) {
          console.error(`Decryption failed for channel ${conv._id}:`, err);
          results[conv._id] = "[Unable to decrypt]";
        }
      }

      if (!isCancelled) {
        setDecryptedMessages(results);
      }
    };

    if (!isLoading) {
      decryptAll();
    }

    return () => {
      isCancelled = true;
    };
  }, [conversations, privateKey, currentUserId, isLoading]);

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) {
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  useEffect(() => {
    console.log("Active users updated:", activeUsers);
  }, [activeUsers]);

  const handleUserSelect = (user) => {
    setSelectedFriend(user)
    setSelectedConversation(null)
  }

  const visibleConversations = conversations.filter(
    (c) => !!c.archivedBy?.[currentUserId] === showArchived
  );

  const isChatOpen = !!selectedFriend || !!selectedConversation?.isGroup;

  const handleOpenCreateGroup = async () => {
    try {
      const friends = await getFriendsforGroupCreation();
      setGroupableFriends(friends || []);
    } catch (err) {
      console.error("Failed to load friends for group creation:", err);
      setGroupableFriends([]);
    }
    setShowCreateGroup(true);
  };

  const handleGroupCreated = (conversation) => {
    setConversations(prev => {
      const exists = prev.some(c => c._id === conversation._id);
      if (exists) return prev;
      return [conversation, ...prev];
    });
    setSelectedFriend(null);
    setSelectedConversation(conversation);
  };

  return (
    <>

      <CreateGroupDrawer
        friends={groupableFriends}
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onGroupCreated={handleGroupCreated}
      />

      <div className="chat-surface h-100 d-flex">

        {/* Conversation List */}
        {(!isMobileView || !isChatOpen) && (
          <div
            className={`
        ${isMobileView ? "w-100" : "col-md-4 col-lg-4"}
        h-100

      `}
          >
            <div className="chat-surface px-3 py-3 d-flex align-items-center border-bottom chat-surface-line">
              <div className="col-2">
                <button
                  className="chat-icon-btn"
                  onClick={() => navigate(-1)}
                >
                  <FaArrowLeft />
                </button>
              </div>

              <div className="col-8 text-center">
                <h5 className="mb-0 fw-bold">{showArchived ? "Archived" : "Messages"}</h5>
              </div>

              <button
                className="chat-icon-btn me-2"
                title={showArchived ? "Back to conversations" : "Archived chats"}
                onClick={() => setShowArchived(prev => !prev)}
                style={showArchived ? { background: "var(--color-brand-gradient)", color: "#fff" } : undefined}
              >
                <FaArchive />
              </button>

              <button
                className="chat-icon-btn me-2"
                title="New group"
                onClick={handleOpenCreateGroup}
              >
                <FaPlus />
              </button>

              <button
                className="chat-icon-btn"
                onClick={() => setShowSearch(prev => !prev)}
              >
                <FaSearch />
              </button>

            </div>
            {showSearch && (
              <div className="px-3 border-bottom  bg-dark ">
                <UserSearchBox  onUserSelect={handleUserSelect}/>
              </div>
            )}
            {visibleConversations.length === 0 ? (
              <div className="d-flex align-items-center justify-content-center h-100 text-muted small">
                <span>{showArchived ? "No archived chats" : "No conversations available"}</span>
              </div>
            ) : (
              visibleConversations.map((conversation) => {
                if (!conversation?._id) return null;

                // Groups have no single "other side" — show the group's
                // own name/avatar instead of resolving one participant.
                const friend = conversation.isGroup
                  ? null
                  : conversation?.participants?.find((p) => (p._id || p) !== currentUserId);
                const displayName = conversation.isGroup
                  ? conversation.groupName
                  : (friend?.userName || "Unknown User");
                const avatar = conversation.isGroup
                  ? conversation.groupAvatar
                  : (friend?.profilePicture || "https://via.placeholder.com/40");
                const isActive = !conversation.isGroup && activeUsers.some(
                  (user) =>
                    user.userId === friend?._id &&
                    user.status === "online"
                );

                const unreadCount = conversation?.unreadCount?.[currentUserId] || 0;
                const hasUnread = unreadCount > 0;
                const isSelected = selectedConversation?._id === conversation?._id;
                const lastMsgSenderId = conversation?.lastMessage?.senderId?._id || conversation?.lastMessage?.senderId;

                return (
                  <div
                    key={conversation._id}
                    onClick={() => handleConversationSelect(conversation)}
                    className="chat-surface-line d-flex align-items-center px-3 py-2 border-bottom gap-3 w-100"
                    style={{
                      cursor: "pointer",
                      transition: "background 0.2s ease",
                      backgroundColor: isSelected ? selectedBgColor : "transparent",
                      userSelect: "none"
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = hoverBgColor;
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    {/* Profile Avatar Wrapper */}
                    <div className={`avatar-ring flex-shrink-0 ${isActive ? "is-online" : ""}`} style={{ width: "44px", height: "44px" }}>
                      <img src={avatar} alt="" />
                    </div>

                    {/* Conversational Text Data Node */}
                    <div className="flex-grow-1 min-w-0">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className={`text-truncate small ${hasUnread ? `${nameColorUnread} fw-bold` : `${nameColorDefault} fw-medium`}`}>
                          {displayName}
                        </span>
                        <span className="text-secondary tracking-tight" style={{ fontSize: "0.7rem" }}>
                          {formatTime(conversation?.updatedAt || conversation?.lastMessage?.timestamp)}
                        </span>
                      </div>

                      <div className="d-flex justify-content-between align-items-center">
                        <span className={`text-truncate small d-flex align-items-center gap-1 ${hasUnread ? previewColorUnread : previewColorDefault}`} style={{ fontSize: "0.75rem" }}>
                          {lastMsgSenderId === currentUserId && conversation?.lastMessage && (
                            <span className="d-inline-flex align-items-center">
                              {conversation?.lastMessage?.status === "read" ? (
                                <FaCheckDouble size={8} color="#28fa5c" />
                              ) : (
                                <FaCheck size={8} className="text-secondary" />
                              )}
                            </span>
                          )}
                          <span className="text-truncate">
                            {decryptedMessages[conversation._id] !== undefined ? decryptedMessages[conversation._id] : "..."}
                          </span>
                        </span>

                        {/* Unread Alerts */}
                        {hasUnread && lastMsgSenderId !== currentUserId && (
                          <span
                            className="badge rounded-pill bg-success text-white d-flex align-items-center justify-content-center px-2 py-1 fw-semibold ms-2"
                            style={{ fontSize: "0.65rem", minWidth: "18px", height: "18px" }}
                          >
                            {unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}


          </div>
        )}

        {/* Chat Panel */}
        {(!isMobileView || isChatOpen) && (
          <div
            className={`
        chat-surface
        ${isMobileView ? "w-100" : "col-md-8 col-lg-8"}
        d-flex flex-column h-100
      `}
          >
            {selectedConversation?.isGroup ? (
              <GroupChatUi
                conversation={selectedConversation}
                setSelectedConversation={setSelectedConversation}
                setMsgCounts={setMsgCounts}
                onBack={() => setSelectedConversation(null)}
              />
            ) : selectedFriend ? (
              <ChatUi
                conversation={selectedConversation}
                setSelectedConversation={setSelectedConversation}
                member={selectedFriend}
                setSelectedFriend={setSelectedFriend}
                userId={currentUserId}
                userName={user.userName}
                socket={socket}
                setMsgCounts={setMsgCounts}
                onBack={() => setSelectedFriend(null)}
              />
            ) : (
              <div className="chat-surface-muted h-100 d-flex flex-column align-items-center justify-content-center text-center px-4">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center mb-4"
                  style={{
                    width: "120px",
                    height: "120px",
                    background: "var(--color-brand-gradient)",
                    fontSize: "3rem",
                  }}
                >
                  💬
                </div>

                <h3 className="fw-bold mb-2">
                  Welcome to Chat
                </h3>

                <p
                  className="mb-4"
                  style={{ maxWidth: "450px", color: "var(--color-ink-muted)" }}
                >
                  Select a conversation from the sidebar to start chatting.
                  Messages are delivered instantly and protected with
                  end-to-end encryption.
                </p>

                <div className="d-flex gap-3 flex-wrap justify-content-center">
                  <div
                    className="chat-surface chat-surface-line p-3 rounded border"
                    style={{ minWidth: "130px" }}
                  >
                    <div className="fs-4 mb-2">⚡</div>
                    <small className="fw-semibold">
                      Real-time Messaging
                    </small>
                  </div>

                  <div
                    className="chat-surface chat-surface-line p-3 rounded border"
                    style={{ minWidth: "130px" }}
                  >
                    <div className="fs-4 mb-2">🔒</div>
                    <small className="fw-semibold">
                      End-to-End Encrypted
                    </small>
                  </div>

                  <div
                    className="chat-surface chat-surface-line p-3 rounded border"
                    style={{ minWidth: "130px" }}
                  >
                    <div className="fs-4 mb-2">📱</div>
                    <small className="fw-semibold">
                      Seamless Experience
                    </small>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default ConversationList;