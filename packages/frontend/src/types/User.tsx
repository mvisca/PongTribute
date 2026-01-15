
export type User = {
  id?: number;
  username: string;
  email: string;
  status: "online" | "offline";
  gamesPlayed: number;
};
