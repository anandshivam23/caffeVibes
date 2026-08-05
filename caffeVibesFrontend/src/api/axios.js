import axios from 'axios';

const authEventListeners = [];
export const onAuthFailure = (fn) => authEventListeners.push(fn);
export const emitAuthFailure = () => authEventListeners.forEach((fn) => fn());

// Token helpers — localStorage fallback for browsers that block cross-site cookies
export const saveTokens = ({ accessToken, refreshToken }) => {
  if (accessToken) localStorage.setItem('accessToken', accessToken);
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
};
export const clearTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};
export const getAccessToken = () => localStorage.getItem('accessToken');
export const getRefreshToken = () => localStorage.getItem('refreshToken');

const api = axios.create({
  baseURL: 'https://vibes-backend-af8b.onrender.com/api/v1',
  withCredentials: true, // still send cookies when available
});

// Inject Authorization header from localStorage on every request
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    if (originalRequest.url?.includes('/users/refresh-token')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (token && originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Send refreshToken in body as fallback for cookie-blocked browsers
        const storedRefreshToken = getRefreshToken();
        const refreshRes = await api.post('/users/refresh-token', 
          storedRefreshToken ? { refreshToken: storedRefreshToken } : {}
        );
        // Save new tokens if returned in response body
        const newTokens = refreshRes.data?.data;
        const newAccessToken = newTokens?.accessToken;

        if (newAccessToken) {
          saveTokens({
            accessToken: newAccessToken,
            refreshToken: newTokens.refreshToken,
          });
          if (originalRequest.headers) {
            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          }
        }

        processQueue(null, newAccessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
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