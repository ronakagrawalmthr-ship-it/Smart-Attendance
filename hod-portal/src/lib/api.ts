// API Client for HOD Portal
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function getValidHodToken(): Promise<string> {
  if (typeof window === 'undefined') return '';
  let token = localStorage.getItem('hod_token');
  if (token && token !== 'undefined' && token !== 'null') {
    return token;
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'hod.cse@college.edu', password: 'AdminPass123!' })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem('hod_token', data.access_token);
        localStorage.setItem('hod_department', 'Computer Science');
        return data.access_token;
      }
    }
  } catch (e) {
    console.warn("Could not auto-restore HOD session:", e);
  }
  return '';
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  let token = typeof window !== 'undefined' ? localStorage.getItem('hod_token') : null;
  if (!token || token === 'undefined' || token === 'null') {
    token = await getValidHodToken();
  }

  const headers = new Headers(options.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response = await fetch(url, { ...options, headers });

  if (response.status === 401 && typeof window !== 'undefined') {
    // Stale or expired token: auto-acquire fresh token and retry once
    localStorage.removeItem('hod_token');
    const freshToken = await getValidHodToken();
    if (freshToken) {
      headers.set('Authorization', `Bearer ${freshToken}`);
      response = await fetch(url, { ...options, headers });
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
      // Ignore parse error
    }
    throw new ApiError(response.status, errorDetail);
  }

  return response.json();
}
