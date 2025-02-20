import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaHome, FaCompass, FaPlusCircle, FaUserCircle } from 'react-icons/fa'; // FontAwesome icons
import '../css/Nav.css'; // Updated CSS file
import { PiChats } from "react-icons/pi";
const BottomNav = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [activeLink, setActiveLink] = useState('/home'); // Set the default active link

  const handleLinkClick = (link) => {
    setActiveLink(link); // Update the active link when clicked
  };
  useEffect(() => {
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      if (window.scrollY > lastScrollY) {
        setIsVisible(false); // Hide on scroll down
      } else {
        setIsVisible(true); // Show on scroll up
      }
      lastScrollY = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="d-flex justify-content-center">
    <nav className="floating-nav container py-2 d-flex align-items-center justify-content-between">
      {/* Logo */}
      <div className="nav-logo d-flex align-items-center col-lg-6 col-0">
        <img 
          src="https://via.placeholder.com/40" 
          alt="Logo" 
          className="me-2"
          style={{ width: "40px", height: "40px", borderRadius: "50%" }} 
        />
        <span className="fw-bold text-white">LOGO</span>
      </div>

      {/* Navigation Links */}
      <div className="d-flex col-lg-4 col-12 justify-content-around">
        <Link
          to="/home"
          className={`nav-item d-flex flex-column align-items-center ${
            activeLink === "/home" ? "active" : ""
          }`}
          onClick={() => handleLinkClick("/home")}
        >
          <FaHome size={24} />
          <span>Home</span>
        </Link>

        <Link
          to="/chats"
          className={`nav-item d-flex flex-column align-items-center ${
            activeLink === "/chats" ? "active" : ""
          }`}
          onClick={() => handleLinkClick("/chats")}
        >
          <PiChats size={24}/>
          <span>Chats</span>
        </Link>

        <Link
          to="/postFeeds"
          className={`nav-item d-flex flex-column align-items-center ${
            activeLink === "/postFeeds" ? "active" : ""
          }`}
          onClick={() => handleLinkClick("/postFeeds")}
        >
          <FaPlusCircle size={24} />
          <span>Explore</span>
        </Link>

        <Link
          to="/ProfilePage"
          className={`nav-item d-flex flex-column align-items-center ${
            activeLink === "/ProfilePage" ? "active" : ""
          }`}
          onClick={() => handleLinkClick("/ProfilePage")}
        >
          <FaUserCircle size={24} />
          <span>Profile</span>
        </Link>
      </div>
    </nav>
  </div>

  );
};

export default BottomNav;
