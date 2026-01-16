import { useState } from "react";
import { User } from "../types/User";

type Props = {
  user: User;
  onSave: (user: User) => void;
  onCancel: () => void;
};

export function EditProfile({ user, onSave, onCancel }: Props) {
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
//  const [password, setPassword] = useState(user.password);
// NOTA: Poner en otro componente

  function handleSave() {
    onSave({
      ...user,
      username,
      email
    });
  }

  return (
    <div className="bg-purple-900 p-4 rounded-xl">
      <h2 className="font-bold mb-2">Edit profile</h2>

      <input
        className="input"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
      />

      <input
        className="input mt-2"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />

      <div className="flex gap-2 mt-4">
        <button onClick={handleSave} className="btn-primary">
          Save
        </button>
        <button onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
      </div>
    </div>
  );
}
