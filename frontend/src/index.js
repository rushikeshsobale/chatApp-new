// index.js
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './css/index.css';
import reportWebVitals from './reportWebVitals';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import Navbar from './components/Nav.js';
import AuthForms from './pages/AuthForms.js';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Users from './pages/Users.js';
import ChatComponent from './pages/Chat.js';
import ProfilePage from './pages/ProfilePage.js';
import { store } from './store/store';
import { Provider } from 'react-redux';
import { useDispatch } from 'react-redux';
import { updateNotifications } from './store/notificationSlice';
import { useSocket, SocketProvider } from './components/socketContext.js';
import io from 'socket.io-client';
const AppWrapper = () => {
  const {socket, setSocket, setUserId, userId} = useSocket();
  const dispatch = useDispatch();
  console.log(userId, 'checking userId')
  useEffect(() => {
    if (socket) {
      socket.on('friendRequestNotification', (data) => {
       dispatch(updateNotifications(data));
       const audio = new Audio('/mixkit-bell-notification-933.wav');
        audio.play();
      });
    }

  }, [socket, dispatch]);

  useEffect(()=>{
    return () => {
      if (socket) {
        socket.disconnect();
      }
    }

  },[])



  return (
    <div className="overl">
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<AuthForms />} />
          <Route path="/home" element={<ChatComponent />} />
          <Route path="/Users" element={<Users />} />
          <Route path="/ProfilePage/:userId" element={<ProfilePage />} />
          <Route path="/ProfilePage" element={<ProfilePage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Provider store={store}>
    <SocketProvider>
      <AppWrapper /> {/* Wrap your app with the socket listener setup */}
    </SocketProvider>
  </Provider>
);

reportWebVitals();
