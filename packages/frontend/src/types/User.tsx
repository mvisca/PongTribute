export type User = 
{
  id: string;
  username: string;
  email: string;
  avatar?: string;  
  status?: "online" | "offline";
  gamesPlayed?: number;
  has2FAEnabled?: boolean;
};

