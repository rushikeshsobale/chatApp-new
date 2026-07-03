import React, { useEffect, useContext, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";

import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";

import { UserContext } from "./contexts/UserContext";
import { ThemeContext } from "./contexts/ThemeContext";

import Navbar from "./components/Nav";
import AuthForms from "./pages/AuthForms";
import IncomingCall from "./components/videoCall/IncomingCall";

import { updateNotifications } from "./store/notificationSlice";
import { getUserData } from "./services/profileService";

// Lazy loaded routes
const HomePage = lazy(() => import("./pages/Home"));
const ChatComponent = lazy(() => import("./pages/Chat"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const ExplorePage = lazy(() => import("./pages/ExplorePage"));
const Friends = lazy(() => import("./pages/Friends"));
const UserProfilePage = lazy(() =>
  import("./components/profile/UserProfilePage")
);
const PostDetail = lazy(() => import("./components/PostDetail"));
const ForgotPassword = lazy(() => import("./components/ForgotPassword"));
const Onboarding = lazy(() => import("./components/Onboarding"));
const ResetPassword = lazy(() => import("./components/ResetPassword"));
const AuthSuccess = lazy(() => import("./pages/AuthSuccess"));
const ErrorPage = lazy(() => import("./pages/ErrorPage"));
const PageNotFound = lazy(() => import("./components/PageNotFound"));

// 1. Reusable Navigation Context Conditional Wrapper
const ManagedNavbar = () => {
  const location = useLocation();

  const showNavbar = [
    "/home",
    "/profile",
    "/friends", 
  ].some((route) =>
    location.pathname.toLowerCase().startsWith(route)
  );

  return showNavbar ? <Navbar /> : null;
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
      setUser(loggedIn); // Populate immediately from cache so the UI isn't blank

      // Cached fields like profilePicture are pre-signed S3 urls that expire
      // after an hour, so refresh from the server to pick up a live one.
      getUserData()
        .then((freshUser) => {
          setUser(freshUser);
          localStorage.setItem('user', JSON.stringify(freshUser));
        })
        .catch((err) => {
          console.error("Failed to refresh user data:", err);
        });
    } else {
      console.log("User is not logged in.");
    }
  }, []);
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
    <div className={`App  ${isDark ? 'text-light' : 'bg-light text-dark'} `}>
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

        <Suspense
          fallback={
            <div className="d-flex justify-content-center align-items-center vh-100">
              Loading...
            </div>
          }
        >
          <Routes>
            <Route
              path="/"
              element={isLoggedIn ? <ProfilePage /> : <AuthForms />}
            />

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

            <Route
              path="/error"
              element={
                <ErrorPage
                  errorCode="500"
                  errorMessage="Our servers are having a bit of trouble reaching the dashboard database. Please try again shortly."
                />
              }
            />

            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </div>
  );
}

export default App;