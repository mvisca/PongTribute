import { useState } from "react";

type Props = {
  onBack: () => void;
};

export default function Register({ onBack }: Props) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleRegister() {
    if (!username || !email || !password) {
      setError("All fields are required");
      return;
    }

    setError("");
    alert("Account created (fake)");
    onBack();
  }

  return (
    <div className="min-h-screen bg-purple-900 flex items-center justify-center">
      <div className="bg-purple-800 p-6 rounded-xl w-80 shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-4">
          Create Account
        </h1>

        {error && (
          <div className="mb-4 p-2 bg-purple-900 text-purple-200 text-sm text-center rounded">
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
          className="input"
          placeholder="Email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
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

        <button onClick={handleRegister} className="btn-primary">
          Register
        </button>

        <button
          onClick={onBack}
          className="mt-4 text-sm text-purple-300 hover:underline"
        >
          ← Back to Login
        </button>
      </div>
    </div>
  );
}