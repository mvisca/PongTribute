import { useEffect, useState } from "react";

type Props = {
  mode: string;
  onCancel: () => void;
  onBot: () => void;
};

export default function Matchmaking({ mode, onCancel, onBot }: Props) {
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    if (timeLeft === 0) return;

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft]);

  return (
    <div className="retro-bg min-h-screen flex flex-col items-center justify-center text-purple-100">
      <h1 className="text-3xl neon-text mb-4">
        SEARCHING OPPONENT...
      </h1>

      <p className="mb-6">Mode: {mode}</p>

      <div className="text-5xl font-bold mb-8">
        {timeLeft}
      </div>

      <div className="flex gap-4">
        <button onClick={onCancel} className="arcade-btn px-6 py-2">
          Cancel
        </button>

        <button onClick={onBot} className="arcade-btn px-6 py-2">
          Play vs Bot
        </button>
      </div>
    </div>
  );
}