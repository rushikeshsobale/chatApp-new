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

// 1. Reusable Navigation Context Conditonal Wrapper
const ManagedNavbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn } = useContext(UserContext);

  console.log("ManagedNavbar evaluation path:", location.pathname, { isLoggedIn });

  // ✅ FIX: Move side-effect routing logic safely into a useEffect hook
  useEffect(() => {
    if (!isLoggedIn) {
      console.log("User unauthenticated! Redirecting safely to /login...");
      navigate('/login', { replace: true });
    }
  }, [isLoggedIn, navigate]);

  // If the user isn't logged in, stop rendering immediately 
  if (!isLoggedIn) {
    return null;
  }

  // Hide the navbar entirely if visiting chats or ANY route outside /profile and /home
  if (
    location.pathname === '/chats' || 
    (location.pathname !== '/profile' && location.pathname !== '/home')
  ) {
    return null;
  }

  return (
    <div className='container-fluid mt-1'>
      <Navbar />
    </div>
  );
};

function App() {
  const dispatch = useDispatch();
  const { isLoggedIn } = useSelector((state) => state.chat);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const isDark = useContext(ThemeContext).isDark;

  const {
    socket,
    loadUnseenMessages,
    incomingCall,
    setIncomingCall,
    showIncoming,
    setShowIncoming
  } = useContext(UserContext);


  // 3. Socket Realtime Notifications Pipeline
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

  // 4. Clean Socket Disconnection Teardown
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  // 5. Dynamic Device Viewport Unit Normalization
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

      {/* Realtime VoIP Signaling Layer Overlay */}
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
        {/* Safely handles hiding navbar on /chats now that it is inside <BrowserRouter> */}
        <ManagedNavbar
          isAuthenticated={isAuthenticated}
          setIsAuthenticated={setIsAuthenticated}
        />

        <Routes>
          {/* Default Dynamic Root Destination Mapping */}
          <Route path="/" element={isAuthenticated ? <ProfilePage /> : <AuthForms />} />
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
          <Route path="/auth-success" element={<AuthSuccess />} />
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
          {/* Universal 404 Fallback Catch (For invalid typed-out client URLs) */}
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;