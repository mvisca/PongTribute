
import { useState } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Home from "./pages/Home";
import OnlineModes from "./pages/OnlineModes";
import Matchmaking from "./pages/Matchmaking";
import LocalMatchSetup from "./pages/LocalMatchSetup";
import { User } from "./types/User";

type Page =
  | "login"
  | "register"
  | "forgot"
  | "home"
  | "online-modes"
  | "matchmaking"
  | "local-setup";

export default function App() {
  const [page, setPage] = useState<Page>("login");
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // 👇 Guardamos el modo seleccionado
  const [selectedMode, setSelectedMode] = useState<string>("Classic");

  return (
    <>
      {/* LOGIN */}
      {page === "login" && (
        <Login
          onLoginSuccess={(user, token) => {
            setUser(user);
            setToken(token);
            setPage("home");
          }}
          onRegister={() => setPage("register")}
          onForgot={() => setPage("forgot")}
        />
      )}

      {/* REGISTER */}
      {page === "register" && (
        <Register onBack={() => setPage("login")} />
      )}

      {/* FORGOT */}
      {page === "forgot" && (
        <ForgotPassword onBack={() => setPage("login")} />
      )}

      {/* HOME */}
      {page === "home" && user && token && (
        <Home
          user={user}
          token={token}
          onLogoutSuccess={() => {
            setUser(null);
            setToken(null);
            setPage("login");
          }}
          onNavigate={(nextPage) => setPage(nextPage as Page)}
        />
      )}

      {/* ONLINE MODE SELECT */}
      {page === "online-modes" && (
        <OnlineModes
          onSelectMode={(mode) => {
            setSelectedMode(mode);
            setPage("matchmaking");
          }}
          onBack={() => setPage("home")}
        />
      )}

      {/* MATCHMAKING */}
      {page === "matchmaking" && (
        <Matchmaking
          mode={selectedMode}
          onCancel={() => setPage("home")}
          onBot={() => {
            // Más adelante irá a game vs bot
            alert("Bot match starting...");
          }}
        />
      )}

      {/* LOCAL MATCH SETUP */}
      {page === "local-setup" && (
        <LocalMatchSetup
          onStart={(mode, scoreLimit) => {
            alert(
              `Local Match Starting\nMode: ${mode}\nScore Limit: ${scoreLimit}`
            );
          }}
          onBack={() => setPage("home")}
        />
      )}
    </>
  );
}