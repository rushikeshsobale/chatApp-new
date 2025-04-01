import React, { useState } from "react";
import { FaUserPlus, FaUserCheck, FaUserClock } from "react-icons/fa";
import { sendFollowRequest } from "../services/profileService";

const FriendSuggestion = ({ suggestions, token }) => {
    const [followStatus, setFollowStatus] = useState({});

    const handleFollow = async (user) => {
        const result = await sendFollowRequest(user._id, token);
        if (result) {
            setFollowStatus((prevState) => ({
                ...prevState,
                [user._id]: user.isPrivate ? "pending" : "following",
            }));
        }
    };

    return (
        <div className="card border-0 shadow-sm mb-3">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
                <h6 className="mb-0 fw-bold">Suggestions For You</h6>
                <button className="btn p-0 text-primary">See All</button>
            </div>
            <div className="card-body p-0">
                <ul className="list-unstyled mb-0">
                    {suggestions?.map((user) => {
                        const profilePic = user.profilePicture;
                        const firstLetter = user.userName ? user.userName.charAt(0).toUpperCase() : "?";
                        const status = followStatus[user._id] || (user.isFollowing ? "following" : "notFollowing");

                        return (
                            <li key={user._id} className="p-3 border-bottom d-flex align-items-center justify-content-between">
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
                                        <>
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
