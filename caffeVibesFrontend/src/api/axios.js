import axios from 'axios';
const authEventListeners = [];
export const onAuthFailure = (fn) => authEventListeners.push(fn);
export const emitAuthFailure = () => authEventListeners.forEach((fn) => fn());
const api = axios.create({
  baseURL: import.meta.env.DEV
    ? 'http://localhost:8000/api/v1'
    : 'https://vibes-backend-af8b.onrender.com/api/v1',
  withCredentials: true,
});
let isRefreshing = false;
let failedQueue = [];
const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (originalRequest?.url?.includes('/users/refresh-token')) {
      return Promise.reject(error);
    }
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        await api.post('/users/refresh-token');
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        emitAuthFailure();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);
export default api;