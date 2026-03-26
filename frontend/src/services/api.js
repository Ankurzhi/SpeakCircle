import axios from 'axios';

// In development, Vite proxy routes /api → localhost:5000
// In production (Vercel), VITE_API_URL must point to your Render backend
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
});

//28-03
export const getRoom = (id) => API.get(`/rooms/${id}`);
//26-03

// Attach JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global 401 handler → redirect to login
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const registerUser  = (data) => API.post('/auth/register', data);
export const loginUser     = (data) => API.post('/auth/login', data);
export const getProfile    = ()     => API.get('/auth/profile');
export const updateProfile = (data) => API.put('/auth/profile', data);

// ── Rooms ─────────────────────────────────────────────────────────────────────
export const getRooms         = (params) => API.get('/rooms', { params });
export const createRoom       = (data)   => API.post('/rooms', data);
export const joinRoom         = (id)     => API.post(`/rooms/${id}/join`);
export const completeSession  = (data)   => API.post('/rooms/complete-session', data);

// ── General ───────────────────────────────────────────────────────────────────
export const getDailyTopic  = ()     => API.get('/daily-topic');
export const getFAQs        = ()     => API.get('/faqs');
export const submitContact  = (data) => API.post('/contact', data);
export const getStats       = ()     => API.get('/stats');

export default API;