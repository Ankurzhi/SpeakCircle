import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  timeout: 15000,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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
export const getRooms        = (params) => API.get('/rooms', { params });
export const createRoom      = (data)   => API.post('/rooms', data);
export const joinRoom        = (id)     => API.post(`/rooms/${id}/join`);
export const getRoom         = (id)     => API.get(`/rooms/${id}`);
export const completeSession = (data)   => API.post('/rooms/complete-session', data);
export const getLiveKitToken = (id)     => API.get(`/rooms/${id}/livekit-token`);

// ── General ───────────────────────────────────────────────────────────────────
export const getDailyTopic = ()     => API.get('/daily-topic');
export const getFAQs       = ()     => API.get('/faqs');
export const submitContact = (data) => API.post('/contact', data);
export const getStats      = ()     => API.get('/stats');

export default API;