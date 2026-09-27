export const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5001";

export function getUserId() {
  const user = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  return user?.id ? Number(user.id) : null;
}

export async function apiRequest(path, options = {}) {
  const headers = {
    Accept: "application/json",
    ...(options.body
      ? { "Content-Type": "application/json" }
      : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.success === false) {
    const message =
      payload?.message ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return payload || { success: true };
}

export function apiErrorMessage(error, fallback) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
