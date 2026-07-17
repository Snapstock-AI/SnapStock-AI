const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

type ApiResponse<T> = {
  success: boolean
  data?: T
  message?: string
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  const body = (await response.json().catch(() => ({}))) as ApiResponse<T>

  if (!response.ok || body.success === false) {
    throw new Error(body.message || 'Request failed')
  }

  return body
}
