import type { Track } from './types'

export const demoTracks: Track[] = [
  { id: 'demo-01', title: 'Night Bus', artist: 'Open Signals', album: 'After Hours', year: 2024, genre: 'Electronic', tags: ['late night', 'minimal', 'steady'], duration: 188, color: '#d7f45b' },
  { id: 'demo-02', title: 'Soft Static', artist: 'Field Notes', album: 'Small Rooms', year: 2023, genre: 'Ambient', tags: ['ambient', 'focus', 'warm'], duration: 214, color: '#b8a9ff' },
  { id: 'demo-03', title: 'Sidewalk Atlas', artist: 'Common Ground', album: 'Walking Distance', year: 2024, genre: 'Indie', tags: ['guitar', 'daylight', 'upbeat'], duration: 201, color: '#ff9568' },
  { id: 'demo-04', title: 'Low Tide / High Moon', artist: 'Mara Vale', album: 'Tidal Memory', year: 2022, genre: 'Jazz', tags: ['instrumental', 'slow', 'night'], duration: 276, color: '#78d8d0' },
  { id: 'demo-05', title: 'Antenna Bloom', artist: 'Open Signals', album: 'After Hours', year: 2024, genre: 'Electronic', tags: ['synth', 'bright', 'motion'], duration: 196, color: '#f2bd55' },
]

export const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
