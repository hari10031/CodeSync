// frontend/src/lib/apiClient.ts
import axios, { InternalAxiosRequestConfig, AxiosHeaders } from "axios";

const apiClient = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true,
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = sessionStorage.getItem("token");

  if (token) {
    let headers = config.headers as AxiosHeaders | undefined;

    if (!headers || !(headers instanceof AxiosHeaders)) {
      headers = new AxiosHeaders(headers);
      config.headers = headers;
    }

    headers.set("Authorization", `Bearer ${token}`);
  }

  return config;
});

export default apiClient;
