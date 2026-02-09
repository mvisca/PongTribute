import { useState } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Home from "./pages/Home";
import { User } from "./types/User";
import { LocalGame } from './pages/Game/LocalGame';

type Page = "login" | "register" | "forgot" | "home" | "local-game";

export default function App() {
  const [page, setPage] = useState<Page>("login");
  //const [page, setPage] = useState<Page>("local-game"); // PARA TESTEO DEL LOCAL-GAME
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  return (
    <>
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


      {page === "register" && (
        <Register onBack={() => setPage("login")} />
      )}

      {page === "forgot" && (
        <ForgotPassword onBack={() => setPage("login")} />
      )}

	  {page === "local-game" && (
        <LocalGame />
		  )}
		  
      {page === "home" && user && token && (
      <Home
        user={user}
        token={token}
        onLogoutSuccess={() => {
         setUser(null);
         setToken(null);
          setPage("login");
       }}
      />
    )}

    </>
  );
}