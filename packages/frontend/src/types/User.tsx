export type User =
{
  id: string;
  username: string;
  email: string;
  has2FAEnabled: boolean;
  status?: "online" | "offline";
  gamesPlayed?: number;
};
