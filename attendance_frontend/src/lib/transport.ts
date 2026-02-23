import { createConnectTransport } from '@connectrpc/connect-web'

export const TOKEN_KEY = 'facego_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export const transport = createConnectTransport({
  baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:8080',
  interceptors: [
    (next) => async (req) => {
      const token = getToken()
      if (token) {
        req.header.set('Authorization', `Bearer ${token}`)
      }
      return next(req)
    },
  ],
})
