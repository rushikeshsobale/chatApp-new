import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Modal } from 'react-bootstrap';
import { FaTimes, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const STORY_DURATION = 5000;

const StoryViewer = ({ show, onHide, stories = [], currentStoryIndex = 0 }) => {
  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const [currentStoryIndexInUser, setCurrentStoryIndexInUser] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  // Group stories by user (memoized)
  const storiesByUser = useMemo(() => {
    const grouped = {};
    stories.forEach((story) => {
      const uid = story?.userId?._id ?? story?.userId; // be defensive
      if (!uid) return;
      if (!grouped[uid]) grouped[uid] = [];
      grouped[uid].push(story);
    });
    return grouped;
  }, [stories]);

  const userIds = useMemo(() => Object.keys(storiesByUser), [storiesByUser]);

  // Initialize indices when viewer opens
  useEffect(() => {
    if (!show) {
      // cleanup when hiding
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setProgress(0);
      setIsPaused(false);
      return;
    }

    if (show && stories.length > 0) {
      // currentStoryIndex is assumed to be index within `stories` prop (the array passed in)
      // Find a safe currentStory reference (fallback to first)
      const safeIndex = Math.max(0, Math.min(currentStoryIndex, stories.length - 1));
      const clickedStory = stories[safeIndex] ?? stories[0];

      const uid = clickedStory?.userId?._id ?? clickedStory?.userId;
      const userIndex = userIds.indexOf(uid);
      const storyIndexInUser = (storiesByUser[uid] || []).findIndex(s => s._id === clickedStory._id);

      setCurrentUserIndex(userIndex >= 0 ? userIndex : 0);
      setCurrentStoryIndexInUser(storyIndexInUser >= 0 ? storyIndexInUser : 0);
      setProgress(0);
      setIsPaused(false);

      // ensure no stray interval
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, currentStoryIndex, storiesByUser, userIds, stories]);

  const currentUserStories = userIds.length ? (storiesByUser[userIds[currentUserIndex]] || []) : [];
  const currentStory = currentUserStories[currentStoryIndexInUser];

  // Progress timer effect (single source of truth, clears previous interval first)
  useEffect(() => {
    if (!show || !currentStory) return;

    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    let step = 0;
    const intervalMs = 50;
    const totalSteps = Math.max(1, Math.floor(STORY_DURATION / intervalMs));

    timerRef.current = setInterval(() => {
      if (!isPaused) {
        step += 1;
        const pct = (step / totalSteps) * 100;
        setProgress(pct);

        if (step >= totalSteps) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          setProgress(0);
          handleNext(); // advance when complete
        }
      }
    }, intervalMs);

    // cleanup when currentStory changes or component unmounts
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStory, show, isPaused]);

  // Navigation handlers (they clear timer + reset progress)
  const handleNext = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setProgress(0);

    // next story of same user
    if (currentStoryIndexInUser < currentUserStories.length - 1) {
      setCurrentStoryIndexInUser((prev) => prev + 1);
      return;
    }

    // next user's first story
    if (currentUserIndex < userIds.length - 1) {
      const nextUser = userIds[currentUserIndex + 1];
      setCurrentUserIndex((prev) => prev + 1);
      setCurrentStoryIndexInUser(0);
      return;
    }

    // no more stories, close
    onHide();
  };

  const handlePrev = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setProgress(0);

    // previous story same user
    if (currentStoryIndexInUser > 0) {
      setCurrentStoryIndexInUser((prev) => prev - 1);
      return;
    }

    // previous user's last story
    if (currentUserIndex > 0) {
      const prevUserId = userIds[currentUserIndex - 1];
      const prevStories = storiesByUser[prevUserId] || [];
      setCurrentUserIndex((prev) => prev - 1);
      setCurrentStoryIndexInUser(Math.max(0, prevStories.length - 1));
      return;
    }

    // at beginning - optionally close or reset
    setProgress(0);
  };

  // Defensive: if no currentStory available, return null (or you can show loader)
  if (!currentStory) return null;

  const user = currentStory.userId || {};
  const username = user.userName || user.username || 'Unknown';
  const avatar = user.profilePicture || user.avatar || '/default-avatar.png';

  return (
    <Modal show={show} onHide={onHide} centered fullscreen className="story-viewer-modal">
      <div
        className="story-container"
        style={{
          position: 'relative',
          height: '90vh',
          background: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Progress bars for current user's stories */}
        <div
          className="progress-container"
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            right: '10px',
            display: 'flex',
            gap: '4px',
            padding: '0 10px',
            zIndex: 2
          }}
        >
          {currentUserStories.map((_, idx) => (
            <div key={idx} style={{ flex: 1, height: '2px', background: '#ffffff40', borderRadius: '2px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${idx === currentStoryIndexInUser ? progress : idx < currentStoryIndexInUser ? 100 : 0}%`,
                  height: '100%',
                  background: '#fff',
                  transition: 'width 50ms linear'
                }}
              />
            </div>
          ))}
        </div>

        {/* Media */}
        {currentStory.mediaType === 'image' ? (
          <img src={currentStory.media} alt="Story" style={{ maxWidth: '100%', maxHeight: '80%', objectFit: 'contain' }} />
        ) : (
          <video src={currentStory.media} controls style={{ maxWidth: '100%', maxHeight: '80%' }} />
        )}

        {/* Controls */}
        <button className="btn btn-light rounded-circle position-absolute top-0 end-0 m-3" onClick={() => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } onHide(); }}>
          <FaTimes />
        </button>

        {(currentStoryIndexInUser > 0 || currentUserIndex > 0) && (
          <button className="btn btn-light rounded-circle position-absolute start-0" onClick={handlePrev} style={{ margin: '0 20px' }}>
            <FaChevronLeft />
          </button>
        )}

        {(currentStoryIndexInUser < currentUserStories.length - 1 || currentUserIndex < userIds.length - 1) && (
          <button className="btn btn-light rounded-circle position-absolute end-0" onClick={handleNext} style={{ margin: '0 20px' }}>
            <FaChevronRight />
          </button>
        )}

        {/* User Info */}
        <div style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
          <div className="d-flex align-items-center mb-2">
            <img src={avatar} alt={username} className="rounded-circle me-2" style={{ width: '40px', height: '40px', objectFit: 'cover' }} />
            <div>
              <h6 className="mb-0">{username}</h6>
              <small>{new Date(currentStory.createdAt).toLocaleTimeString()}</small>
            </div>
          </div>
          {currentStory.caption && <p className="mb-0">{currentStory.caption}</p>}
        </div>
      </div>
    </Modal>
  );
};

export default StoryViewer;
