import { API_BASE_URL } from './config.js';

const normalizeBaseUrl = (value) => String(value || '').trim().replace(/\/+$/, '');

export const getUploadApiBaseUrl = () => normalizeBaseUrl(API_BASE_URL) || '/api/v1';

export const joinApiUrl = (baseUrl, requestPath) => {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  const normalizedPath = String(requestPath || '').startsWith('/')
    ? String(requestPath || '')
    : `/${String(requestPath || '')}`;

  return normalizedBase ? `${normalizedBase}${normalizedPath}` : normalizedPath;
};

export const getUploadAuthToken = () => {
  if (typeof window === 'undefined') return null;

  const candidateKeys = [
    'admin_accessToken',
    'restaurant_accessToken',
    'delivery_accessToken',
    'user_accessToken',
    'accessToken',
  ];

  for (const key of candidateKeys) {
    const token = localStorage.getItem(key);
    if (token) return token;
  }

  return null;
};

export const getUploadAuthHeaders = () => {
  const token = getUploadAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
