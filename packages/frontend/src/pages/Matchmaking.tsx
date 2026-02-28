import { useEffect, useState } from "react";

type Props = {
  mode: string;
  onCancel: () => void;
  onBot: () => void;
};

export default function Matchmaking({ mode, onCancel, onBot }: Props) {
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-8">

      <h2 className="text-2xl tracking-widest">
        SEARCHING OPPONENT
      </h2>

      <p className="text-sm opacity-70">
        Mode: {mode}
      </p>

      {/* Countdown */}
      <div className="text-6xl font-bold tracking-widest">
        {timeLeft}
      </div>

      <div className="flex gap-8 mt-4">
        <button
          className="neon-btn text-xs"
          onClick={onCancel}
        >
          CANCEL
        </button>

        <button
          className="arcade-btn px-6 py-2"
          onClick={onBot}
        >
          PLAY VS BOT
        </button>
      </div>
    </div>
  );
}