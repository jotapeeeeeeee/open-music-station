export type Track = {
  id: string; title: string; artist: string; album: string; year: number;
  genre: string; tags: string[]; duration: number; color: string; blob?: Blob;
}
export type ListeningEvent = { trackId: string; type: 'complete' | 'skip' | 'like' | 'not-interested'; at: number }
