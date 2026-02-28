type Props = {
  onSelectMode: (mode: string) => void;
  onBack: () => void;
};

export default function OnlineModes({ onSelectMode, onBack }: Props) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-8">

      <h2 className="text-2xl tracking-widest">SELECT MODE</h2>

      <div className="flex gap-8">
        <button
          className="arcade-btn px-6 py-2"
          onClick={() => onSelectMode("Classic")}
        >
          Classic
        </button>

        <button
          className="arcade-btn px-6 py-2"
          onClick={() => onSelectMode("Speed")}
        >
          Speed
        </button>

        <button
          className="arcade-btn px-6 py-2"
          onClick={() => onSelectMode("Pro")}
        >
          Pro
        </button>
      </div>

      <button
        className="neon-btn text-xs mt-6"
        onClick={onBack}
      >
        BACK
      </button>
    </div>
  );
}