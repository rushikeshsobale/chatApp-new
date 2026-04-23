import React from 'react';
import { motion } from 'framer-motion';

const StoryCircle = ({ group, onClick, currentUserId }) => {
    console.log(group, 'group in story circle');
    const { user, stories } = group;
   console.log(currentUserId, 'current user id in story circle');
    // 1️⃣ Check if ANY story in the user's list is unseen
    const hasUnseenStories = stories.some(story => 
        !story.viewers?.includes(currentUserId)
    );

    const isOwnStory = user._id === currentUserId;
   
    return (
        <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="story-circle"
            // Pass the whole group back to the parent onClick
            onClick={() => onClick(group)} 
            style={{
                position: "relative",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center"
               
            }}
        >
            <div
                className="story-border"
                style={{
                    width: "40px", // Bumped size slightly for better UX
                    height: "40px",
                    borderRadius: "50%",
                    padding: "2.5px",
                    background: hasUnseenStories
                        ? "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)"
                        : "#dbdbdb"
                }}
            >
                <div
                    className="story-content"
                    style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        overflow: "hidden",
                        background: "#000", // Matches dark mode better if images lag
                        padding: "2px"
                    }}
                >
                    <img
                        src={user.profilePicture}
                        alt={user.userName}
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            borderRadius: "50%"
                        }}
                    />
                </div>
            </div>

            <div
                className="text-truncate text-center text-light"
                style={{
                    fontSize: "7px",
                    width: "40px", // Matches slightly larger circle
                    fontWeight: hasUnseenStories ? "600" : "400"
                }}
            >
                {isOwnStory ? "Your Story" : user.userName}
            </div>
        </motion.div>
    );
};

export default StoryCircle;