export interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

export interface VoiceNote {
  id: string;
  author: string;
  audioUrl: string;
  timestamp: string;
}

export interface Photo {
  id:string;
  url: string;
  description: string;
  timestamp: string;
  author: string;
  category: 'Ceremony' | 'Reception' | 'Couple Portraits' | 'Group Photos' | 'Details';
  comments: Comment[];
  voiceNotes: VoiceNote[];
}
