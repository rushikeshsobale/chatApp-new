import React from 'react';
import { motion } from 'framer-motion';

const StoryCircle = ({ story, onClick, currentUserId }) => {
    const hasUnseenStories = !story.viewers?.includes(currentUserId);
    const isOwnStory = story.userId._id === currentUserId;

    return (
        <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="story-circle"
            onClick={() => onClick(story)}
            style={{
                position: 'relative',
                cursor: 'pointer',
                width: '50px',
                height: '50px',
                margin: '0px 8px'
            }}
        >
            <div
                className="story-border"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    borderRadius: '50%',
                    padding: '3px',
                    background: hasUnseenStories
                        ? 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)'
                        : '#e0e0e0'
                }}
            >
                <div
                    className="story-content"
                    style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        background: '#fff',
                        padding: '2px'
                    }}
                >
                    <img
                        src={story.userId.profilePicture || story.media}
                        alt="Story"
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: '50%'
                        }}
                    />
                </div>
                <div
                    className=" text-truncate"
                    
                >
                    {isOwnStory ? 'Your Story' : story.userId.userName}
                </div>
            </div>

        </motion.div>
    );
};

export default StoryCircle;