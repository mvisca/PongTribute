export type User = {
  username: string;
  email: string;
  status: "online" | "offline";
  avatar?: string;
  gamesPlayed: number;
};

