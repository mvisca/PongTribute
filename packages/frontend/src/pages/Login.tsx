import { useState } from "react";

type Props = {
  onLoginSuccess: (username: string) => void;
  onRegister: () => void;
  onForgot: () => void;
};

export default function Login({
  onLoginSuccess,
  onRegister,
  onForgot,
}: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleLogin() {
    if (!username || !password) {
      setError("Username and password are required");
      return;
    }

    // Login falso (por ahora)
    setError("");
    onLoginSuccess(username);
  }

  return (
    <div className="min-h-screen bg-purple-900 flex items-center justify-center">
      <div className="bg-purple-800 p-6 rounded-xl w-80 shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-4 text-purple-100">
          Welcome to Ping-Pong
        </h1>

        {error && (
          <div className="mb-4 p-2 rounded bg-purple-900 text-purple-200 text-sm text-center">
            {error}
          </div>
        )}

        <input
          className="input"
          placeholder="Username"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setError("");
          }}
        />

        <input
          type="password"
          className="input"
          placeholder="Password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
        />

        <button onClick={handleLogin} className="btn-primary">
          Login
        </button>

        <div className="mt-4 flex justify-between text-sm text-purple-300">
          <button onClick={onRegister} className="hover:underline">
            Create account
          </button>
          <button onClick={onForgot} className="hover:underline">
            Forgot password?
          </button>
        </div>
      </div>
    </div>
  );
}
