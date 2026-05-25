import React, { useEffect, useState, useContext } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

// Style Dependencies
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './App.css';

// Context Architecture
import { UserContext } from './contexts/UserContext';
import { ThemeContext } from './contexts/ThemeContext';

// Application Pages & Components
import Navbar from './components/Nav.js';
import AuthForms from './pages/AuthForms.js';
import Users from './pages/Users.js';
import ChatComponent from './pages/Chat.js';
import ProfilePage from './pages/ProfilePage.js';
import PostDetail from './components/PostDetail.js';
import ExplorePage from './pages/ExplorePage.js';
import ForgotPassword from './components/ForgotPassword.js';
import Onboarding from './components/Onboarding.js';
import Friends from './pages/Friends.js';
import UserProfilePage from "./components/profile/UserProfilePage";
import ResetPassword from './components/ResetPassword.js';
import AuthSuccess from "./pages/AuthSuccess";
import IncomingCall from './components/videoCall/IncomingCall.js';
import SetPasswordcomponent from './pages/PasswordSetting.js';
import PageNotFound from './components/PageNotFound';

// Redux Slices / Action hooks
import { updateNotifications } from './store/notificationSlice';
import ErrorPage from './pages/ErrorPage.js';
import HomePage from './pages/Home.js';
import { setUser } from './store/action.js';

// 1. Reusable Navigation Context Conditional Wrapper
const ManagedNavbar = () => {
  const location = useLocation();
  const { isLoggedIn, user } = useContext(UserContext);
 
  useEffect(() => {
    console.log("ManagedNavbar evaluation path:", location.pathname, { isLoggedIn });


  }, [location.pathname, isLoggedIn]);
 

 if(location.pathname ==='/home' || location.pathname ==='/profile' ){
  return (
    <div className='container-fluid mt-1'>
      <Navbar />
    </div>
  );
}
else{
  return null;
}
};

function App() {
  const dispatch = useDispatch();
  const isDark = useContext(ThemeContext).isDark;

  // ✅ FIX 1: Rename the Redux variable to avoid shadowing your authentication context


  // ✅ FIX 2: Connect directly to the True Context Engine variables
  const {
    setUser,
    socket,
    loadUnseenMessages,
    incomingCall,
    setIncomingCall,
    showIncoming,
    setShowIncoming,
    isLoggedIn, // 👈 Grabbing the actual global Boolean login state
  } = useContext(UserContext);

  useEffect(() => {
    console.log("App component mounted, checking login status...");
    const loggedIn = JSON.parse(localStorage.getItem('user'));
    if (loggedIn) {
      console.log("User is logged in: ", loggedIn);
      setUser(loggedIn); // Ensure we populate the global user state on app load
    } else {
      console.log("User is not logged in.");
    }
  },[]);
  // Realtime VoIP Signaling Layer Overlay
  useEffect(() => {
    if (socket) {
      socket.on('friendRequestNotification', (data) => {
        dispatch(updateNotifications(data));
        const audio = new Audio('/mixkit-bell-notification-933.wav');
        audio.play().catch(e => console.log("Audio autoplay deferred:", e));
      });

      socket.on('recievedMessage', () => {
        loadUnseenMessages();
      });
    }

    return () => {
      if (socket) {
        socket.off('friendRequestNotification');
        socket.off('recievedMessage');
      }
    };
  }, [socket, dispatch, loadUnseenMessages]);

  // Clean Socket Disconnection Teardown
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  // Dynamic Device Viewport Unit Normalization
  useEffect(() => {
    function setHeight() {
      document.documentElement.style.setProperty(
        '--vh',
        `${window.innerHeight * 0.01}px`
      );
    }
    setHeight();
    window.addEventListener('resize', setHeight);
    return () => window.removeEventListener('resize', setHeight);
  }, []);

  return (
    <div className={`App bg-dark ${isDark ? 'bg-dark text-light' : 'bg-light text-dark'} pt-1`}>
      {incomingCall && (
        <IncomingCall
          show={showIncoming}
          callData={incomingCall}
          onAccept={() => setShowIncoming(false)}
          onDecline={() => {
            setShowIncoming(false);
            setIncomingCall(null);
          }}
        />
      )}

      {/* Global Application Router Engine */}
      <BrowserRouter>
        <ManagedNavbar />

        <Routes>
          {/* ✅ FIX 3: Bind root route conditional rendering directly to Context isLoggedIn */}
          <Route path="/" element={isLoggedIn ? <ProfilePage /> : <AuthForms />} />
          <Route path="/auth-success" element={<AuthSuccess />} />
          
          {/* Standard Explicit Endpoints */}
          <Route path="/login" element={<AuthForms />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/chats" element={<ChatComponent />} />
          <Route path="/ProfilePage/:userId" element={<ProfilePage />} />
          <Route path="/Profile" element={<ProfilePage />} />
          <Route path="/friends" element={<Friends />} />
          <Route path="/postDetails/:postId" element={<PostDetail />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/userProfile/:userId" element={<UserProfilePage />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/set_password" element={<SetPasswordcomponent />} />
          <Route
            path="/error"
            element={
              <ErrorPage
                errorCode="500"
                errorMessage="Our servers are having a bit of trouble reaching the dashboard database. Please try again shortly."
              />
            }
          />
          <Route path="/not-found" element={<PageNotFound />} />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;