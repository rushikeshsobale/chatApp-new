import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaPlusCircle, FaUserCircle } from 'react-icons/fa';
import { PiChats, PiCompass } from 'react-icons/pi';
import { motion, AnimatePresence } from 'framer-motion';
import '../css/Nav.css';

const BottomNav = () => {
  const location = useLocation();
  const [activeLink, setActiveLink] = useState(location.pathname);
  const [isVisible, setIsVisible] = useState(true);
  const [isHovering, setIsHovering] = useState(null);

  // Auto-hide on scroll
  useEffect(() => {
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      if (window.scrollY > lastScrollY && window.scrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      lastScrollY = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Update active link on route change
  useEffect(() => {
    setActiveLink(location.pathname);
  }, [location]);

  const navItems = [
    { path: "/home", icon: <FaHome size={22} />, label: "Home" },
    { path: "/chats", icon: <PiChats size={22} />, label: "Chats" },
    { path: "/explore", icon: <PiCompass size={22} />, label: "Explore" },
    { path: "/profile", icon: <FaUserCircle size={22} />, label: "Profile" }
  ];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          className="bottom-nav-container d-none"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25 }}
        >
          <nav className="glass-nav">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${activeLink === item.path ? 'active' : ''}`}
                onMouseEnter={() => setIsHovering(item.path)}
                onMouseLeave={() => setIsHovering(null)}
              >
                <motion.div
                  className="nav-icon"
                  animate={{
                    y: activeLink === item.path ? -5 : 0,
                    scale: isHovering === item.path ? 1.15 : 1
                  }}
                  transition={{ type: 'spring', stiffness: 500 }}
                >
                  {item.icon}
                </motion.div>
                <motion.span
                  className="nav-label"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ 
                    opacity: activeLink === item.path ? 1 : 0.7,
                    y: activeLink === item.path ? 0 : 5
                  }}
                >
                  {item.label}
                </motion.span>
                
                {activeLink === item.path && (
                  <motion.div 
                    className="active-indicator"
                    layoutId="activeIndicator"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            ))}
            
            {/* Floating Action Button */}
            <motion.div 
              className="fab"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaPlusCircle size={24} />
            </motion.div>
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BottomNav;