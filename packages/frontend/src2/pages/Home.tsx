import { useState } from "react";
import { User } from "../types/User";
import { ProfileDropdown } from "../components/ProfileDropdown";
import OnlineModes from "./OnlineModes";
import Matchmaking from "./Matchmaking";
import LocalMatchSetup from "./LocalMatchSetup";

type Props = {
  user: User;
  token: string;
  onLogoutSuccess: () => void;
};

type GameScreen =
  | "menu"
  | "online-modes"
  | "matchmaking"
  | "local-setup";

export default function Home({ user, onLogoutSuccess }: Props) {
  const [showProfile, setShowProfile] = useState(false);
  const [screen, setScreen] = useState<GameScreen>("menu");
  const [selectedMode, setSelectedMode] = useState("Classic");

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

          {/* MAIN MENU */}
          {screen === "menu" && (
            <div className="arcade-menu">
              <button
                className="arcade-btn px-10 py-2"
                onClick={() => setScreen("online-modes")}
              >
                PLAY ONLINE
              </button>

              <button className="arcade-btn px-6 py-2 text-sm">
                Play vs Bot
              </button>

              <button
                className="arcade-btn px-6 py-2 text-sm"
                onClick={() => setScreen("local-setup")}
              >
                Local Match
              </button>
            </div>
          )}

          {/* ONLINE MODE SELECTION */}
          {screen === "online-modes" && (
            <OnlineModes
              onSelectMode={(mode) => {
                setSelectedMode(mode);
                setScreen("matchmaking");
              }}
              onBack={() => setScreen("menu")}
            />
          )}

          {/* MATCHMAKING */}
          {screen === "matchmaking" && (
            <Matchmaking
              mode={selectedMode}
              onCancel={() => setScreen("menu")}
              onBot={() => alert("Bot match starting...")}
            />
          )}

          {/* LOCAL MATCH SETUP */}
          {screen === "local-setup" && (
            <LocalMatchSetup
              onStart={(mode, scoreLimit) => {
                alert(
                  `Local Match Starting\nMode: ${mode}\nScore Limit: ${scoreLimit}`
                );
              }}
              onBack={() => setScreen("menu")}
            />
          )}

        </div>
      </div>

    </div>
  );
}
