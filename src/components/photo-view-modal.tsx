"use client";

import * as React from 'react';
import Image from 'next/image';
import type { Photo, Comment, VoiceNote } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Mic, Play, Square, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface PhotoViewModalProps {
  photo: Photo;
  onClose: () => void;
  onUpdatePhoto: (photo: Photo) => void;
}

export function PhotoViewModal({ photo, onClose, onUpdatePhoto }: PhotoViewModalProps) {
  const [newComment, setNewComment] = React.useState('');
  const [isRecording, setIsRecording] = React.useState(false);
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const { toast } = useToast();

  const handleAddComment = () => {
    if (newComment.trim()) {
      const comment: Comment = {
        id: new Date().toISOString(),
        author: 'Guest', // In a real app, this would be the logged-in user
        text: newComment,
        timestamp: new Date().toISOString(),
      };
      onUpdatePhoto({ ...photo, comments: [...photo.comments, comment] });
      setNewComment('');
    }
  };
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      
      recorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        audioChunksRef.current = [];
        // Clean up the stream
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setAudioUrl(null);

    } catch (err) {
      console.error('Error accessing microphone:', err);
      toast({ variant: 'destructive', title: 'Microphone access denied', description: 'Please allow microphone access in your browser settings.' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  const handleAddVoiceNote = () => {
    if (audioUrl) {
      const voiceNote: VoiceNote = {
        id: new Date().toISOString(),
        author: 'Guest',
        audioUrl: audioUrl,
        timestamp: new Date().toISOString(),
      };
      onUpdatePhoto({ ...photo, voiceNotes: [...photo.voiceNotes, voiceNote] });
      setAudioUrl(null);
    }
  };

  return (
    <Dialog open={!!photo} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col md:flex-row p-0 data-[state=open]:h-full md:data-[state=open]:h-[90vh] data-[state=open]:w-full md:data-[state=open]:w-auto">
        <div className="w-full h-1/2 md:h-full md:w-1/2 lg:w-2/3 relative">
          <Image
            src={photo.url}
            alt={photo.description}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 50vw"
            data-ai-hint="wedding photo"
          />
        </div>
        <div className="w-full h-1/2 md:h-full md:w-1/2 lg:w-1/3 flex flex-col">
          <DialogHeader className="p-4 md:p-6 pb-2">
            <DialogTitle className="font-headline text-lg md:text-2xl">Photo by {photo.author}</DialogTitle>
            <DialogDescription className="text-sm md:text-base">{photo.description}</DialogDescription>
             <p className="text-xs text-muted-foreground pt-1">{formatDistanceToNow(new Date(photo.timestamp), { addSuffix: true })}</p>
          </DialogHeader>
          <div className="flex-1 min-h-0">
             <Tabs defaultValue="comments" className="h-full flex flex-col">
                <TabsList className="mx-4 md:mx-6">
                    <TabsTrigger value="comments">Comments ({photo.comments.length})</TabsTrigger>
                    <TabsTrigger value="voicenotes">Voice Notes ({photo.voiceNotes.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="comments" className="flex-1 flex flex-col min-h-0 px-4 md:px-6 pb-4 md:pb-6">
                    <ScrollArea className="flex-1 pr-4 -mr-4">
                        <div className="space-y-4">
                        {photo.comments.map((comment) => (
                            <div key={comment.id} className="flex gap-3">
                                <Avatar>
                                    <AvatarFallback>{comment.author.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold text-sm">{comment.author}</p>
                                    <p className="text-sm">{comment.text}</p>
                                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true })}</p>
                                </div>
                            </div>
                        ))}
                        {photo.comments.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Be the first to comment!</p>}
                        </div>
                    </ScrollArea>
                    <div className="mt-4 pt-4 border-t flex flex-col gap-2">
                        <Textarea placeholder="Add a comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)} />
                        <Button onClick={handleAddComment} disabled={!newComment.trim()}>Post Comment</Button>
                    </div>
                </TabsContent>
                <TabsContent value="voicenotes" className="flex-1 flex flex-col min-h-0 px-4 md:px-6 pb-4 md:pb-6">
                    <ScrollArea className="flex-1 pr-4 -mr-4">
                       <div className="space-y-4">
                         {photo.voiceNotes.map((note) => (
                           <div key={note.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
                             <Avatar>
                               <AvatarFallback>{note.author.charAt(0)}</AvatarFallback>
                             </Avatar>
                             <div className="flex-1">
                               <audio src={note.audioUrl} controls className="w-full h-8" />
                               <p className="text-xs text-muted-foreground mt-1">{note.author} &middot; {formatDistanceToNow(new Date(note.timestamp), { addSuffix: true })}</p>
                             </div>
                           </div>
                         ))}
                         {photo.voiceNotes.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No voice notes yet.</p>}
                       </div>
                    </ScrollArea>
                     <div className="mt-4 pt-4 border-t flex flex-col gap-2 items-center">
                        {isRecording ? (
                            <Button onClick={stopRecording} variant="destructive" className="w-full">
                                <Square className="mr-2 h-4 w-4" /> Stop Recording
                            </Button>
                        ) : (
                            <Button onClick={startRecording} className="w-full">
                                <Mic className="mr-2 h-4 w-4" /> Start Recording
                            </Button>
                        )}
                        {audioUrl && (
                            <div className="w-full flex flex-col gap-2 items-center p-2 border rounded-md">
                                <p className="text-sm">Recording complete. Preview:</p>
                                <audio src={audioUrl} controls className="w-full h-8" />
                                <div className="flex w-full gap-2">
                                <Button onClick={() => setAudioUrl(null)} variant="ghost" className="w-full">
                                    <Trash2 className="mr-2 h-4 w-4" /> Discard
                                </Button>
                                <Button onClick={handleAddVoiceNote} className="w-full">
                                    Add Voice Note
                                </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
