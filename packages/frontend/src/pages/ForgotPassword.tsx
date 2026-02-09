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
    <div className="retro-bg flex items-center justify-center">
      <div className="bg-purple-800 p-8 rounded-xl w-[420px] shadow-lg">

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

        {/* BOTÓN */}
        <div className="flex justify-center mt-6">
          <button
            onClick={handleReset}
            className="arcade-btn px-8 py-2 text-sm"
          >
            SEND RECOVERY EMAIL
          </button>
        </div>

        {/* BACK TO LOGIN */}
        <div className="mt-6 text-right text-sm text-purple-300">
          <button onClick={onBack} className="hover:underline">
            ← Back to login
          </button>
        </div>

      </div>
    </div>
  );
}  
