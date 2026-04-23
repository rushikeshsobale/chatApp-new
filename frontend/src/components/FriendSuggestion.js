import React, { useContext, useState, useEffect } from "react";
import { FaUserPlus, FaUserCheck, FaUserClock } from "react-icons/fa";
import { createNotification } from "../services/notificationService";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../contexts/UserContext";
import { sendFollowRequest, getRelationshipStatus } from "../services/relationships";

const FriendSuggestion = ({ suggestions, loadData }) => {
  const [followStatus, setFollowStatus] = useState({});
  const [showAll, setShowAll] = useState(false);
  const { socket } = useContext(UserContext);
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("user"));
  const userId = currentUser?._id || currentUser?.userId;
  const [isDesktop, setIsDesktop] = useState(true);
  /* ---------------- Screen size logic ---------------- */
  useEffect(() => {
    const checkScreenSize = () => {
      const desktopView = window.innerWidth >= 992;
      setIsDesktop(desktopView);
      if (!desktopView) setShowAll(true);
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  /* ---------------- Fetch relationship status ---------------- */
  useEffect(() => {
    if (!suggestions?.length) return;
    const fetchStatuses = async () => {
      const statusMap = {};
      for (const user of suggestions) {
        try {
          const res = await getRelationshipStatus(user._id);
          statusMap[user._id] = res.state; 
        } catch {
          statusMap[user._id] = "none";
        }
      }
      setFollowStatus(statusMap);
    };

    fetchStatuses();
  }, [suggestions]);

  /* ---------------- Follow handler ---------------- */
  const handleFollow = async (user) => {
    try {
      const result = await sendFollowRequest(user._id, "follow");
      if (!result) return;

      const newState =
        result.status === "pending" ? "requested" : "following";

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
      loadData();
    } catch (err) {
      console.error("Follow error:", err);
    }
  };

  const displayedSuggestions = showAll
    ? suggestions
    : suggestions

  /* ---------------- UI ---------------- */
  return (
    <div
      className="card border-0 shadow-sm mb-3"
      style={{ maxHeight: "90vh", overflow: "auto", background: "none" }}
    >
      <div
        className="card-header d-flex justify-content-between align-items-center"
        style={{ background: "black", padding: "5px 0px" }}
      >
        <h6 className="mb-0 text-light" style={{ fontSize: "10px" }}>
          Suggestions For You
        </h6>
        {isDesktop && suggestions?.length > 1 && (
          <button
            className="btn p-0 text-primary text-small"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Show Less" : "See All"}
          </button>
        )}
      </div>
      <div className="card-body p-0" style={{ background: "black" }}>
        <ul
          className="list-unstyled mb-0 d-lg-block d-flex flex-row gap-2 "
          style={{ overflowX: "auto", whiteSpace: "nowrap" }}
        >
          {suggestions.reverse()?.map((user) => {
            const profilePic = user.profilePicture;
            const firstLetter = user.userName?.charAt(0).toUpperCase() || "?";
            const colors = [
              "bg-primary",
              "bg-success",
              "bg-danger",
              "bg-warning",
              "bg-info",
              "bg-dark",
              "bg-secondary",
            ];
            const randomColor =
              colors[user._id.charCodeAt(0) % colors.length];
            const status = followStatus[user._id] || "none";
            let buttonText = "Follow";
            let buttonClass =
              "btn btn-sm btn-outline-primary rounded-pill py-0";
            let buttonIcon = <FaUserPlus className="me-1 small" />;
            let disabled = false;
            if (status === "requested") {
              buttonText = "Requested";
              buttonClass =
                "btn btn-sm btn-outline-warning text-dark rounded-pill py-0";
              buttonIcon = <FaUserClock className="me-1 small" />;
              disabled = true;
            }
             if (status === "follow_back") {
              buttonText = "Follow Back";
              buttonClass =
                "btn btn-sm btn-outline-warning text-white rounded-pill py-0";
              buttonIcon = <FaUserClock className="me-1 small" />;
          
            }
            if (status === "following") {
              buttonText = "Following";
              buttonClass =
                "btn btn-sm btn-success text-white rounded-pill py-0";
              buttonIcon = <FaUserCheck className="me-1 small" />;
              disabled = true;
            }
            return (
              <li
                key={user._id}
                className="p-1 border-bottom d-flex align-items-center justify-content-between flex-lg-row flex-column card border-0 shadow-sm"
                style={{ minWidth: "100px", flex: "0 0 auto", background: "black" }}
              >
                {/* Profile */}
                <div
                  className="d-lg-flex mb-lg-0 mb-2 gap-3"
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/userProfile/${user._id}`)}
                >
                  <div className=" d-flex justify-content-center">
                    <img
                      src={profilePic}
                      alt="Profile"
                      className="rounded-circle"
                      style={{ width: 40, height: 40, objectFit: "cover" }}
                    />
                    </div>
                  <h6
                    className="text-truncate text-center text-light mb-0 mt-lg-0 mt-2"
                    style={{ fontSize: "0.7rem", maxWidth: "90px" }}
                  >
                    {user.userName}
                  </h6>
                  
                </div>

                {/* Button */}
                <button
                  disabled={disabled}
                  className={buttonClass}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFollow(user);
                  }}
                >
                  {buttonIcon}
                  <span className="small">{buttonText}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default FriendSuggestion;
