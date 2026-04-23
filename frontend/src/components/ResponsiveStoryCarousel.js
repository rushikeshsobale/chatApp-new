import React, { useRef, useEffect, useState } from 'react';
import StoryCircle from './StoryCircle';

const ResponsiveStoryCarousel = ({ storyGroups, onStoryClick, currentUserId }) => {
  const scrollContainerRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 1️⃣ No more Map/deduplication needed! We use storyGroups directly.

  const checkScrollPosition = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 5);
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollPosition);
      checkScrollPosition();
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (container) container.removeEventListener('scroll', checkScrollPosition);
    };
  }, [storyGroups]); // Re-run when data changes

  const scroll = (direction) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const scrollAmount = direction === 'left' ? -300 : 300;
    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  return (
    <div className="responsive-story-carousel">
      {showLeftArrow && !isMobile && (
        <button className="carousel-arrow left-arrow" onClick={() => scroll('left')}>‹</button>
      )}

      <div
        ref={scrollContainerRef}
        className="stories-scroll-container"
        style={{
          display: 'flex',
          overflowX: 'auto',
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
         
          padding: '10px 5px'
        }}
      >
        {/* 2️⃣ Map through the grouped data */}
        {storyGroups?.map((group) => (
          <div key={group.user._id} className="story-item">
            <StoryCircle
              group={group} // 👈 Ensure this matches the prop name in StoryCircle.js
              onClick={onStoryClick}
              currentUserId={currentUserId}
            />
          </div>
        ))}
      </div>

      {showRightArrow && !isMobile && (
        <button className="carousel-arrow right-arrow" onClick={() => scroll('right')}>›</button>
      )}

      <style jsx>{`
        .responsive-story-carousel { position: relative; width: 100%; }
        .stories-scroll-container::-webkit-scrollbar { display: none; } /* cleaner look */
        .stories-scroll-container { scrollbar-width: none; }
        .carousel-arrow {
          position: absolute; top: 50%; transform: translateY(-50%);
          width: 32px; height: 32px; border-radius: 50%;
          background: white; border: 1px solid #ddd;
          cursor: pointer; z-index: 10; box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .left-arrow { left: -10px; }
        .right-arrow { right: -10px; }
      `}</style>
    </div>
  );
};

export default ResponsiveStoryCarousel;