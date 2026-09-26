import type { Track } from './types'

const API_URL = 'https://commons.wikimedia.org/w/api.php'
const ALLOWED_LICENSES = /^(?:CC0|Public domain|CC BY(?:-SA)? \d(?:\.\d)?)$/i
type CommonsMetadataValue = { value?: string }
type CommonsPage = {
  pageid: number
  title: string
  imageinfo?: Array<{
    url?: string
    descriptionurl?: string
    mime?: string
    mediatype?: string
    extmetadata?: Record<string, CommonsMetadataValue>
  }>
}
type CommonsResponse = { query?: { pages?: Record<string, CommonsPage> }; error?: { info?: string } }

function plainText(value?: string) {
  if (!value) return ''
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);|&#x([0-9a-f]+);/gi, (entity, decimal: string, hex: string) => {
      const codePoint = decimal ? Number(decimal) : Number.parseInt(hex, 16)
      return Number.isFinite(codePoint) && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : ''
    })
    .replace(/\s+/g, ' ')
    .trim()
}

export function parseCommonsTracks(response: CommonsResponse, fallbackQuery: string): Track[] {
  return Object.values(response.query?.pages ?? []).flatMap(page => {
    const info = page.imageinfo?.[0]
    const metadata = info?.extmetadata ?? {}
    const license = plainText(metadata.LicenseShortName?.value)
    const mime = info?.mime?.toLowerCase() ?? ''
    const isAudio = mime.startsWith('audio/') || mime === 'application/ogg' || mime === 'application/x-ogg'
    if (!info?.url || !info.descriptionurl || !isAudio || !ALLOWED_LICENSES.test(license)) return []

    const title = plainText(metadata.ObjectName?.value) || page.title.replace(/^File:/, '').replace(/\.[^.]+$/, '')
    const artist = plainText(metadata.Artist?.value) || plainText(metadata.Credit?.value) || 'Unknown contributor'
    const licenseUrl = metadata.LicenseUrl?.value
    return [{
      id: `commons-${page.pageid}`,
      title,
      artist,
      album: 'Wikimedia Commons',
      year: Number(plainText(metadata.DateTime?.value).slice(0, 4)) || 0,
      genre: fallbackQuery || 'Open audio',
      tags: ['open licensed', license],
      duration: 0,
      color: '#78d8d0',
      streamUrl: info.url,
      sourceUrl: info.descriptionurl,
      license,
      licenseUrl,
      attribution: `${artist} — ${license}`,
    }]
  })
}

export async function searchCommonsTracks(query: string, signal?: AbortSignal): Promise<Track[]> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrsearch: `filetype:audio ${query}`,
    gsrnamespace: '6',
    gsrlimit: '50',
    prop: 'imageinfo',
    iiprop: 'url|mime|extmetadata',
    origin: '*',
  })
  const response = await fetch(`${API_URL}?${params}`, { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Wikimedia Commons returned HTTP ${response.status}`)
  const data = await response.json() as CommonsResponse
  if (data.error) throw new Error(data.error.info || 'Wikimedia Commons search failed')
  return parseCommonsTracks(data, query).slice(0, 20)
}
