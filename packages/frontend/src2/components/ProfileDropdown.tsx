import { User } from "../types/User";
import { useState } from "react";
import { EditProfile } from "./EditProfile";


type Props = {
  user: User;
  onClose: () => void;
};

export function ProfileDropdown({ user, onClose }: Props) {

  const [isEditing, setIsEditing] = useState(false);
  
  return (
    <div className="absolute top-16 right-4 w-80 bg-purple-800 rounded-xl shadow-lg p-4 z-50">
      
      {/* Close */}
      <button
        onClick={onClose}
        className="text-sm text-purple-300 mb-2 hover:underline"
      >
        Close
      </button>

<div className="mb-4">
  <div className="flex items-center gap-3">
    <div className="w-12 h-12 bg-purple-700 rounded-full flex items-center justify-center">
      {user.avatar ?? "👤"}
    </div>

    <div>
      <p className="font-bold">{user.username}</p>
      <p className="text-sm text-purple-300">{user.email}</p>

      {/* Online status */}
      <div className="flex items-center gap-1 text-xs">
        <span className={`w-2 h-2 rounded-full ${user.status === "online" ? "bg-green-400" : "bg-gray-500"}`}></span>
        {user.status ? (user.status === "online" ? "Online" : "Offline") : "Unknown"}
      </div>
    </div>
  </div>

  {/* Games played */}
  <p className="mt-2 text-sm">
    Games played: <span className="font-bold">{user.gamesPlayed ?? 0}</span>
  </p>

  <button
  onClick={() => setIsEditing(true)}
  className="mt-2 text-sm underline hover:text-purple-200"
>
  Edit profile
</button>

</div>
{isEditing && (
  <div className="mt-4 border-t border-purple-600 pt-4 animate-pulse">
    <EditProfile
      user={user}
      onSave={(updatedUser) => {
        Object.assign(user, updatedUser);
        setIsEditing(false);
      }}
      onCancel={() => setIsEditing(false)}
    />
  </div>
)}


      {/* Friends section */}
      <div className="border-t border-purple-700 pt-3">
        <h3 className="font-bold mb-2">Friends</h3>

        <input
          placeholder="Search friends..."
          className="w-full p-2 mb-2 rounded bg-purple-700 text-purple-100 placeholder-purple-300"
        />

        <p className="text-sm text-purple-300 mb-2">
          Friend requests: 0
        </p>

        <p className="text-sm text-purple-400">
          No friends yet
        </p>
      </div>
    </div>
  );
}