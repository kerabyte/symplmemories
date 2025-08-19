
export interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

export interface Photo {
  id:string;
  url: string;
  description: string;
  timestamp: string;
  author: string;
  category: string; // This will now be the category ID
  comments: Comment[];
}

export interface Category {
  catID: string;
  catName: string;
}
