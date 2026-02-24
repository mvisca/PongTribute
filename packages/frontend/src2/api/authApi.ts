const AUTH_BASE_URL = "http://localhost:3002/api/auth"; // TODO No debe saltarse el Gateway, esto no funcionara en produccion. Implementar con variable de entorno.

export async function login(email: string, password: string) {
  const response = await fetch(`${AUTH_BASE_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Login failed");
  }

  return response.json();
}

export async function logout(token: string): Promise<void> {
  const res = await fetch(`${AUTH_BASE_URL}/logout`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Logout failed");
  }
}

export async function register(
  username: string,
  email: string,
  password: string
) {
  const response = await fetch(`${AUTH_BASE_URL}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Register failed");
  }

  return response.json();
}
