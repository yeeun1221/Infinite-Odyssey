export interface GameState {
  story: string;
  choices: string[];
  inventory: string[];
  currentQuest: string;
  visualContext: string; // Describes the art style and character appearance
  lastAction?: string;
}

export interface HistoryItem {
  role: 'user' | 'model';
  parts: { text: string }[];
}
