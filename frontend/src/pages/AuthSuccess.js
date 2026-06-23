import React, { useContext, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserContext } from '../contexts/UserContext';
import { getMe } from '../services/authService';
import CryptoUtils from '../utils/CryptoUtils'; // 🔹 Imported your encryption utility engine
import { updatePublickey } from '../services/keyse2e'; // 🔹 Service to update public key on backend
export default function AuthSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, setIsLoggedIn, setUser } = useContext(UserContext);
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
  }, [setUser, setIsLoggedIn]);

  // AuthSuccess.js - Updated logic
  useEffect(() => {
    const runAuthenticationSetup = async () => {
      const urlParams = new URLSearchParams(location.search);
      if (urlParams.get('auth_status') === 'success') {
        try {
          const key = await CryptoUtils.loadKeyLocally();
          if (!key) {
            console.warn("Private key missing. Generating new keys...");
            const keyPair = await CryptoUtils.generateSessionKeyPair();
            await CryptoUtils.saveKeyLocally(keyPair.privateKey);
            const publicKeyString =
              await CryptoUtils.exportPublicKeyString(
                keyPair.publicKey
              );

            await updatePublickey(publicKeyString);         
          }
          await fetchUser();
          navigate('/home', { replace: true });
        } catch (err) {
          console.error("Key generation failed:", err);
        }
      }
    };
    runAuthenticationSetup();
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.spinner}></div>
      <p style={styles.text}>Setting up your workspace and secure keys...</p>
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
    backgroundColor: '#09090b', // Updated to match onboarding background tone hex
    color: '#ffffff',
    fontFamily: 'sans-serif'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #1d1d21',
    borderTop: '4px solid #8b5cf6', // Updated to match onboarding accent color
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  },
  text: {
    fontSize: '14px',
    letterSpacing: '0.5px',
    color: '#a1a1aa'
  }
};