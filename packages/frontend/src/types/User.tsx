
export type User = {
  username: string;
  email: string;
  password: string; // solo frontend fake
  status: "online" | "offline";
 // avatar: 
  gamesPlayed: number;
};
