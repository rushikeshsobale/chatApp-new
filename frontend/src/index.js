import React, { useEffect, useState, useContext } from 'react';
import ReactDOM from 'react-dom/client';
import './css/index.css';
import reportWebVitals from './reportWebVitals';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import Navbar from './components/Nav.js';
import AuthForms from './pages/AuthForms.js';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Users from './pages/Users.js';
import ChatComponent from './pages/Chat.js';
import ProfilePage from './pages/ProfilePage.js';
import { store } from './store/store';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { updateNotifications } from './store/notificationSlice';
import PostFeed from './pages/PostFeed.js';
import PostDetail from './components/PostDetail.js';
import ExplorePage from './pages/ExplorePage.js';
import ForgotPassword from './components/ForgotPassword.js';
import Onboarding from './components/Onboarding.js';
import Friends from './pages/Friends.js';
import UserProfilePage from './pages/userProfile.js';
import ResetPassword from './components/ResetPassword.js';
import { UserProvider, UserContext} from './contexts/UserContext';
import AuthSuccess from "./pages/AuthSuccess";
import IncomingCall from './components/videoCall/IncomingCall.js';
const AppWrapper = () => {
  const { isLoggedIn } = useSelector((state) => state.chat);  // Access isLoggedIn from Redux store
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const dispatch = useDispatch();
  const { socket, loadUnseenMessages, incomingCall, setIncomingCall, showIncoming, setShowIncoming, callData} = useContext(UserContext);
   useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
          setIsAuthenticated(true); 
        } 
      }, [isLoggedIn]);
  useEffect(() => {
    if (socket) {
      socket.on('friendRequestNotification', (data) => {
        dispatch(updateNotifications(data));
        const audio = new Audio('/mixkit-bell-notification-933.wav');
        audio.play();
      });
    }
  }, [socket, dispatch]);
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);
  useEffect(() => {
    if (!socket) {
      console.log('')
      return
    }
    const handleRecievedMessage = () => {
      console.log("received message on frontend!");
      loadUnseenMessages();
    };
    socket.on('recievedMessage', handleRecievedMessage);
   
  }, [socket]);
 
  return (
    <div className="" style={{background:'black'}}>
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
      <BrowserRouter>
        {/* Conditionally render Navbar only when isAuthenticated and isLoggedIn are true */}
        { isAuthenticated && <Navbar />}
        <Routes>
         {isAuthenticated ? <Route path="/" element={<ProfilePage/>} /> : <Route path="/" element={<AuthForms/>} />}
          <Route path="/login" element={<AuthForms />} />
          <Route path="/home" element={<PostFeed />} />
          <Route path="/chats" element={<ChatComponent />} />
          <Route path="/ProfilePage/:userId" element={<ProfilePage />} />
          <Route path="/Profile" element={<ProfilePage />} />
          <Route path="/friends" element={<Friends />} />
          <Route path="/postDetails/:postId" element={<PostDetail/>} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/forgot-password" element={<ForgotPassword/>}/>
          <Route path="/onboarding" element={<Onboarding/>}/>
          <Route path="/userProfile/:userId" element = {<UserProfilePage/>}/>
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth-success" element={<AuthSuccess />} />
        </Routes>
        
      </BrowserRouter>
    </div>
  );
};
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Provider store={store}>
    <UserProvider>
      <AppWrapper />
    </UserProvider>
  </Provider>
);
reportWebVitals();
