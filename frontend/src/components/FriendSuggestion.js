import React, { useContext, useState } from "react";
import { FaUserPlus, FaUserCheck, FaUserClock } from "react-icons/fa";
import { sendFollowRequest } from "../services/profileService";
import { createNotification } from "../services/notificationService";
import { useSelector } from "react-redux";
import UserProfilePage from "../pages/userProfile";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../contexts/UserContext";
const FriendSuggestion = ({ suggestions, token }) => {
    const [followStatus, setFollowStatus] = useState({});
    const [showAll, setShowAll] = useState(false);
    const currentUser = JSON.parse(localStorage.getItem('user'));
    const userId = currentUser?._id || currentUser?.userId;
    const {socket} = useContext(UserContext)
    const Navigate = useNavigate();
    const handleFollow = async (user) => {
        console.log(user, 'user')
        const Id = user._id
        const result = await sendFollowRequest(Id, token);
        if (result) {
            setFollowStatus((prevState) => ({
                ...prevState,
                [user._id]: user.isPrivate ? "pending" : "following",
            }));
            // Create notification for the followed user
            try {
                const notificationData = {
                    recipient: user._id,
                    sender: userId,
                    type: user.isPrivate ? 'follow_request' : 'follow',
                    message: user.isPrivate 
                        ? `${currentUser?.userName || 'Someone'} sent you a follow request` 
                        : `${currentUser?.userName || 'Someone'} started following you`,
                    createdAt: new Date().toISOString(),
                    read: false
                };
                socket.emit('emit_notification', notificationData)
                await createNotification(notificationData);

           
            } catch (error) {
                console.error('Error creating notification:', error);
            }
        }
    };
    const displayedSuggestions = showAll ? suggestions : suggestions?.slice(0, 4);
    return (
        <div className="card border-0 shadow-sm mb-3 " style={{maxHeight:'90vh', overflow:'auto'}}>
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
                <h6 className="mb-0 fw-bold">Suggestions For You</h6>
                {suggestions?.length > 1 && (
                    <button 
                        className="btn p-0 text-primary"
                        onClick={() => setShowAll(!showAll)}
                    >
                        {showAll ? "Show Less" : "See All"}
                    </button>
                )}
            </div>
            <div className="card-body p-0">
                <ul className="list-unstyled mb-0">
                    {displayedSuggestions?.map((user) => {
                        const profilePic = user.profilePicture;
                        const firstLetter = user.userName ? user.userName.charAt(0).toUpperCase() : "?";
                        const status = followStatus[user._id] || (user.isFollowing ? "following" : "notFollowing");
                        return (
                            <li key={user._id} className="p-3 border-bottom d-flex align-items-center justify-content-between" onClick={()=>Navigate(`/userProfile/${user._id}`)}>
                                <div className="d-flex align-items-center">
                                    {profilePic ? (
                                        <img
                                            src={profilePic}
                                            alt="Profile"
                                            className="rounded-circle me-3"
                                            style={{ width: "40px", height: "40px", objectFit: "cover" }}
                                        />
                                    ) : (
                                        <div className="rounded-circle me-3 d-flex justify-content-center align-items-center bg-secondary text-white"
                                            style={{ width: "40px", height: "40px", fontSize: "16px", fontWeight: "bold" }}>
                                            {firstLetter}
                                        </div>
                                    )}
                                    <div>
                                        <h6 className="mb-0">{user.userName}</h6>
                                        <small className="text-muted">Suggested for you</small>
                                    </div>
                                </div>
                                <button
                                    className={`btn btn-sm ${status === "following" ? "btn-outline-danger" : "btn-outline-primary"} rounded-pill`}
                                    onClick={() => handleFollow(user)}
                                    disabled={status === "pending"}
                                >
                                    {status === "following" ? (
                                        <>``
                                            <FaUserCheck className="me-1" /> Unfollow
                                        </>
                                    ) : status === "pending" ? (
                                        <>
                                            <FaUserClock className="me-1" /> Pending
                                        </>
                                    ) : (
                                        <>
                                            <FaUserPlus className="me-1" /> Follow
                                        </>
                                    )}
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
