import { describe, expect, it } from 'vitest'
import { parseCommonsTracks } from './commonsCatalog'

describe('Wikimedia Commons catalog adapter', () => {
  it('maps directly playable audio and exposes license and attribution', () => {
    const tracks = parseCommonsTracks({
      query: { pages: {
        '41': {
          pageid: 41,
          title: 'File:Open piano.ogg',
          imageinfo: [{
            url: 'https://upload.wikimedia.org/open-piano.ogg',
            descriptionurl: 'https://commons.wikimedia.org/wiki/File:Open_piano.ogg',
            mime: 'application/ogg',
            extmetadata: {
              ObjectName: { value: 'Open <i>piano</i>' },
              Artist: { value: '<a href="/wiki/User:Music">A. Musician</a>' },
              LicenseShortName: { value: 'CC BY-SA 4.0' },
              LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0' },
              DateTime: { value: '2024-02-03' },
            },
          }],
        },
      }},
    }, 'piano')

    expect(tracks).toHaveLength(1)
    expect(tracks[0]).toMatchObject({
      id: 'commons-41',
      title: 'Open piano',
      artist: 'A. Musician',
      year: 2024,
      streamUrl: 'https://upload.wikimedia.org/open-piano.ogg',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Open_piano.ogg',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
      attribution: 'A. Musician — CC BY-SA 4.0',
    })
  })

  it('rejects files without a direct audio URL or an approved open license', () => {
    const pages = [
      { pageid: 1, title: 'File:Private.ogg', imageinfo: [{ url: 'https://example.test/private.ogg', descriptionurl: 'https://commons.wikimedia.org/wiki/File:Private.ogg', mime: 'audio/ogg', extmetadata: { LicenseShortName: { value: 'All rights reserved' } } }] },
      { pageid: 2, title: 'File:Unknown license.ogg', imageinfo: [{ descriptionurl: 'https://commons.wikimedia.org/wiki/File:Unknown.ogg', mime: 'audio/ogg', extmetadata: { LicenseShortName: { value: 'CC BY 4.0' } } }] },
      { pageid: 3, title: 'File:Image.png', imageinfo: [{ url: 'https://example.test/image.png', descriptionurl: 'https://commons.wikimedia.org/wiki/File:Image.png', mime: 'image/png', extmetadata: { LicenseShortName: { value: 'CC0' } } }] },
    ]
    expect(parseCommonsTracks({ query: { pages: Object.fromEntries(pages.map(page => [page.pageid, page])) } }, 'music')).toEqual([])
  })
})
