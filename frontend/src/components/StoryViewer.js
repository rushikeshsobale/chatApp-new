import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal } from 'react-bootstrap';
import { FaTimes } from 'react-icons/fa';
import { updateStoryViewer } from '../services/profileService';
const STORY_DURATION = 5000;
const INTERVAL_MS = 50;
const StoryViewer = ({ show, onHide, storyGroups = [], setStoryGroups, initialGroup = null }) => {
  const user = JSON.parse(localStorage.getItem("user"));
  const myUserId = user?.userId
  const [currentUserIdx, setCurrentUserIdx] = useState(0);
  const [storyInUserIdx, setStoryInUserIdx] = useState(0); 
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);
  useEffect(() => {
    if (show && initialGroup) {
      const idx = storyGroups.findIndex(g => g.user._id === initialGroup.user._id);
      setCurrentUserIdx(idx !== -1 ? idx : 0);
      setStoryInUserIdx(0);
      setProgress(0);
    }
  }, [show, initialGroup, storyGroups]);
  useEffect(() => {
  const activeStory = storyGroups[currentUserIdx]?.stories[storyInUserIdx];

  // 1. Check if the story exists and if I haven't viewed it yet
  if (show && activeStory && !activeStory.viewers?.some(v => v.toString() === myUserId?.toString())) {
    
    // 2. Call the API
    updateStoryViewer(activeStory._id)
      .then(() => {
        // 3. On Success: Update local state immediately
        setStoryGroups(prevGroups => {
          return prevGroups.map((group, gIdx) => {
            // Only target the current user's group
            if (gIdx === currentUserIdx) {
              const updatedStories = group.stories.map((s, sIdx) => {
                // Only target the specific story being viewed
                if (sIdx === storyInUserIdx) {
                  return {
                    ...s,
                    viewers: [...(s.viewers || []), myUserId] // Add my ID to the list
                  };
                }
                return s;
              });
              return { ...group, stories: updatedStories };
            }
            return group;
          });
        });
      })
      .catch(err => console.error("View update failed", err));
  }
}, [show, currentUserIdx, storyInUserIdx, myUserId, setStoryGroups]);

  // 3. Navigation Logic
  const handleNext = useCallback(() => {
    const currentStories = storyGroups[currentUserIdx]?.stories || [];
    
    if (storyInUserIdx < currentStories.length - 1) {
      setStoryInUserIdx(prev => prev + 1);
    } else if (currentUserIdx < storyGroups.length - 1) {
      setCurrentUserIdx(prev => prev + 1);
      setStoryInUserIdx(0);
    } else {
      onHide();
    }
    setProgress(0);
  }, [currentUserIdx, storyInUserIdx, storyGroups, onHide]);

  const handlePrev = useCallback(() => {
    if (storyInUserIdx > 0) {
      setStoryInUserIdx(prev => prev - 1);
    } else if (currentUserIdx > 0) {
      const prevUserStories = storyGroups[currentUserIdx - 1]?.stories || [];
      setCurrentUserIdx(prev => prev - 1);
      setStoryInUserIdx(prevUserStories.length - 1);
    }
    setProgress(0);
  }, [currentUserIdx, storyInUserIdx, storyGroups]);

  // 4. Timer Logic
  useEffect(() => {
    if (!show || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (INTERVAL_MS / STORY_DURATION) * 100;
        if (next >= 100) {
          handleNext();
          return 0;
        }
        return next;
      });
    }, INTERVAL_MS);

    return () => clearInterval(timerRef.current);
  }, [show, isPaused, handleNext]);

  // Active Data Helpers
  const activeGroup = storyGroups[currentUserIdx];
  const activeStory = activeGroup?.stories[storyInUserIdx];

  if (!show || !activeStory) return null;

  return (
    <Modal show={show} onHide={onHide} centered fullscreen className="p-0 border-0">
      <div 
        style={{ background: '#000', height: '100vh', width: '100vw', position: 'relative' }}
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Progress Bars */}
        <div style={{ position: 'absolute', top: '15px', left: '10px', right: '10px', display: 'flex', gap: '4px', zIndex: 10 }}>
          {activeGroup.stories.map((_, idx) => (
            <div key={idx} style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.3)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                background: '#fff',
                width: `${idx === storyInUserIdx ? progress : idx < storyInUserIdx ? 100 : 0}%`,
                transition: idx === storyInUserIdx ? 'none' : 'width 0.1s linear'
              }} />
            </div>
          ))}
        </div>

        {/* Header */}
        <div style={{ position: 'absolute', top: '30px', left: '15px', right: '15px', display: 'flex', justifyContent: 'space-between', zIndex: 10, color: '#fff' }}>
          <div className="d-flex align-items-center">
            <img
              src={activeGroup.user.profilePicture}
              className="rounded-circle me-2"
              style={{ width: '40px', height: '40px', objectFit: 'cover', border: '1px solid white' }}
            />
            <span style={{ fontWeight: '600' }}>{activeGroup.user.userName}</span>
          </div>
          <button className="btn text-white p-0 border-0 shadow-none" onClick={onHide}><FaTimes size={24} /></button>
        </div>

        {/* Navigation Overlays */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '35%', zIndex: 8 }} onClick={handlePrev} />
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '35%', zIndex: 8 }} onClick={handleNext} />

        {/* Media Content */}
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {activeStory.mediaType === 'video' ? (
            <video key={activeStory._id} src={activeStory.media} autoPlay playsInline style={{ maxWidth: '100%', maxHeight: '100%' }} />
          ) : (
            <img key={activeStory._id} src={activeStory.media} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          )}
        </div>
      </div>
    </Modal>
  );
};

export default StoryViewer;