interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  const result = (await response.json()) as ApiResponse<T>;
  if (!response.ok || result.error) {
    throw new Error(result.error || `请求失败 (${response.status})`);
  }
  return result.data as T;
}

export const api = {
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
};
