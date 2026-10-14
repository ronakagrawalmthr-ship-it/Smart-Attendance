// API Client for Student Portal
export const API_BASE_URL = 
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location?.hostname
    ? `${window.location.protocol || 'http:'}//${window.location.hostname}:8000`
    : 'http://localhost:8000');

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

export function getValidStudentToken(): string {
  if (typeof window === 'undefined') return '';
  const token = localStorage.getItem('student_token');
  if (token && token !== 'undefined' && token !== 'null') {
    return token;
  }
  return '';
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getValidStudentToken();
  const headers = new Headers(options.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('student_token');
    localStorage.removeItem('student_name');
    localStorage.removeItem('student_roll');
    localStorage.removeItem('student_email');
    localStorage.removeItem('student_branch');
    if (window.location.pathname !== '/' && window.location.pathname !== '/enroll' && window.location.pathname !== '/forgot-password') {
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
