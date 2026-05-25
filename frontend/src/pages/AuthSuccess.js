import React, { useContext, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserContext } from '../contexts/UserContext';
import { getMe } from '../services/authService';

export default function AuthSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const {isLoggedIn,setIsLoggedIn, setUser} = useContext(UserContext);
    const fetchUser = useCallback(async () => {
      try {
        const res = await getMe();
        if (res && res._id) {
          localStorage.setItem('user', JSON.stringify(res));
          setUser(res);
          setIsLoggedIn(true);  
        }
      } catch (err) {
        console.error("Error running fallback fetchUser API:", err);
      }
    }, []);
    
  useEffect(() => {
    // 1. Parse the URL params
    const urlParams = new URLSearchParams(location.search);
    const authStatus = urlParams.get('auth_status');
    const username = urlParams.get('username');
   
    if (authStatus === 'success') {
      // 2. Set your localStorage variables
      localStorage.setItem('user_logged_in', 'true');
      localStorage.setItem('username', username || '');
      fetchUser(); // Ensure we fetch the user data to populate context
      // 3. Smoothly redirect to /home 
      // 'replace: true' clears this loading screen from browser history
      setTimeout(() => {
      navigate('/home', { replace: true });
      }, 1000); // Optional: Add a slight delay for better UX
    } else {
      // Fallback if something went wrong during OAuth
      navigate('/login', { replace: true });
    }
  }, [navigate, location]);
   
  

  return (
    <div style={styles.container}>
      <div style={styles.spinner}></div>
      <p style={styles.text}>Setting up your workspace...</p>
    </div>
  );
}

// Quick minimal dark styles to match a clean dev aesthetic
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#121212',
    color: '#ffffff',
    fontFamily: 'sans-serif'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #333',
    borderTop: '4px solid #00ffff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  },
  text: {
    fontSize: '16px',
    letterSpacing: '0.5px',
    color: '#aaa'
  }
};