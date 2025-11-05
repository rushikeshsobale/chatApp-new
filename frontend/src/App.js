import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import PageNotFound from './components/PageNotFound';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import Register from './components/Register';
import Home from './components/Home';
import SavedPosts from './pages/SavedPosts';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { initializeSocket } from './redux/socketSlice';

function App() {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(initializeSocket());
  }, [dispatch]);

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          {/* <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          /> */}
          <Route
            path="/saved"
            element={
              <ProtectedRoute>
                <SavedPosts />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
