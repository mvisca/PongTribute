import { useState } from "react";

type Props = {
  onBack: () => void;
};

export default function ForgotPassword({ onBack }: Props) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function handleReset() {
    if (!email) {
      setMessage("Email is required");
      return;
    }

    setMessage("Recovery email sent (fake)");
  }

  return (
    <div className="min-h-screen bg-purple-900 flex items-center justify-center">
      <div className="bg-purple-800 p-6 rounded-xl w-80 shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-4">
          Forgot Password
        </h1>

        {message && (
          <div className="mb-4 p-2 bg-purple-900 text-purple-200 text-sm text-center rounded">
            {message}
          </div>
        )}

        <input
          className="input"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button onClick={handleReset} className="btn-primary">
          Send Recovery Email
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