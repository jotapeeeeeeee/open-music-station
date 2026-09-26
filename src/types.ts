export type Track = {
  id: string; title: string; artist: string; album: string; year: number;
  genre: string; tags: string[]; duration: number; color: string; blob?: Blob;
  streamUrl?: string; sourceUrl?: string; license?: string; licenseUrl?: string; attribution?: string; saved?: boolean;
}
export type Playlist = { id: string; name: string; trackIds: string[]; updatedAt: number }
export type ListeningEvent = { trackId: string; type: 'complete' | 'skip' | 'like' | 'unlike' | 'not-interested'; at: number }
