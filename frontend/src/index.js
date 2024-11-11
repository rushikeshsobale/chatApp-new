import React from 'react';
import ReactDOM from 'react-dom';
import './css/index.css';
//import App from './App';
import reportWebVitals from './reportWebVitals';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

import Navbar from './components/Nav.js';
import AuthForms from './pages/AuthForms.js';
import { BrowserRouter, Routes, Route} from 'react-router-dom';
import Users from './pages/Users.js';
import ChatComponent from './pages/Chat.js';
import { store } from './store/store'
import { Provider } from 'react-redux'
import ProfilePage from './pages/ProfilePage.js';
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
<Provider store={store}>
    <div className='overlay'>
    <BrowserRouter>
    <Navbar/>
    <Routes>
          <Route path="/" element={< AuthForms/>}></Route>
          <Route path="/home" element={<ChatComponent/>}></Route>
          <Route path="/Users" element={<Users/>}></Route>
          <Route path="/ProfilePage/:userId" element={<ProfilePage/>}></Route>
          <Route path="/ProfilePage" element={<ProfilePage/>}></Route>
        </Routes>
    </BrowserRouter>
  </div>
  </Provider>
);
reportWebVitals();
