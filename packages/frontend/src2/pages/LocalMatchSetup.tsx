import { useState } from "react";

type Props = {
  onStart: (mode: string, scoreLimit: number) => void;
  onBack: () => void;
};

export default function LocalMatchSetup({ onStart, onBack }: Props) {
  const [mode, setMode] = useState("Classic");
  const [scoreLimit, setScoreLimit] = useState(5);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-8">

      <h2 className="text-2xl tracking-widest">LOCAL MATCH</h2>

      {/* Mode selection */}
<div className="flex gap-6">
  {["Classic", "Speed", "Pro"].map((m) => {
    const isSelected = mode === m;

    return (
      <button
        key={m}
        onClick={() => setMode(m)}
        className={`
          arcade-btn px-6 py-2 transition-all duration-200
          ${
            isSelected
              ? "bg-blue-700 border-2 border-purple-400 shadow-[0_0_20px_#00ffff] scale-105 text-white"
              : "opacity-80 hover:opacity-100"
          }
        `}
      >
        {m}
      </button>
    );
  })}
</div>

      {/* Score limit slider */}
      <div className="flex flex-col items-center gap-2 w-64">
        <span>Score Limit: {scoreLimit}</span>
        <input
          type="range"
          min={1}
          max={21}
          value={scoreLimit}
          onChange={(e) => setScoreLimit(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="flex gap-6 mt-4">
        <button
          className="neon-btn text-xs"
          onClick={onBack}
        >
          BACK
        </button>

        <button
          className="arcade-btn px-6 py-2"
          onClick={() => onStart(mode, scoreLimit)}
        >
          START
        </button>
      </div>
    </div>
  );
}