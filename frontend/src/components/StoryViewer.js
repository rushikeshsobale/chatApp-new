import React, { useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import { FaTimes, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const StoryViewer = ({ show, onHide, stories, currentStoryIndex = 0 }) => {
    const [currentIndex, setCurrentIndex] = useState(currentStoryIndex);
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [currentUserStories, setCurrentUserStories] = useState([]);
    const [currentUserIndex, setCurrentUserIndex] = useState(0);
   
    const storiesByUser = stories.reduce((acc, story) => {
        const userId = story.userId._id;
        if (!acc[userId]) {
            acc[userId] = [];
        }
        acc[userId].push(story);
        return acc;
    }, {});

    // Get all user IDs
    const userIds = Object.keys(storiesByUser);

    useEffect(() => {
        if (show && stories.length > 0) {
            // Find the user ID of the current story
            const currentStory = stories[currentStoryIndex];
            const currentUserId = currentStory.userId._id;
            
            // Set current user stories and index
            setCurrentUserStories(storiesByUser[currentUserId]);
            setCurrentUserIndex(userIds.indexOf(currentUserId));
            setCurrentIndex(currentStoryIndex);
            setProgress(0);
            startProgress();
        }
    }, [show, currentStoryIndex, stories]);

    const startProgress = () => {
        if (!currentUserStories[currentIndex]) return;
        
        const duration = 5000; // 5 seconds per story
        const interval = 50; // Update every 50ms
        const steps = duration / interval;
        let currentStep = 0;

        const timer = setInterval(() => {
            if (!isPaused) {
                currentStep++;
                setProgress((currentStep / steps) * 100);

                if (currentStep >= steps) {
                    clearInterval(timer);
                    if (currentIndex < currentUserStories.length - 1) {
                        // Move to next story of current user
                        setCurrentIndex(prev => prev + 1);
                        setProgress(0);
                        startProgress();
                    } else if (currentUserIndex < userIds.length - 1) {
                        // Move to next user's stories
                        setCurrentUserIndex(prev => prev + 1);
                        setCurrentUserStories(storiesByUser[userIds[currentUserIndex + 1]]);
                        setCurrentIndex(0);
                        setProgress(0);
                        startProgress();
                    } else {
                        onHide();
                    }
                }
            }
        }, interval);

        return () => clearInterval(timer);
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            // Move to previous story of current user
            setCurrentIndex(prev => prev - 1);
            setProgress(0);
        } else if (currentUserIndex > 0) {
            // Move to previous user's stories
            setCurrentUserIndex(prev => prev - 1);
            setCurrentUserStories(storiesByUser[userIds[currentUserIndex - 1]]);
            setCurrentIndex(storiesByUser[userIds[currentUserIndex - 1]].length - 1);
            setProgress(0);
        }
    };

    const handleNext = () => {
        if (currentIndex < currentUserStories.length - 1) {
            // Move to next story of current user
            setCurrentIndex(prev => prev + 1);
            setProgress(0);
        } else if (currentUserIndex < userIds.length - 1) {
            // Move to next user's stories
            setCurrentUserIndex(prev => prev + 1);
            setCurrentUserStories(storiesByUser[userIds[currentUserIndex + 1]]);
            setCurrentIndex(0);
            setProgress(0);
        } else {
            onHide();
        }
    };

    const currentStory = currentUserStories[currentIndex];

    if (!currentStory) {
        return null;
    }

    return (
        <Modal
            show={show}
            onHide={onHide}
            centered
            fullscreen
            className="story-viewer-modal"
        >
            <div 
                className="story-container"
                style={{
                    position: 'relative',
                    height: '90vh',
                    background: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
            >
                {/* Progress bars */}
                <div 
                    className="progress-container"
                    style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        right: '10px',
                        display: 'flex',
                        gap: '4px',
                        padding: '0 10px'
                    }}
                >
                    {currentUserStories.map((_, index) => (
                        <div
                            key={index}
                            style={{
                                flex: 1,
                                height: '2px',
                                background: '#ffffff40',
                                borderRadius: '2px',
                                overflow: 'hidden'
                            }}
                        >
                            <div
                                style={{
                                    width: `${index === currentIndex ? progress : index < currentIndex ? 100 : 0}%`,
                                    height: '100%',
                                    background: '#fff',
                                    transition: 'width 50ms linear'
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Story content */}
                <div 
                    className="story-content"
                    style={{
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    {currentStory.mediaType === 'image' ? (
                        <img
                            src={currentStory.media}
                            alt="Story"
                            style={{
                                maxWidth: '100%',
                                maxHeight: '70%',
                                objectFit: 'contain'
                            }}                  
                        />
                    ) : (
                        <video
                            src={currentStory.media}
                            controls
                            style={{
                                maxWidth: '100%',
                                maxHeight: '100%'
                            }}
                        />
                    )}
                </div>

                {/* Navigation buttons */}
                <button
                    className="btn btn-light rounded-circle position-absolute top-0 end-0 m-3"
                    onClick={onHide}
                    style={{ zIndex: 1 }}
                >
                    <FaTimes />
                </button>

                {(currentIndex > 0 || currentUserIndex > 0) && (
                    <button
                        className="btn btn-light rounded-circle position-absolute start-0"
                        onClick={handlePrevious}
                        style={{ zIndex: 1, margin: '0 20px' }}
                    >
                        <FaChevronLeft />
                    </button>
                )}

                {(currentIndex < currentUserStories.length - 1 || currentUserIndex < userIds.length - 1) && (
                    <button
                        className="btn btn-light rounded-circle position-absolute end-0"
                        onClick={handleNext}
                        style={{ zIndex: 1, margin: '0 20px' }}
                    >
                        <FaChevronRight />
                    </button>
                )}

                {/* Story info */}
                <div
                    className="story-info"
                    style={{
                        position: 'absolute',
                        bottom: '20px',
                        left: '20px',
                        right: '20px',
                        color: '#fff',
                        textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                    }}
                >
                    <div className="d-flex align-items-center mb-2">
                        <img
                            src={currentStory.userId.profilePicture}
                            alt="Profile"
                            className="rounded-circle me-2"
                            style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                        />
                        <div>
                            <h6 className="mb-0">{currentStory.userId.userName}</h6>
                            <small>{new Date(currentStory.createdAt).toLocaleTimeString()}</small>
                        </div>
                    </div>
                    {currentStory.caption && (
                        <p className="mb-0">{currentStory.caption}</p>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default StoryViewer; 