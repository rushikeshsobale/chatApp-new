// src/api.js
import axios from 'axios';

// Routes where errors should be handled locally (forms show inline messages)
const AUTH_ROUTES = ['/auth/login', '/auth/register', '/auth/verify-email', '/auth/send-verification', '/auth/forgot-password', '/auth/reset-password'];

const isAuthRoute = (url = '') => AUTH_ROUTES.some(route => url.includes(route));

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 30000,
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const status = error.response?.status;

    // Let auth routes handle their own errors inline — don't redirect
    if (isAuthRoute(url)) {
      return Promise.reject(error);
    }

    if (error.response) {
      switch (status) {
        case 401:
          // Session expired or was never valid (e.g. stale localStorage
          // from a previous session with no matching cookie). Clear the
          // cached user so the app stops treating it as logged in and
          // re-firing authenticated requests that will just 401 again.
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          window.location.href = '/login';
          break;
        case 403:
          console.error('Forbidden:', error.response.data);
          break;
        case 404:
          window.location.href = '/not-found';
          break;
        case 500:
        default:
          console.error('API Error:', error.response.data);
          // window.location.href = '/error';
      }
    } else if (error.code === 'ECONNABORTED') {
      // Request timed out (e.g. a slow upload) — not a "server is down"
      // situation, so let the calling code show its own inline error
      // instead of nuking the whole page/form.
      console.error('Request timeout:', error.message);
    } else {
      // Network down / server unreachable
      console.error('Network Error:', error.message);
      window.location.href = '/error';
    }

    return Promise.reject(error);
  }
);

export default api;