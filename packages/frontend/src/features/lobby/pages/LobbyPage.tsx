import { useState } from 'react';
import { useAuthStore } from '../../../core/auth/AuthStore';
import { useFriendsStore, FriendEntry } from '../../friends/store/friendsStore';
import Navbar from '../../../shared/components/Navbar';

export default function LobbyPage() {
  // Estado local
  const [showProfile, setShowProfile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Usuario actual
  const currentUser = useAuthStore((state) => state.user);
  const avatar = useAuthStore((state) => state.avatar);

  // Amigos
  const friends = useFriendsStore((state) => state.friends);
  const friendsList = Object.values(friends);

  return (
    <div className="flex flex-col h-screen">
      {/* Navbar con menú funcional */}
      <Navbar
        onMenuClick={() => setMenuOpen(!menuOpen)}
        onProfileClick={() => setShowProfile(!showProfile)}
      />

      {/* Fondo*/}
      <div className="retro-bg min-h-screen flex flex-col items-center justify-center text-purple-100 relative">

        {/* Perfil lateral */}
        {showProfile && (
          <div className="absolute left-0 top-0 w-80 h-full bg-purple-800 p-4 z-50 overflow-y-auto">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-purple-700 rounded-full flex items-center justify-center text-2xl">
                {avatar ?? '👤'}
              </div>
              <p className="font-bold text-purple-100">{currentUser?.username}</p>
              <p className="text-sm text-purple-300">{currentUser?.email}</p>

              <div className="mt-4 w-full">
                <h3 className="font-bold text-purple-200 mb-2">Friends</h3>
                {friendsList.length === 0 ? (
                  <p className="text-sm text-purple-400">No friends yet</p>
                ) : (
                  friendsList.map((friend: FriendEntry) => (
                    <div
                      key={friend.userId}
                      className="flex items-center gap-2 mb-2 text-purple-100"
                    >
                      <div className="w-8 h-8 bg-purple-700 rounded-full flex items-center justify-center text-sm">
                        {friend.avatar ?? '👤'}
                      </div>
                      <span>{friend.username}</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          friend.isOnline ? 'bg-green-400' : 'bg-gray-500'
                        }`}
                      ></span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pantalla de juego central */}
        <div className="flex-1 flex items-center justify-center relative">
          <div className="bg-black w-[80vw] max-w-[1000px] aspect-video rounded-lg shadow-lg flex flex-col items-center justify-center">
            {/*Ideal para cuando pongamos canvas-> <div className="bg-black w-[80vw] max-w-[1000px] aspect-video rounded-lg shadow-lg overflow-hidden">
  <canvas id="pong-game" className="w-full h-full"></canvas>
</div> */}
            <h1 className="text-purple-100 text-2xl mb-6">Welcome to Ping Pong</h1>

            {/* Botones principales de la lobby */}
            <div className="flex gap-4">
              <button className="neon-btn px-6 py-2" onClick={() => alert('Play Online')}>
                PLAY ONLINE
              </button>
              <button className="neon-btn px-6 py-2" onClick={() => alert('Local Match')}>
                LOCAL MATCH
              </button>
			  <button className="neon-btn px-6 py-2" onClick={() => alert('Local Match')}>
                PLAY VS BOT
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
