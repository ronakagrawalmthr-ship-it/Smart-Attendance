// API Client for Admin Portal
export const VERCEL_PORTAL_URLS: Record<number, string> = {
  3000: 'https://web-frontend-five-gray.vercel.app',
  3001: 'https://admin-portal-eta-lilac.vercel.app',
  3002: 'https://student-portal-one-ruby.vercel.app',
  3003: 'https://hod-portal.vercel.app',
};

export const CLOUD_BACKEND_URL = 'https://smart-attendance-api-o49f.onrender.com';

function isStaleOrLocalUrl(url?: string | null): boolean {
  if (!url) return true;
  const u = url.toLowerCase();
  return u.includes('localhost') || u.includes('127.0.0.1') || u.includes('ngrok');
}

let _warmedUp = false;
export function warmUpCloudBackend(): void {
  if (_warmedUp || typeof window === 'undefined') return;
  const base = getApiBaseUrl();
  if (!base.includes('onrender.com')) return;
  _warmedUp = true;
  fetch(`${base}/health`, { method: 'GET', mode: 'cors' }).catch(() => {});
}

export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, '');

  if (typeof window !== 'undefined') {
    const host = window.location.hostname || '';
    const protocol = window.location.protocol || 'http:';
    const isCloudOrigin =
      host.includes('vercel.app') ||
      (host !== 'localhost' &&
        host !== '127.0.0.1' &&
        !host.startsWith('192.168.') &&
        !host.startsWith('10.') &&
        !host.startsWith('172.'));

    if (isCloudOrigin) {
      const customHost =
        localStorage.getItem('api_base_url') ||
        localStorage.getItem('custom_backend_url') ||
        localStorage.getItem('api_host');
      if (customHost && !isStaleOrLocalUrl(customHost)) {
        return customHost.trim().replace(/\/+$/, '');
      }
      if (envUrl && !isStaleOrLocalUrl(envUrl)) {
        return envUrl;
      }
      return CLOUD_BACKEND_URL;
    }

    const customHost =
      localStorage.getItem('api_base_url') ||
      localStorage.getItem('custom_backend_url') ||
      localStorage.getItem('api_host');
    if (customHost && customHost.trim()) {
      return customHost.trim().replace(/\/+$/, '');
    }
    const settingsStr = localStorage.getItem('global_system_settings');
    if (settingsStr) {
      try {
        const parsed = JSON.parse(settingsStr);
        if (parsed.api_host && parsed.api_host.trim()) {
          return parsed.api_host.trim().replace(/\/+$/, '');
        }
      } catch {}
    }

    if (envUrl) return envUrl;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return `${protocol}//${host}:8000`;
    }
    return 'http://localhost:8000';
  }

  if (envUrl && !isStaleOrLocalUrl(envUrl)) return envUrl;
  if (process.env.VERCEL === '1' || process.env.NEXT_PUBLIC_VERCEL_ENV) {
    return CLOUD_BACKEND_URL;
  }
  return envUrl || CLOUD_BACKEND_URL;
}

if (typeof window !== 'undefined') {
  setTimeout(() => warmUpCloudBackend(), 50);
}

export const API_BASE_URL = getApiBaseUrl();

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

export function getValidAdminToken(): string {
  if (typeof window === 'undefined') return '';
  const token = localStorage.getItem('admin_token');
  if (token && token !== 'undefined' && token !== 'null') {
    return token;
  }
  return '';
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getValidAdminToken();
  const headers = new Headers(options.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('ngrok-skip-browser-warning')) {
    headers.set('ngrok-skip-browser-warning', 'true');
  }

  let finalUrl = url;
  if (!finalUrl.startsWith('http')) {
    finalUrl = `${getApiBaseUrl()}${finalUrl}`;
  } else if (typeof window !== 'undefined' && window.location?.hostname) {
    const h = window.location.hostname;
    if (h.includes('vercel.app')) {
      finalUrl = finalUrl.replace(/^https?:\/\/(localhost|127\.0\.0\.1):8000/i, getApiBaseUrl()).replace(/^https?:\/\/[a-z0-9.-]+\.ngrok-free\.(dev|app)/i, getApiBaseUrl());
    } else if (h !== 'localhost' && h !== '127.0.0.1') {
      finalUrl = finalUrl.replace(/https?:\/\/(localhost|127\.0\.0\.1):8000/g, `${window.location.protocol || 'http:'}//${h}:8000`);
    }
  }

  const response = await fetch(finalUrl, { ...options, headers });

  if (response.status === 401 && typeof window !== 'undefined') {
    // Expired or invalid token: purge and redirect to login
    localStorage.removeItem('admin_token');
    if (window.location.pathname !== '/' && window.location.pathname !== '/setup' && window.location.pathname !== '/forgot-password') {
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
      // Ignore JSON parse error
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
  const isCloud = getApiBaseUrl().includes('onrender.com');
  const retries = retryOptions.maxRetries ?? retryOptions.retries ?? (isCloud ? 4 : 3);
  const backoffMs = retryOptions.delayMs ?? retryOptions.backoffMs ?? (isCloud ? 1500 : 400);
  const retryOnStatus = retryOptions.retryOnStatus ?? [502, 503, 504];
  const onRetry = retryOptions.onRetry;

  let lastError: any = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const reqOptions = !options.signal && typeof AbortSignal !== 'undefined' && typeof (AbortSignal as any).timeout === 'function'
        ? { ...options, signal: (AbortSignal as any).timeout(isCloud ? 25000 : 12000) }
        : options;
      const res = await authFetch(url, reqOptions);
      if (retryOnStatus.includes(res.status) && attempt < retries) {
        const delay = Math.min(8000, backoffMs * Math.pow(1.6, attempt));
        if (onRetry) onRetry(attempt + 1, new Error(`Server returned HTTP ${res.status}`));
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      return res;
    } catch (err: any) {
      lastError = err;
      if (attempt < retries) {
        const delay = Math.min(8000, backoffMs * Math.pow(1.6, attempt));
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

export function formatApiError(err: any): string {
  if (!err) return 'An unexpected error occurred. Please try again.';
  const msg = String(err.message || err.detail || err);
  if (isNetworkError(err) || msg.includes('Failed to fetch') || msg.includes('Network request failed') || msg.includes('Load failed')) {
    return 'Campus Server Unreachable: Please ensure the attendance backend service is running or check network connection.';
  }
  return msg;
}


// Indian Standard Time (IST / Asia/Kolkata) Date & Time Utilities
export function getTodayISTString(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  } catch {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 330);
    return d.toISOString().slice(0, 10);
  }
}

export function formatISTDate(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}

export function formatISTTime(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(d);
  } catch {
    return d.toLocaleTimeString();
  }
}

export function formatISTDateTime(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(d);
  } catch {
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  }
}
