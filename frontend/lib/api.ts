import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API || "http://127.0.0.1:8000",
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// 1. Request Interceptor: Attach access token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("synapse_access_token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Response Interceptor: Rotate token on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url || "";
    const isAuthUrl =
      requestUrl.includes("/auth/token") ||
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/refresh") ||
      requestUrl.includes("/auth/register") ||
      requestUrl.includes("/auth/google");

    // Check if unauthorized, not an auth endpoint, and request is not a retry
    if (error.response?.status === 401 && !isAuthUrl && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken =
        typeof window !== "undefined"
          ? localStorage.getItem("synapse_refresh_token")
          : null;

      if (!refreshToken) {
        isRefreshing = false;
        if (typeof window !== "undefined") {
          localStorage.removeItem("synapse_access_token");
          localStorage.removeItem("synapse_refresh_token");
          const path = window.location.pathname;
          if (
            !path.startsWith("/login") &&
            !path.startsWith("/register") &&
            !path.startsWith("/forgot-password") &&
            !path.startsWith("/reset-password")
          ) {
            window.location.href = "/login";
          }
        }
        return Promise.reject(error);
      }

      try {
        const refreshResponse = await axios.post(
          `${process.env.NEXT_PUBLIC_API || "http://127.0.0.1:8000"}/auth/refresh`,
          { refresh_token: refreshToken }
        );
        
        const { access_token, refresh_token: new_refresh_token } =
          refreshResponse.data.data;

        if (typeof window !== "undefined") {
          localStorage.setItem("synapse_access_token", access_token);
          localStorage.setItem("synapse_refresh_token", new_refresh_token);
        }

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
        }
        
        processQueue(null, access_token);
        isRefreshing = false;

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        // Clear invalid/expired tokens and redirect to login
        if (typeof window !== "undefined") {
          localStorage.removeItem("synapse_access_token");
          localStorage.removeItem("synapse_refresh_token");
          const path = window.location.pathname;
          if (
            !path.startsWith("/login") &&
            !path.startsWith("/register") &&
            !path.startsWith("/forgot-password") &&
            !path.startsWith("/reset-password")
          ) {
            window.location.href = "/login";
          }
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);