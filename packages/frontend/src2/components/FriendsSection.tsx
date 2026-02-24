export function FriendsSection() {
  return (
    <div className="border-t border-purple-700 pt-3">
      <h3 className="font-bold mb-2">Friends</h3>

      <input
        placeholder="Search friends..."
        className="w-full p-2 mb-2 rounded bg-purple-700 text-purple-100"
      />

      <p className="text-sm text-purple-300 mb-2">
        Friend requests: 0
      </p>

      <p className="text-sm text-purple-400">
        No friends yet
      </p>
    </div>
  );
}
