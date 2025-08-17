
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
  category: string;
  categoryId: string;
  comments: Comment[];
  voiceNotes: VoiceNote[];
}
