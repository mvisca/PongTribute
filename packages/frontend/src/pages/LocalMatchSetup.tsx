import { useState } from "react";

type Props = {
  onStart: (mode: string, scoreLimit: number) => void;
  onBack: () => void;
};

export default function LocalMatchSetup({ onStart, onBack }: Props) {
  const [mode, setMode] = useState("Classic");
  const [scoreLimit, setScoreLimit] = useState(5);

  return (
    <div className="retro-bg min-h-screen flex flex-col items-center justify-center text-purple-100">
      <h1 className="text-3xl neon-text mb-6">
        LOCAL MATCH SETUP
      </h1>

      <div className="mb-6">
        <p className="mb-2">Game Mode</p>
        <div className="flex gap-3">
          {["Classic", "Speed", "Pro"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`arcade-btn px-4 py-1 ${mode === m ? "opacity-100" : "opacity-60"}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 w-64">
        <p>Score Limit: {scoreLimit}</p>
        <input
          type="range"
          min="1"
          max="21"
          value={scoreLimit}
          onChange={(e) => setScoreLimit(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => onStart(mode, scoreLimit)}
          className="arcade-btn px-6 py-2"
        >
          Start
        </button>

        <button
          onClick={onBack}
          className="arcade-btn px-6 py-2"
        >
          Back
        </button>
      </div>
    </div>
  );
}