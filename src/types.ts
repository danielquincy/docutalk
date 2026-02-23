
export type AppState = 'WELCOME' | 'AVATAR_SELECTION' | 'UPLOAD' | 'CHAT';

export interface AvatarProfile {
  id: string;
  name: string;
  description: string;
  voice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  color: string;
  imageUrl: string;
  greeting: string;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
}
