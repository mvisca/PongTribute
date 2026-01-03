import { User } from "../types/User";

type Props = {
  user: User;
};

export function ProfileInfo({ user }: Props) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-purple-700 rounded-full" />
        <div>
          <p className="font-bold">{user.username}</p>
          <p className="text-sm text-purple-300">{user.email}</p>
          <p className="text-xs text-green-400">{user.status}</p>
        </div>
      </div>

      <p className="mt-2 text-sm">
        Games played: {user.gamesPlayed}
      </p>

      <button className="mt-2 text-sm underline">
        Edit profile
      </button>
    </div>
  );
}
