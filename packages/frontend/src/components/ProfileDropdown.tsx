import { User } from "../types/User";

type Props = {
  user: User;
  onClose: () => void;
};

export function ProfileDropdown({ user, onClose }: Props) {
  return (
    <div className="absolute top-16 right-4 w-80 bg-purple-800 rounded-xl shadow-lg p-4 z-50">
      
      {/* Close */}
      <button
        onClick={onClose}
        className="text-sm text-purple-300 mb-2 hover:underline"
      >
        Close
      </button>

      {/* User info */}
     {/* User info */}
<div className="mb-4">
  <div className="flex items-center gap-3">
    <div className="w-12 h-12 bg-purple-700 rounded-full flex items-center justify-center">
      👤
    </div>

    <div>
      <p className="font-bold">{user.username}</p>
      <p className="text-sm text-purple-300">{user.email}</p>

      {/* Online status */}
      <div className="flex items-center gap-1 text-xs text-green-400">
        <span className="w-2 h-2 bg-green-400 rounded-full"></span>
        Online
      </div>
    </div>
  </div>

  {/* Games played */}
  <p className="mt-2 text-sm">
    Games played: <span className="font-bold">{user.gamesPlayed}</span>
  </p>

  <button className="mt-2 text-sm underline hover:text-purple-200">
    Edit profile
  </button>
</div>


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
