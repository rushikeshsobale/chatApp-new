import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal } from 'react-bootstrap';
import { FaTimes } from 'react-icons/fa';
import { updateStoryViewer } from '../services/profileService';

const STORY_DURATION = 5000;
const INTERVAL_MS = 50;

const StoryViewer = ({ show, onHide, storyGroups = [], setStoryGroups, initialGroup = null }) => {
  const user = JSON.parse(localStorage.getItem("user"));
  const myUserId = user?._id;

  const [currentUserIdx, setCurrentUserIdx] = useState(0);
  const [storyInUserIdx, setStoryInUserIdx] = useState(0); 
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  // 1. Sync active starting story safely on open
  useEffect(() => {
    if (show && initialGroup && storyGroups.length > 0) {
      const idx = storyGroups.findIndex(g => g.user?._id === initialGroup.user?._id);
      setCurrentUserIdx(idx !== -1 ? idx : 0);
      setStoryInUserIdx(0);
      setProgress(0);
    }
  }, [show, initialGroup, storyGroups]);

  // 2. Safely capture views without causing infinite component loops
  useEffect(() => {
    if (!show || !myUserId || storyGroups.length === 0) return;

    const activeStory = storyGroups[currentUserIdx]?.stories?.[storyInUserIdx];
    if (!activeStory) return;

    // Optional chaining & strict checking to completely eliminate the .toString() crash
    const hasViewed = activeStory.viewers?.some(v => v?.toString() === myUserId.toString());
    
    if (!hasViewed) {
      updateStoryViewer(activeStory._id)
        .then(() => {
          // Use functional state updates to avoid React parent rendering sync collisions
          setStoryGroups(prevGroups => 
            prevGroups.map((group, gIdx) => {
              if (gIdx !== currentUserIdx) return group;
              
              const updatedStories = group.stories.map((s, sIdx) => {
                if (sIdx !== storyInUserIdx) return s;
                
                // Keep unique viewers safely packed
                const existingViewers = s.viewers || [];
                if (existingViewers.some(v => v?.toString() === myUserId.toString())) return s;

                return {
                  ...s,
                  viewers: [...existingViewers, myUserId]
                };
              });
              return { ...group, stories: updatedStories };
            })
          );
        })
        .catch(err => console.error("View update failed", err));
    }
  }, [show, currentUserIdx, storyInUserIdx, myUserId, storyGroups, setStoryGroups]);

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

  // 4. Timer Handling Loop
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

  // Safeguard calculations to prevent layout rendering breaks
  const activeGroup = storyGroups[currentUserIdx];
  const activeStory = activeGroup?.stories?.[storyInUserIdx];

  if (!show || !activeStory || !activeGroup) return null;

  return (
    <Modal show={show} onHide={onHide} centered fullscreen className="p-0 border-0">
      {/*  To look like this: */}
<div 
  style={{ background: '#000', height: '100vh', width: '100vw', position: 'relative' }}
  onMouseDown={() => setIsPaused(true)}
  onMouseUp={() => setIsPaused(false)}
  onTouchStart={() => setIsPaused(true)}
  onTouchEnd={() => setIsPaused(false)}
>
        {/* Progress Bars */}
        <div style={{ position: 'absolute', top: '15px', left: '10px', right: '10px', display: 'flex', gap: '4px', zIndex: 10 }}>
          {activeGroup.stories?.map((_, idx) => (
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
              src={activeGroup.user?.profilePicture || '/default-avatar.png'}
              className="rounded-circle me-2"
              alt=""
              style={{ width: '40px', height: '40px', objectFit: 'cover', border: '1px solid white' }}
            />
            <span style={{ fontWeight: '600' }}>{activeGroup.user?.userName || 'User'}</span>
          </div>
          <button className="btn text-white p-0 border-0 shadow-none" onClick={onHide}><FaTimes size={24} /></button>
        </div>

        {/* Click-to-Navigate Overlays */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '35%', zIndex: 8 }} onClick={handlePrev} />
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '35%', zIndex: 8 }} onClick={handleNext} />

        {/* Media Content Display Box */}
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