export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'; // Defaulting to 4000 as typical for NestJS when Next is 3000, but using the user provided example structure

const SIMULATED_ADMIN_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwic3ViIjoiYWRtaW4taWQiLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3Nzc0OTM3NDksImV4cCI6MTgwOTA1MTM0OX0.5f2TO-CWDemRlhih00Z57T_Q35mD95DLcd0ovFHdcQo";

interface FetchOptions extends RequestInit {
  data?: any;
}

export async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { data, headers, ...restOptions } = options;
  
  // Clean endpoint
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Decide if hitting Next.js route (/api/...) or direct backend port. 
  // We'll use 4000 directly for NestJS to avoid Next.js proxy overhead if no proxy is setup
  const url = `${API_BASE_URL}${cleanEndpoint}`;

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SIMULATED_ADMIN_TOKEN}`,
    ...headers,
  };

  const response = await fetch(url, {
    ...restOptions,
    headers: defaultHeaders,
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`API Error ${response.status}: ${errorBody}`);
  }

  // Not all responses will have JSON (e.g., 204 No Content for deletes)
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  
  return null as any;
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) => apiFetch<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, data: any, options?: RequestInit) => apiFetch<T>(endpoint, { ...options, method: 'POST', data }),
  put: <T>(endpoint: string, data: any, options?: RequestInit) => apiFetch<T>(endpoint, { ...options, method: 'PUT', data }),
  patch: <T>(endpoint: string, data: any, options?: RequestInit) => apiFetch<T>(endpoint, { ...options, method: 'PATCH', data }),
  delete: <T>(endpoint: string, options?: RequestInit) => apiFetch<T>(endpoint, { ...options, method: 'DELETE' }),
};
