import { useState } from "react";
import { login } from "../api/authApi";
import { User } from "../types/User";

type Props = {
  onLoginSuccess: (user: User, token: string) => void;
  onRegister: () => void;
  onForgot: () => void;
};


export default function Login({
  onLoginSuccess,
  onRegister,
  onForgot,
}: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

async function handleLogin() 
{
   // 🔹 Bypass de desarrollo
  if (email === "test@test.test" && password === "test") 
  {
    onLoginSuccess(
      {
        id: "test-id",
        username: "test",
        email: "test@test.test",
        has2FAEnabled: false,
      },
      "test-token"
    );
    return;
  }

  // 🔹 Validaciones
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  if (!email || !password) 
  {
    setError("Email and password are required");
    return;
  }

  if (!emailRegex.test(email)) 
    {
    setError("Invalid email format");
    return;
  }

   if (!passwordRegex.test(password)) 
  {
    setError(
      "Password must be at least 8 characters and include uppercase, lowercase and numbers"
    );
    return;
  }

  try 
  {
    const data = await login(email, password);
    onLoginSuccess(data.user, data.token);
  } 
  catch (err: any) 
  {
    setError(err?.message || "Login failed");
  }

}

  return(
    <div className="retro-bg flex items-center justify-center">
      <div className="bg-purple-800 p-6 rounded-xl w-80 shadow-lg">
       <h1 className="retro-title mb-6">
         WELCOME TO <br /> PING-PONG
          </h1>

        {error && (
          <div className="mb-4 p-2 rounded bg-purple-900 text-purple-200 text-sm text-center">
            {error}
          </div>
        )}

       <input
        className="input"
        placeholder="Email"
        value={email}
        onChange=
        {
          (e) => 
          {
           setEmail(e.target.value);
           setError("");
          }
        }
/>

        <input
          type="password"
          className="input"
          placeholder="Password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
        />

        <button onClick={handleLogin} className="arcade-btn w-full mt-4">
          LOGIN
        </button>


        <div className="mt-4 flex justify-between text-sm text-purple-300">
          <button onClick={onRegister} className="hover:underline">
            Create account
          </button>
          <button onClick={onForgot} className="hover:underline">
            Forgot password?
          </button>
        </div>
      </div>
    </div>
  );
}
