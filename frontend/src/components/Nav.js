import React from 'react';
import { Link } from 'react-router-dom';
import '../css/Nav.css'; // Separate CSS file for styling

const BottomNav = () => {
  return (
    <div className="bottom-nav">
      <Link to="/home" className="nav-item">
        <i className="bi bi-house-door-fill"></i>
        <span>Home</span>
      </Link>
      <Link to="/Users" className="nav-item">
        <i className="bi bi-compass-fill"></i>
        <span>Discover</span>
      </Link>
      <Link to="/add-post" className="nav-item center">
        <i className="bi bi-plus-circle-fill"></i>
      </Link>
      <Link to="/messages" className="nav-item">
        <i className="bi bi-chat-dots-fill"></i>
        <span>Messages</span>
      </Link>
      <Link to="/ProfilePage" className="nav-item">
        <i className="bi bi-person-circle"></i>
        <span>Profile</span>
      </Link>
    </div>
  );
};

export default BottomNav;
