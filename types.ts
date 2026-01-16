
export enum GameMode {
  TOURIST = 'Tourist (Easy)',
  PROFESSIONAL = 'Professional (Hard)',
  SOCIALITE = 'Socialite (Medium)',
  CRISIS = 'Crisis (Expert)'
}

export interface GameStats {
  mode: GameMode | null;
  confidence: number;
  inventory: string[];
  location: string;
  level: number;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  tutorNote?: string;
}

export interface GameTurnResponse {
  narrative: string;
  tutorNote: string;
  isLevelComplete?: boolean;
  statsUpdate: {
    confidenceDelta: number;
    newInventoryItem?: string;
    removedInventoryItem?: string;
    newLocation?: string;
  };
}
