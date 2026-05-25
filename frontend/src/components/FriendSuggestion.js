import React, { useContext, useState, useEffect } from "react";
import { FaUserPlus, FaUserCheck, FaUserClock } from "react-icons/fa";
import { createNotification } from "../services/notificationService";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../contexts/UserContext";
import { sendFollowRequest, getRelationshipStatus } from "../services/relationships";
import { fetchSuggestions } from "../services/profileService";

const FriendSuggestion = ({ loadData }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [followStatus, setFollowStatus] = useState({});
  const [showAll, setShowAll] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  const { socket } = useContext(UserContext);
  const navigate = useNavigate();
  
  const currentUser = JSON.parse(localStorage.getItem("user"));
  const userId = currentUser?._id || currentUser?.userId;

  /* ---------------- Fetch Suggestions ---------------- */
  const getSuggestions = async () => {
    try {
      const response = await fetchSuggestions();
      // Reverse once when storing data, preventing re-render layout shifts
      setSuggestions(response ? [...response].reverse() : []);
    } catch (err) {
      console.error("Error fetching suggestions:", err);
    }
  };

  /* ---------------- Screen size & Initial Fetch ---------------- */
  useEffect(() => {
    if (!currentUser) return;
    getSuggestions();

    const checkScreenSize = () => {
      const desktopView = window.innerWidth >= 992;
      setIsDesktop(desktopView);
      if (!desktopView) setShowAll(true);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  /* ---------------- Fetch relationship statuses in parallel ---------------- */
  useEffect(() => {
    if (!suggestions?.length) return;

    const fetchStatuses = async () => {
      const statusMap = {};
      // Promise.all fetches everyone simultaneously instead of sequentially
      await Promise.all(
        suggestions.map(async (user) => {
          try {
            const res = await getRelationshipStatus(user._id);
            statusMap[user._id] = res.state;
          } catch {
            statusMap[user._id] = "none";
          }
        })
      );
      setFollowStatus(statusMap);
    };

    fetchStatuses();
  }, [suggestions]);

  /* ---------------- Follow handler ---------------- */
  const handleFollow = async (user) => {
    try {
      const result = await sendFollowRequest(user._id, "follow");
      if (!result) return;

      const newState = result.status === "pending" ? "requested" : "following";

      setFollowStatus((prev) => ({
        ...prev,
        [user._id]: newState,
      }));

      const notificationData = {
        recipient: user._id,
        sender: userId,
        type: user.isPrivate ? "follow_request" : "follow",
        message: user.isPrivate
          ? `${currentUser?.userName || "Someone"} sent you a follow request`
          : `${currentUser?.userName || "Someone"} started following you`,
        createdAt: new Date().toISOString(),
        read: false,
      };

      await createNotification(notificationData);
      socket.emit("emit_notification", notificationData);
      if (loadData) loadData();
    } catch (err) {
      console.error("Follow error:", err);
    }
  };

  /* ---------------- Handle View Limits ---------------- */
  // On desktop, limit to 4 suggestions unless "See All" is active
  const displayedSuggestions = isDesktop && !showAll 
    ? suggestions.slice(0, 4) 
    : suggestions;

  if (!suggestions.length) return null;

  return (
    <div className="card border-0 shadow-sm" style={styles.cardContainer}>
      {/* Header */}
      <div className="p-1 d-flex justify-content-between align-items-center" style={{ padding: "5px 0px" }}>
        <h6 className="mb-0 text-light" style={styles.headerTitle}>
          Suggestions For You
        </h6>
        {isDesktop && suggestions.length > 4 && (
          <button
            className="btn p-0 text-primary text-small"
            style={styles.seeAllBtn}
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Show Less" : "See All"}
          </button>
        )}
      </div>

      {/* Suggestion List */}
      <div className="card-body p-0">
        <ul className="list-unstyled mb-0 d-lg-block d-flex flex-row gap-2" style={styles.listContainer}>
          {displayedSuggestions.map((user) => {
            const status = followStatus[user._id] || "none";
            
            // Configuration for your dynamic buttons
            const btnConfig = getButtonConfig(status);

            return (
              <li key={user._id} className="p-2 d-flex align-items-center justify-content-between flex-lg-row flex-column card border-0 shadow-sm" style={styles.listItem}>
                
                {/* Profile Section */}
                <div
                  className="d-lg-flex align-items-center mb-lg-0 mb-2 gap-2"
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/userProfile/${user._id}`)}
                >
                  <div className="d-flex justify-content-center">
                    <img
                      src={user.profilePicture || "https://via.placeholder.com/40"}
                      alt={`${user.userName}'s profile`}
                      className="rounded-circle"
                      style={styles.avatar}
                    />
                  </div>
                  <h6 className="text-truncate text-center text-lg-start text-light mb-0 mt-lg-0 mt-1" style={styles.username}>
                    {user.userName}
                  </h6>
                </div>

                {/* Follow Button Action */}
                <button
                  disabled={btnConfig.disabled}
                  className={btnConfig.className}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFollow(user);
                  }}
                >
                  {btnConfig.icon}
                  <span className="small ms-1">{btnConfig.text}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

/* ---------------- Clean Helper Logic for Buttons ---------------- */
const getButtonConfig = (status) => {
  switch (status) {
    case "requested":
      return {
        text: "Requested",
        className: "btn btn-sm btn-outline-warning text-warning rounded-pill py-0 px-2",
        icon: <FaUserClock className="small" />,
        disabled: true,
      };
    case "follow_back":
      return {
        text: "Follow Back",
        className: "btn btn-sm btn-outline-primary text-white rounded-pill py-0 px-2",
        icon: <FaUserPlus className="small" />,
        disabled: false,
      };
    case "following":
      return {
        text: "Following",
        className: "btn btn-sm btn-success text-white rounded-pill py-0 px-2",
        icon: <FaUserCheck className="small" />,
        disabled: true,
      };
    default:
      return {
        text: "Follow",
        className: "btn btn-sm btn-primary text-white rounded-pill py-0 px-2",
        icon: <FaUserPlus className="small" />,
        disabled: false,
      };
  }
};

/* ---------------- Visual Layout Enhancements ---------------- */
const styles = {
  cardContainer: {
    maxHeight: "90vh",
    overflowY: "auto",
    background: "transparent",
  },
  headerTitle: {
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    opacity: 0.7,
  },
  seeAllBtn: {
    fontSize: "11px",
    textDecoration: "none",
    boxShadow: "none",
  },
  listContainer: {
    overflowX: "auto",
    whiteSpace: "nowrap",
    paddingBottom: "5px",
  },
  listItem: {
    minWidth: "110px",
    flex: "0 0 auto",
    backgroundColor: "#111111",
    marginBottom: "8px",
  },
  avatar: {
    width: 36,
    height: 36,
    objectFit: "cover",
    border: "1px solid #333",
  },
  username: {
    fontSize: "11px",
    maxWidth: "85px",
  },
};

export default FriendSuggestion;