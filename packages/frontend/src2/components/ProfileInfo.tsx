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
          {user.status ? (
            <p className={`text-xs ${user.status === "online" ? "text-green-400" : "text-gray-400"}`}>
              {user.status === "online" ? "Online" : "Offline"}
            </p>
          ) : null}
        </div>
      </div>

      <p className="mt-2 text-sm">
        Games played: <span className="font-bold">{user.gamesPlayed ?? 0}</span>
      </p>

      <button className="mt-2 text-sm underline">
        Edit profile
      </button>
    </div>
  );
}
