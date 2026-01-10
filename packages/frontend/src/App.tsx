import { useState } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Home from "./pages/Home";
import { User } from "./types/User";

type Page = "login" | "register" | "forgot" | "home";

export default function App() {
  const [page, setPage] = useState<Page>("login");
  const [user, setUser] = useState<User | null>(null);

  return (
    <>
      {page === "login" && (
        <Login
          onLoginSuccess={(username) => {
            setUser({ username } as any); // 👈 simulamos login
            setPage("home");
          }}
          onRegister={() => setPage("register")}
          onForgot={() => setPage("forgot")}
        />
      )}

      {page === "register" && (
        <Register onBack={() => setPage("login")} />
      )}

      {page === "forgot" && (
        <ForgotPassword onBack={() => setPage("login")} />
      )}

      {page === "home" && user && (
        <Home
          user={user}
          onLogout={() => {
            setUser(null);
            setPage("login");
          }}
        />
      )}
    </>
  );
}