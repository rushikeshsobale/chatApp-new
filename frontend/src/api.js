// src/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 10000, // 10 seconds
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for auth tokens if needed
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // Token expired or unauthenticated -> dump to login
          window.location.href = '/login';
          break;
        case 403:
          // Forbidden resource
          console.error('Forbidden access');
          break;
        case 404:
          // Backend route/resource not found -> send to 404 client page
          window.location.href = '/not-found';
          break;
        case 500:
        default:
          // System crashes / unhandled server errors -> general error page
          window.location.href = '/error';
          console.error('API Error:', error.response.data);
      }
    } else {
      // Network issues / server down completely
      window.location.href = '/error';
      console.error('Network Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;