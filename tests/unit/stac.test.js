import { describe, it, expect, vi, beforeEach } from 'vitest'
import { extractStacItemMeta, STAC_PRESETS, searchStac, searchStacNext, getStacCollections, signPlanetaryComputerUrl } from '../../src/stac.js'

describe('STAC_PRESETS', () => {
  it('contains at least 2 presets with name and url', () => {
    expect(STAC_PRESETS.length).toBeGreaterThanOrEqual(2)
    for (const p of STAC_PRESETS) {
      expect(p).toHaveProperty('name')
      expect(p).toHaveProperty('url')
      expect(p.url).toMatch(/^https:\/\//)
    }
  })
})

describe('extractStacItemMeta', () => {
  const baseItem = {
    id: 'test-item-001',
    properties: {
      title: 'Test Image',
      datetime: '2024-01-15T00:00:00Z',
      platform: 'sentinel-2a',
      instruments: ['msi'],
    },
    bbox: [-120, 35, -119, 36],
    collection: 'sentinel-2-l2a',
    assets: {
      visual: { href: 'https://storage.example.com/visual.tif' },
      thumbnail: { href: 'https://storage.example.com/thumb.png' },
    },
  }

  it('extracts title from properties', () => {
    expect(extractStacItemMeta(baseItem).title).toBe('Test Image')
  })

  it('falls back to item id when title missing', () => {
    const item = { ...baseItem, properties: {} }
    expect(extractStacItemMeta(item).title).toBe('test-item-001')
  })

  it('sets source_type to stac', () => {
    expect(extractStacItemMeta(baseItem).source_type).toBe('stac')
  })

  it('extracts datetime', () => {
    expect(extractStacItemMeta(baseItem).captured_at).toBe('2024-01-15T00:00:00Z')
  })

  it('combines platform and instrument as sensor', () => {
    expect(extractStacItemMeta(baseItem).sensor).toBe('sentinel-2a / msi')
  })

  it('handles platform only', () => {
    const item = { ...baseItem, properties: { platform: 'landsat-8' } }
    expect(extractStacItemMeta(item).sensor).toBe('landsat-8')
  })

  it('extracts bbox (first 4 values)', () => {
    expect(extractStacItemMeta(baseItem).bbox).toEqual([-120, 35, -119, 36])
  })

  it('prioritizes visual asset for cogUrl', () => {
    expect(extractStacItemMeta(baseItem).cogUrl).toBe('https://storage.example.com/visual.tif')
  })

  it('falls back to B04 asset', () => {
    const item = {
      ...baseItem,
      assets: { B04: { href: 'https://example.com/B04.tif' } },
    }
    expect(extractStacItemMeta(item).cogUrl).toBe('https://example.com/B04.tif')
  })

  it('falls back to first geotiff asset', () => {
    const item = {
      ...baseItem,
      assets: { data: { href: 'https://example.com/data.tif', type: 'image/tiff; application=geotiff' } },
    }
    expect(extractStacItemMeta(item).cogUrl).toBe('https://example.com/data.tif')
  })

  it('converts S3 URLs to HTTPS', () => {
    const item = {
      ...baseItem,
      assets: { visual: { href: 's3://my-bucket/path/to/file.tif' } },
    }
    expect(extractStacItemMeta(item).cogUrl).toBe('https://my-bucket.s3.amazonaws.com/path/to/file.tif')
  })

  it('extracts thumbnail URL', () => {
    expect(extractStacItemMeta(baseItem).thumbnail_url).toBe('https://storage.example.com/thumb.png')
  })

  it('sets collection as tags', () => {
    const meta = extractStacItemMeta(baseItem)
    expect(meta.collection).toBe('sentinel-2-l2a')
    expect(meta.tags).toEqual(['sentinel-2-l2a'])
  })

  it('returns null cogUrl when no usable assets', () => {
    const item = { ...baseItem, assets: {} }
    expect(extractStacItemMeta(item).cogUrl).toBeNull()
  })

  it('handles item without assets property (defaults to {})', () => {
    const item = { id: 'no-assets', properties: {} }
    const meta = extractStacItemMeta(item)
    expect(meta.cogUrl).toBeNull()
    expect(meta.thumbnail_url).toBeNull()
  })

  it('handles asset with undefined href via toHttpUrl', () => {
    const item = {
      ...baseItem,
      assets: { visual: { href: undefined }, thumbnail: { href: undefined } },
    }
    const meta = extractStacItemMeta(item)
    expect(meta.cogUrl).toBeNull()
    expect(meta.thumbnail_url).toBeNull()
  })
})

describe('searchStac', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('sends POST request with limit and collections', async () => {
    const mockResponse = { features: [] }
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(mockResponse) })

    const result = await searchStac({ apiUrl: 'https://api.example.com', collections: ['s2'], limit: 5 })
    expect(result).toEqual(mockResponse)
    expect(fetch).toHaveBeenCalledWith('https://api.example.com/search', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ limit: 5, collections: ['s2'] }),
    }))
  })

  it('includes bbox when no intersects', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    await searchStac({ apiUrl: 'https://api.example.com', bbox: [1, 2, 3, 4] })
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.bbox).toEqual([1, 2, 3, 4])
  })

  it('prefers intersects over bbox', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    const geo = { type: 'Polygon', coordinates: [] }
    await searchStac({ apiUrl: 'https://api.example.com', bbox: [1, 2, 3, 4], intersects: geo })
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.intersects).toEqual(geo)
    expect(body.bbox).toBeUndefined()
  })

  it('includes datetime when provided', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    await searchStac({ apiUrl: 'https://api.example.com', datetime: '2024-01-01/2024-12-31' })
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.datetime).toBe('2024-01-01/2024-12-31')
  })

  it('throws on non-ok response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    await expect(searchStac({ apiUrl: 'https://api.example.com' })).rejects.toThrow('STAC 검색 실패: 500')
  })
})

describe('searchStacNext', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('sends GET request by default', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ features: [] }) })
    await searchStacNext({ href: 'https://api.example.com/search?token=abc' })
    expect(fetch).toHaveBeenCalledWith('https://api.example.com/search?token=abc', expect.objectContaining({ method: 'GET' }))
  })

  it('sends POST with body and merge', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    await searchStacNext({ href: 'https://api.example.com/search', method: 'POST', body: { limit: 10 }, merge: { token: 'xyz' } })
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body).toEqual({ limit: 10, token: 'xyz' })
  })

  it('throws on non-ok response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 })
    await expect(searchStacNext({ href: 'https://api.example.com/search' })).rejects.toThrow('STAC 검색 실패: 404')
  })
})

describe('getStacCollections', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches and returns collections array', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ collections: [{ id: 's2' }] }) })
    const result = await getStacCollections('https://api.example.com')
    expect(result).toEqual([{ id: 's2' }])
    expect(fetch).toHaveBeenCalledWith('https://api.example.com/collections')
  })

  it('returns empty array when collections missing', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    expect(await getStacCollections('https://api.example.com')).toEqual([])
  })

  it('throws on non-ok response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 403 })
    await expect(getStacCollections('https://api.example.com')).rejects.toThrow('컬렉션 조회 실패: 403')
  })
})

describe('signPlanetaryComputerUrl', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns original URL for non-PC URLs', async () => {
    expect(await signPlanetaryComputerUrl('https://example.com/data.tif', 's2')).toBe('https://example.com/data.tif')
  })

  it('returns original URL for null/empty', async () => {
    expect(await signPlanetaryComputerUrl(null, 's2')).toBeNull()
    expect(await signPlanetaryComputerUrl('', 's2')).toBe('')
  })

  it('appends SAS token for PC URLs', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ token: 'se=2024&sig=abc' }) })
    const url = 'https://sentinel2l2a01.blob.core.windows.net/data.tif'
    const result = await signPlanetaryComputerUrl(url, 's2')
    expect(result).toBe('https://sentinel2l2a01.blob.core.windows.net/data.tif?se=2024&sig=abc')
  })

  it('uses & separator if URL already has query string', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ token: 'tok=1' }) })
    const url = 'https://sentinel2l2a01.blob.core.windows.net/data.tif?existing=1'
    const result = await signPlanetaryComputerUrl(url, 's2')
    expect(result).toBe('https://sentinel2l2a01.blob.core.windows.net/data.tif?existing=1&tok=1')
  })

  it('returns original URL on fetch failure', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network'))
    const url = 'https://sentinel2l2a01.blob.core.windows.net/data.tif'
    expect(await signPlanetaryComputerUrl(url, 's2')).toBe(url)
  })

  it('returns original URL on non-ok response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false })
    const url = 'https://sentinel2l2a01.blob.core.windows.net/data.tif'
    expect(await signPlanetaryComputerUrl(url, 's2')).toBe(url)
  })
})
