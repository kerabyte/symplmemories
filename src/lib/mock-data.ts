import type { Photo } from './types';

export const photos: Photo[] = [
  {
    id: '1',
    url: 'https://placehold.co/1000x1000.png',
    description: 'The happy couple sharing a laugh during the ceremony.',
    author: 'Aunt Carol',
    timestamp: '2023-10-26T14:30:00Z',
    category: 'Ceremony',
    comments: [
      { id: 'c1', author: 'Cousin Mike', text: 'Such a beautiful moment!', timestamp: '2023-10-26T15:00:00Z' },
      { id: 'c2', author: 'Grandma Sue', text: 'You both look so happy. ❤️', timestamp: '2023-10-26T15:05:00Z' },
    ],
    voiceNotes: [],
  },
  {
    id: '2',
    url: 'https://placehold.co/1000x1000.png',
    description: 'First dance as husband and wife.',
    author: 'Best Man John',
    timestamp: '2023-10-26T19:45:00Z',
    category: 'Reception',
    comments: [
      { id: 'c3', author: 'Maid of Honor Jess', text: 'I was crying! So romantic.', timestamp: '2023-10-26T20:00:00Z' },
    ],
    voiceNotes: [],
  },
  {
    id: '3',
    url: 'https://placehold.co/1000x1000.png',
    description: 'Cutting the beautiful, five-tiered wedding cake.',
    author: 'Uncle Bob',
    timestamp: '2023-10-26T20:15:00Z',
    category: 'Reception',
    comments: [],
    voiceNotes: [],
  },
  {
    id: '4',
    url: 'https://placehold.co/1000x1000.png',
    description: 'The wedding party all together.',
    author: 'Official Photographer',
    timestamp: '2023-10-26T16:00:00Z',
    category: 'Group Photos',
    comments: [
       { id: 'c4', author: 'Dad', text: 'Great picture of everyone!', timestamp: '2023-10-26T17:00:00Z' }
    ],
    voiceNotes: [],
  },
  {
    id: '5',
    url: 'https://placehold.co/1000x1000.png',
    description: 'A quiet moment together after the ceremony.',
    author: 'Maid of Honor Jess',
    timestamp: '2023-10-26T15:20:00Z',
    category: 'Couple Portraits',
    comments: [],
    voiceNotes: [],
  },
  {
    id: '6',
    url: 'https://placehold.co/1000x1000.png',
    description: 'The flower girl was so adorable!',
    author: 'Guest',
    timestamp: '2023-10-26T14:25:00Z',
    category: 'Ceremony',
    comments: [],
    voiceNotes: [],
  },
    {
    id: '7',
    url: 'https://placehold.co/1000x1000.png',
    description: 'The send-off with sparklers was magical.',
    author: 'Cousin Dave',
    timestamp: '2023-10-26T22:00:00Z',
    category: 'Reception',
    comments: [],
    voiceNotes: [],
  },
  {
    id: '8',
    url: 'https://placehold.co/1000x1000.png',
    description: 'The gorgeous table settings.',
    author: 'Mom',
    timestamp: '2023-10-26T18:00:00Z',
    category: 'Details',
    comments: [
        { id: 'c5', author: 'Wedding Planner', text: 'So glad you liked them!', timestamp: '2023-10-26T18:30:00Z' }
    ],
    voiceNotes: [],
  },
];
