const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export function getToken(): string | null {
  return localStorage.getItem('tracker_token');
}

export function setToken(token: string): void {
  localStorage.setItem('tracker_token', token);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('tracker_refresh_token');
}

export function setRefreshToken(token: string): void {
  localStorage.setItem('tracker_refresh_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('tracker_token');
  localStorage.removeItem('tracker_refresh_token');
}

export function getApiUrl(): string {
  return apiUrl;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let token = getToken();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401 && path !== '/auth/refresh') {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      const refreshResponse = await fetch(`${apiUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (refreshResponse.ok) {
        const refreshed = (await refreshResponse.json()) as { accessToken: string; refreshToken: string };
        setToken(refreshed.accessToken);
        setRefreshToken(refreshed.refreshToken);
        token = refreshed.accessToken;
        const retryHeaders = new Headers(init.headers);
        retryHeaders.set('Content-Type', 'application/json');
        retryHeaders.set('Authorization', `Bearer ${token}`);
        response = await fetch(`${apiUrl}${path}`, {
          ...init,
          headers: retryHeaders,
        });
      }
    }
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
