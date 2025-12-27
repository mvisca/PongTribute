import { User } from "../types/User";

type Props = {
  user: User;
  onLogout: () => void;
};

export default function Home({ user, onLogout }: Props) {
  return (
    <div className="min-h-screen bg-purple-900 flex flex-col items-center justify-center text-purple-100 relative">
      {/* Logout */}
      <button
        onClick={onLogout}
        className="absolute top-4 left-4 bg-purple-600 px-4 py-2 rounded hover:bg-purple-500"
      >
        Logout
      </button>

      {/* User info */}
      <div className="absolute top-4 right-4 bg-purple-800 px-4 py-2 rounded">
        👤 {user.username}
      </div>

      {/* Game area */}
      <div className="bg-purple-700 w-[400px] h-[250px] rounded-xl flex items-center justify-center shadow-lg">
        Ping-Pong Game Area
      </div>
    </div>
  );
}
