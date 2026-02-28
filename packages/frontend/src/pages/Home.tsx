import { useState } from "react";
import { User } from "../types/User";
import { ProfileDropdown } from "../components/ProfileDropdown";

type Props = {
  user: User;
  token: string;
  onLogoutSuccess: () => void;
  onNavigate: (page: string) => void;
};

export default function Home({ user, onLogoutSuccess, onNavigate }: Props) {
  const [showProfile, setShowProfile] = useState(false);

  return (
    <div className="retro-bg min-h-screen flex flex-col items-center justify-center text-purple-100 relative">

      {/* LOGOUT */}
     <button
       onClick={onLogoutSuccess}
       className="absolute top-4 left-4 neon-btn text-xs"
      >
       LOGOUT
      </button>


      {/* PROFILE */}
    <button
       onClick={() => setShowProfile(!showProfile)}
       className="absolute top-4 right-4 neon-btn flex items-center gap-2 text-sm"
      >
       <span>👤</span>
       <span>{user.username}</span>
    </button>

      {showProfile && (
        <ProfileDropdown
          user={user}
          onClose={() => setShowProfile(false)}
        />
      )}

      {/* 🎮 GAME AREA */}
      <div className="arcade-frame mt-16">
        <div className="arcade-screen">
          <div className="arcade-menu">
           <button
              className="arcade-btn px-10 py-2"
              onClick={() => onNavigate("online-modes")}
              >
               PLAY ONLINE
          </button>

          <button className="arcade-btn px-6 py-2 text-sm">
            Play vs Bot
          </button>

          <button
            className="arcade-btn px-6 py-2 text-sm"
            onClick={() => onNavigate("local-setup")}
          >
            Local Match
          </button>
          </div>
        </div>
      </div>

    </div>
  );
}
