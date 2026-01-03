import { useState } from "react";
import { User } from "../types/User";
import { ProfileDropdown } from "../components/ProfileDropdown";

type Props = {
  user: User;
  onLogout: () => void;
};

export default function Home({ user, onLogout }: Props) {
  const [showProfile, setShowProfile] = useState(false);

  return (
    <div className="min-h-screen bg-purple-900 flex flex-col items-center justify-center text-purple-100 relative">
      
      {/* Logout */}
      <button
        onClick={onLogout}
        className="absolute top-4 left-4 bg-purple-600 px-4 py-2 rounded hover:bg-purple-500"
      >
        Logout
      </button>

      {/* User info (CLICKABLE) */}
      <button
        onClick={() => setShowProfile(!showProfile)}
        className="absolute top-4 right-4 bg-purple-800 px-4 py-2 rounded hover:bg-purple-700"
      >
        {user.username}
      </button>

      {/* Profile dropdown */}
      {showProfile && (
        <ProfileDropdown
          user={user}
          onClose={() => setShowProfile(false)}
        />
      )}

      {/* Game area */}
      <div className="bg-purple-700 w-[400px] h-[250px] rounded-xl flex items-center justify-center shadow-lg">
        Ping-Pong Game Area
      </div>
    </div>
  );
}
