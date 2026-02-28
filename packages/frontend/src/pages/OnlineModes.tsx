type Props = {
  onSelectMode: (mode: string) => void;
  onBack: () => void;
};

export default function OnlineModes({ onSelectMode, onBack }: Props) {
  return (
    <div className="retro-bg min-h-screen flex flex-col items-center justify-center text-purple-100">
      <h1 className="text-3xl mb-8 neon-text">SELECT GAME MODE</h1>

      <div className="flex flex-col gap-4">
        {["Classic", "Speed", "Pro"].map((mode) => (
          <button
            key={mode}
            onClick={() => onSelectMode(mode)}
            className="arcade-btn px-10 py-2"
          >
            {mode}
          </button>
        ))}
      </div>

      <button
        onClick={onBack}
        className="mt-8 text-sm underline"
      >
        Back
      </button>
    </div>
  );
}