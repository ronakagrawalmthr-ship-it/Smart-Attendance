// API Client for HOD Portal
export const VERCEL_PORTAL_URLS: Record<number, string> = {
  3000: 'https://web-frontend-five-gray.vercel.app',
  3001: 'https://admin-portal-eta-lilac.vercel.app',
  3002: 'https://student-portal-one-ruby.vercel.app',
  3003: 'https://hod-portal.vercel.app',
};

export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname;
    const protocol = window.location.protocol || 'http:';
    if (host !== 'localhost' && host !== '127.0.0.1' && !host.includes('vercel.app')) {
      return `${protocol}//${host}:8000`;
    }
  }
  return 'http://localhost:8000';
}

export const API_BASE_URL = 
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location?.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && !window.location.hostname.includes('vercel.app')
    ? `${window.location.protocol || 'http:'}//${window.location.hostname}:8000`
    : 'http://localhost:8000');

export function getPortalUrl(port: number, path: string = ''): string {
  // If explicitly configured in environment
  if (port === 3000 && process.env.NEXT_PUBLIC_WEB_URL) return `${process.env.NEXT_PUBLIC_WEB_URL}${path}`;
  if (port === 3001 && process.env.NEXT_PUBLIC_ADMIN_URL) return `${process.env.NEXT_PUBLIC_ADMIN_URL}${path}`;
  if (port === 3002 && process.env.NEXT_PUBLIC_STUDENT_URL) return `${process.env.NEXT_PUBLIC_STUDENT_URL}${path}`;
  if (port === 3003 && process.env.NEXT_PUBLIC_HOD_URL) return `${process.env.NEXT_PUBLIC_HOD_URL}${path}`;

  if (typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname;
    // On Vercel or cloud deployments, route to live Vercel portal domains
    if (host.includes('vercel.app') || (host !== 'localhost' && host !== '127.0.0.1' && !host.startsWith('192.168.') && !host.startsWith('10.') && !host.startsWith('172.'))) {
      if (VERCEL_PORTAL_URLS[port]) {
        return `${VERCEL_PORTAL_URLS[port]}${path}`;
      }
      if (port === 8000) {
        return `${getApiBaseUrl()}${path}`;
      }
    }

    if (process.env.NEXT_PUBLIC_USE_LOCAL_PORTALS === 'true') {
      const protocol = window.location.protocol || 'http:';
      return `${protocol}//${host}:${port}${path}`;
    }

    if (VERCEL_PORTAL_URLS[port]) {
      return `${VERCEL_PORTAL_URLS[port]}${path}`;
    }
    if (port === 8000) {
      return `${getApiBaseUrl()}${path}`;
    }

    const protocol = window.location.protocol || 'http:';
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return `${protocol}//${host}:${port}${path}`;
    }
  }

  if (VERCEL_PORTAL_URLS[port]) {
    return `${VERCEL_PORTAL_URLS[port]}${path}`;
  }
  return `http://localhost:${port}${path}`;
}

export const getAdminPortalUrl = (path: string = '') => getPortalUrl(3001, path);
export const getStudentPortalUrl = (path: string = '') => getPortalUrl(3002, path);
export const getHodPortalUrl = (path: string = '') => getPortalUrl(3003, path);
export const getWebMasterUrl = (path: string = '') => getPortalUrl(3000, path);

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export function getValidHodToken(): string {
  if (typeof window === 'undefined') return '';
  const token = localStorage.getItem('hod_token');
  if (token && token !== 'undefined' && token !== 'null') {
    return token;
  }
  return '';
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getValidHodToken();
  const headers = new Headers(options.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let finalUrl = url;
  if (!finalUrl.startsWith('http')) {
    finalUrl = `${getApiBaseUrl()}${finalUrl}`;
  } else if (typeof window !== 'undefined' && window.location?.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && !window.location.hostname.includes('vercel.app')) {
    finalUrl = finalUrl.replace(/https?:\/\/(localhost|127\.0\.0\.1):8000/g, `${window.location.protocol || 'http:'}//${window.location.hostname}:8000`);
  }

  const response = await fetch(finalUrl, { ...options, headers });

  if (response.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('hod_token');
    if (window.location.pathname !== '/' && window.location.pathname !== '/forgot-password') {
      window.location.href = '/';
    }
  }

  return response;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${getApiBaseUrl()}${endpoint}`;
  const response = await authFetch(url, {
    ...options,
    headers: {
      ...(!(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers as Record<string, string>),
    }
  });

  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorJson.error || errorDetail;
    } catch {
      // Ignore parse error
    }
    throw new ApiError(response.status, errorDetail);
  }

  return response.json();
}

export interface RetryOptions {
  retries?: number;
  maxRetries?: number;
  backoffMs?: number;
  delayMs?: number;
  retryOnStatus?: number[];
  onRetry?: (attempt: number, error: any) => void;
}

export async function authFetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const retries = retryOptions.maxRetries ?? retryOptions.retries ?? 3;
  const backoffMs = retryOptions.delayMs ?? retryOptions.backoffMs ?? 400;
  const retryOnStatus = retryOptions.retryOnStatus ?? [502, 503, 504];
  const onRetry = retryOptions.onRetry;

  let lastError: any = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await authFetch(url, options);
      if (retryOnStatus.includes(res.status) && attempt < retries) {
        const delay = backoffMs * Math.pow(1.8, attempt);
        if (onRetry) onRetry(attempt + 1, new Error(`Server returned HTTP ${res.status}`));
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      return res;
    } catch (err: any) {
      lastError = err;
      if (attempt < retries) {
        const delay = backoffMs * Math.pow(1.8, attempt);
        if (onRetry) onRetry(attempt + 1, err);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError || new Error(`Network request failed after ${retries} retries`);
}

export function isNetworkError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || error).toLowerCase();
  return msg.includes('fetch') || msg.includes('network') || msg.includes('failed') || msg.includes('connection');
}
