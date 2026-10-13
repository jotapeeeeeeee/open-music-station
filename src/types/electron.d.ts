declare global {
  interface Window {
    electron?: {
      getStream: (query: string) => Promise<string>
    }
  }
}

export {}
