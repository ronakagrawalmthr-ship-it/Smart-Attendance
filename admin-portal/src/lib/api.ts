// API Client for Admin Portal
export const API_BASE_URL = 
  typeof window !== 'undefined' && window.location?.hostname
    ? `${window.location.protocol || 'http:'}//${window.location.hostname}:8000`
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

export function getPortalUrl(port: number, path: string = ''): string {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const protocol = window.location.protocol || 'http:';
    const host = window.location.hostname;
    return `${protocol}//${host}:${port}${path}`;
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

  const response = await fetch(url, { ...options, headers });

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
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
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
