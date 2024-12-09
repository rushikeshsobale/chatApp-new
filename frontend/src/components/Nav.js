import React, { useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import '../css/Nav.css'; // import your custom styles
import AuthForms from '../pages/AuthForms';
import Notification from './Notification';
const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav className="navbar" style={{ zIndex: 1 }}>
    <div className="navbar-container ">
      <div className={`navbar-menu ${isOpen ? 'active' : ''} m-auto`}>
        <Link to="/home" className="nav-item">Home</Link>
        <Link to="/" className="nav-item">Sign Up</Link>
        <Link to="/Users" className="nav-item">Discover</Link>
        <Link to="/ProfilePage" className="nav-item">Profile</Link>
      </div>
      <div className='mr-3'>
      <Notification /> 
      </div>
      <div className="navbar-toggle " onClick={toggleMenu}>
        <div className={`menu-icon  mx-3${isOpen ? 'open' : ''}`}>
          <div className="menu-icon-inner"></div>
          <div className="menu-icon-inner"></div>
          <div className="menu-icon-inner"></div>
        </div>
      </div>
    </div>
  </nav>
  );
};

export default Navbar;
