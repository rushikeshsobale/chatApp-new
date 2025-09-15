import React, { useContext, useState, useEffect } from "react";
import { FaUserPlus, FaUserCheck, FaUserClock } from "react-icons/fa";
import { sendFollowRequest } from "../services/profileService";
import { createNotification } from "../services/notificationService";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../contexts/UserContext";

const FriendSuggestion = ({ suggestions, token }) => {
  const [followStatus, setFollowStatus] = useState({});
  const [showAll, setShowAll] = useState(false);
  const currentUser = JSON.parse(localStorage.getItem("user"));
  const userId = currentUser?._id || currentUser?.userId;
  const { socket } = useContext(UserContext);
  const [isDesktop, setIsDesktop] = useState(true);

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

  const Navigate = useNavigate();

  const handleFollow = async (user) => {
    const Id = user._id;
    const result = await sendFollowRequest(Id, token);
    if (result) {
      setFollowStatus((prev) => ({
        ...prev,
        [user._id]: user.isPrivate ? "pending" : "following",
      }));

      try {
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
      } catch (error) {
        console.error("Error creating notification:", error);
      }
    }
  };

  const displayedSuggestions = showAll
    ? suggestions
    : suggestions?.slice(0, 4);

  return (
    <div
      className="card border-0 shadow-sm mb-3"
      style={{ maxHeight: "90vh", overflow: "auto" }}
    >
      <div className="card-header bg-white d-flex justify-content-between align-items-center">
        <h6 className="mb-0 ">Suggestions For You</h6>
        {isDesktop && suggestions?.length > 1 && (
          <button
            className="btn p-0 text-primary text-small"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Show Less" : "See All"}
          </button>
        )}
      </div>

      <div className="card-body p-0">
        <ul
          className="list-unstyled mb-0 d-lg-block d-flex flex-row gap-3"
          style={{
            overflowX: "auto",
            whiteSpace: "nowrap",
            padding: "0.5rem",
          }}
        >
          {displayedSuggestions?.map((user) => {
            const profilePic = user.profilePicture;
            const firstLetter = user.userName
              ? user.userName.charAt(0).toUpperCase()
              : "?";

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
              colors[user._id.charCodeAt(0) % colors.length] || "bg-secondary";

            const status =
              followStatus[user._id] ||
              (user.isFollowing ? "following" : "notFollowing");

            let buttonText = "Follow";
            let buttonClass = "btn btn-sm  btn-outline-primary rounded-pill py-1";
            let buttonIcon = <FaUserPlus className="me-1" />;

            if (status === "pending") {
              buttonText = "Requested";
              buttonClass = "btn btn-sm btn-outline-warning text-dark rounded-pill  py-1";
              buttonIcon = <FaUserClock className="me-1" />;
            } else if (status === "following") {
              buttonText = "Following";
              buttonClass = "btn btn-sm btn-success text-white rounded-pill  py-1";
              buttonIcon = <FaUserCheck className="me-1" />;
            } else if (
              currentUser.followers?.includes(user._id) &&
              !currentUser.following?.includes(user._id)
            ) {
              buttonText = "Follow Back";
              buttonClass = "btn btn-sm btn-outline-success rounded-pill py-1 ";
              buttonIcon = <FaUserPlus className="me-1" />;
            }

            return (
              <li
                key={user._id}
                className="p-3 border-bottom d-flex align-items-center justify-content-between flex-lg-row flex-column card border-0 shadow-sm"
                style={{ minWidth: "120px", flex: "0 0 auto" }}
              >
                {/* Profile Section */}
                <div
                  className="d-lg-flex mb-lg-0 mb-2 gap-3"
                  style={{ cursor: "pointer" }}
                  onClick={() => Navigate(`/userProfile/${user._id}`)}
                >
                  <div className="d-md-flex justify-content-center align-items-center">
                    {profilePic ? (
                      <div className="d-flex justify-content-center align-items-center">
                        <img
                          src={profilePic}
                          alt="Profile"
                          className="rounded-circle"
                          style={{
                            width: "40px",
                            height: "40px",
                            objectFit: "cover",
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        className={`rounded-circle d-flex justify-content-center align-items-center text-white ${randomColor}`}
                        style={{
                          width: "40px",
                          height: "40px",
                          fontSize: "16px",
                          fontWeight: "bold",
                        }}
                      >
                        {firstLetter}
                      </div>
                    )}
                  </div>
                  <div className="mt-lg-0 mt-2 d-flex justify-content-center align-items-center">
                    <h6
                      className="text-truncate text-center"
                      style={{ fontSize: "0.8rem", maxWidth: "90px" }}
                      title={user.userName}
                    >
                      {user.userName}
                    </h6>
                  </div>
                </div>

                {/* Follow Button */}
                <button
                  className={buttonClass}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFollow(user);
                  }}
                >
                  {buttonIcon}
                  {buttonText}
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
