import axios, { type AxiosRequestConfig } from 'axios';

/**
 * Shared axios instance. The base URL points at the backend API and is configurable
 * per environment via VITE_API_URL (falls back to the local dev server).
 */
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5172',
});

/**
 * Custom mutator used by the Orval-generated client. Orval calls this for every request;
 * we forward the config to the shared axios instance and unwrap the response data so the
 * generated hooks resolve to the payload directly.
 */
export const apiClient = <T>(config: AxiosRequestConfig): Promise<T> =>
  instance({ ...config }).then(({ data }) => data);

export default apiClient;
