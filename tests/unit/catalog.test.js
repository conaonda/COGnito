import { describe, it, expect, vi } from 'vitest'

const { mockSupabase, setMockQuery, createQueryMock, mockDetectBands } = vi.hoisted(() => {
  let mockQuery
  function createQueryMock(resolveData = null, resolveError = null) {
    const result = { data: resolveData, error: resolveError }
    const chain = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(result),
      then: (resolve) => resolve(result),
    }
    return chain
  }
  const mockSupabase = { from: vi.fn(() => mockQuery) }
  return {
    mockSupabase,
    setMockQuery: (q) => { mockQuery = q; mockSupabase.from = vi.fn(() => q) },
    createQueryMock,
    mockDetectBands: vi.fn(),
  }
})

vi.mock('../../src/supabase.js', () => ({ supabase: mockSupabase }))
vi.mock('@conaonda/ol-cog-layers', () => ({ detectBands: mockDetectBands }))

import { generateTitleFromUrl, generateDescriptionFromMeta, saveCogImage, getCogImages, getCogImage, deleteCogImage, extractCogMetadata, generateThumbnail } from '../../src/catalog.js'

describe('generateTitleFromUrl', () => {
  it('removes .tif extension and converts separators to spaces', () => {
    expect(generateTitleFromUrl('https://example.com/my_cool-image.tif'))
      .toBe('my cool image')
  })

  it('removes .tiff extension', () => {
    expect(generateTitleFromUrl('https://example.com/data.tiff'))
      .toBe('data')
  })

  it('removes .cog extension (case insensitive)', () => {
    expect(generateTitleFromUrl('https://example.com/raster.COG'))
      .toBe('raster')
  })

  it('strips query string before processing', () => {
    expect(generateTitleFromUrl('https://example.com/file_name.tif?token=abc'))
      .toBe('file name')
  })

  it('returns empty string for empty/invalid input', () => {
    expect(generateTitleFromUrl('')).toBe('')
  })

  it('handles URL with no extension', () => {
    expect(generateTitleFromUrl('https://example.com/plain_name'))
      .toBe('plain name')
  })
})

describe('generateDescriptionFromMeta', () => {
  it('combines bands, crs, and dimensions', () => {
    const meta = { bands: [1, 2, 3], bandType: 'RGB', crs: 'EPSG:32615', width: 4096, height: 4096 }
    expect(generateDescriptionFromMeta(meta)).toBe('3-band RGB, EPSG:32615, 4096×4096')
  })

  it('handles partial meta (bands only)', () => {
    expect(generateDescriptionFromMeta({ bands: [1] })).toBe('1-band')
  })

  it('handles partial meta (crs only)', () => {
    expect(generateDescriptionFromMeta({ crs: 'EPSG:4326' })).toBe('EPSG:4326')
  })

  it('returns empty string for empty meta', () => {
    expect(generateDescriptionFromMeta({})).toBe('')
  })

  it('includes bandType when provided', () => {
    const meta = { bands: [1, 2, 3], bandType: 'RGB' }
    expect(generateDescriptionFromMeta(meta)).toBe('3-band RGB')
  })

  it('handles missing bandType gracefully', () => {
    const meta = { bands: [1, 2, 3] }
    expect(generateDescriptionFromMeta(meta)).toBe('3-band')
  })
})

describe('saveCogImage', () => {
  it('inserts data via supabase', async () => {
    const insertedData = { id: '1', url: 'https://example.com/test.tif' }
    const q = createQueryMock(insertedData)
    setMockQuery(q)
    const result = await saveCogImage({ url: 'https://example.com/test.tif', title: 'Test' })
    expect(mockSupabase.from).toHaveBeenCalledWith('cog_images')
    expect(q.insert).toHaveBeenCalled()
    expect(result).toEqual({ data: insertedData, error: null })
  })
})

describe('getCogImages', () => {
  it('queries cog_images with default params', async () => {
    const q = createQueryMock([{ id: '1' }])
    setMockQuery(q)
    const result = await getCogImages()
    expect(mockSupabase.from).toHaveBeenCalledWith('cog_images')
    expect(result.data).toEqual([{ id: '1' }])
  })

  it('applies search filter with sanitization', async () => {
    const q = createQueryMock([])
    setMockQuery(q)
    await getCogImages({ search: 'test%inject' })
    expect(q.or).toHaveBeenCalled()
  })

  it('skips empty sanitized search', async () => {
    const q = createQueryMock([])
    setMockQuery(q)
    await getCogImages({ search: '%_*' })
    expect(q.or).not.toHaveBeenCalled()
  })

  it('applies tag filter', async () => {
    const q = createQueryMock([])
    setMockQuery(q)
    await getCogImages({ tag: 'sentinel' })
    expect(q.contains).toHaveBeenCalledWith('tags', ['sentinel'])
  })

  it('applies sensor filter', async () => {
    const q = createQueryMock([])
    setMockQuery(q)
    await getCogImages({ sensor: 'msi' })
    expect(q.ilike).toHaveBeenCalledWith('sensor', '%msi%')
  })

  it('applies region filter', async () => {
    const q = createQueryMock([])
    setMockQuery(q)
    await getCogImages({ region: 'korea' })
    expect(q.ilike).toHaveBeenCalledWith('region', '%korea%')
  })

  it('sorts by like_count client-side', async () => {
    const q = createQueryMock([
      { id: '1', likes: [{ count: 2 }] },
      { id: '2', likes: [{ count: 5 }] },
    ])
    setMockQuery(q)
    const result = await getCogImages({ sortBy: 'like_count' })
    expect(result.data[0].id).toBe('2')
  })
})

describe('getCogImage', () => {
  it('queries single cog_image by id', async () => {
    const q = createQueryMock({ id: '123' })
    setMockQuery(q)
    await getCogImage('123')
    expect(mockSupabase.from).toHaveBeenCalledWith('cog_images')
    expect(q.eq).toHaveBeenCalledWith('id', '123')
  })
})

describe('deleteCogImage', () => {
  it('deletes cog_image by id', async () => {
    const q = createQueryMock(null)
    setMockQuery(q)
    await deleteCogImage('123')
    expect(mockSupabase.from).toHaveBeenCalledWith('cog_images')
    expect(q.delete).toHaveBeenCalled()
    expect(q.eq).toHaveBeenCalledWith('id', '123')
  })
})

describe('extractCogMetadata', () => {
  it('extracts CRS, bands, bbox, and dimensions from tiff', async () => {
    const mockImage = {
      getGeoKeys: () => ({ ProjectedCSTypeGeoKey: 32615 }),
      getBoundingBox: () => [100, 200, 300, 400],
      getWidth: () => 4096,
      getHeight: () => 2048,
      getFileDirectory: () => ({}),
    }
    const mockTiff = { getImage: vi.fn().mockResolvedValue(mockImage) }
    mockDetectBands.mockResolvedValue({ type: 'rgb', bands: [1, 2, 3] })

    const result = await extractCogMetadata(mockTiff)
    expect(result.crs).toBe('EPSG:32615')
    expect(result.bands).toEqual([1, 2, 3])
    expect(result.bandType).toBe('rgb')
    expect(result.bbox).toEqual([100, 200, 300, 400])
    expect(result.width).toBe(4096)
    expect(result.height).toBe(2048)
  })

  it('falls back to GeographicTypeGeoKey', async () => {
    const mockImage = {
      getGeoKeys: () => ({ GeographicTypeGeoKey: 4326 }),
      getBoundingBox: () => [0, 0, 1, 1],
      getWidth: () => 256,
      getHeight: () => 256,
      getFileDirectory: () => ({}),
    }
    const mockTiff = { getImage: vi.fn().mockResolvedValue(mockImage) }
    mockDetectBands.mockResolvedValue({ type: 'gray', bands: [1] })

    const result = await extractCogMetadata(mockTiff)
    expect(result.crs).toBe('EPSG:4326')
  })

  it('defaults to EPSG:4326 when no geo keys', async () => {
    const mockImage = {
      getGeoKeys: () => ({}),
      getBoundingBox: () => [0, 0, 1, 1],
      getWidth: () => 256,
      getHeight: () => 256,
      getFileDirectory: () => ({}),
    }
    const mockTiff = { getImage: vi.fn().mockResolvedValue(mockImage) }
    mockDetectBands.mockResolvedValue({ type: 'gray', bands: [1] })

    const result = await extractCogMetadata(mockTiff)
    expect(result.crs).toBe('EPSG:4326')
  })

  it('extracts date from GDAL_METADATA TIFFTAG_DATETIME', async () => {
    const mockImage = {
      getGeoKeys: () => ({}),
      getBoundingBox: () => [0, 0, 1, 1],
      getWidth: () => 256,
      getHeight: () => 256,
      getFileDirectory: () => ({
        GDAL_METADATA: '<Item name="TIFFTAG_DATETIME">2023:06:15 10:30:00</Item>',
      }),
    }
    const mockTiff = { getImage: vi.fn().mockResolvedValue(mockImage) }
    mockDetectBands.mockResolvedValue({ type: 'gray', bands: [1] })

    const result = await extractCogMetadata(mockTiff)
    expect(result.captured_at).toBe('2023-06-15T00:00:00.000Z')
  })

  it('extracts date from GDAL_METADATA ACQUISITIONDATETIME', async () => {
    const mockImage = {
      getGeoKeys: () => ({}),
      getBoundingBox: () => [0, 0, 1, 1],
      getWidth: () => 256,
      getHeight: () => 256,
      getFileDirectory: () => ({
        GDAL_METADATA: '<Item name="ACQUISITIONDATETIME">2024-03-20T12:00:00</Item>',
      }),
    }
    const mockTiff = { getImage: vi.fn().mockResolvedValue(mockImage) }
    mockDetectBands.mockResolvedValue({ type: 'gray', bands: [1] })

    const result = await extractCogMetadata(mockTiff)
    expect(result.captured_at).toBe('2024-03-20T00:00:00.000Z')
  })

  it('extracts date from FileDirectory DateTime', async () => {
    const mockImage = {
      getGeoKeys: () => ({}),
      getBoundingBox: () => [0, 0, 1, 1],
      getWidth: () => 256,
      getHeight: () => 256,
      getFileDirectory: () => ({ DateTime: '2022:11:05 08:00:00' }),
    }
    const mockTiff = { getImage: vi.fn().mockResolvedValue(mockImage) }
    mockDetectBands.mockResolvedValue({ type: 'gray', bands: [1] })

    const result = await extractCogMetadata(mockTiff)
    expect(result.captured_at).toBe('2022-11-05T00:00:00.000Z')
  })

  it('extracts date from URL as fallback', async () => {
    const mockImage = {
      getGeoKeys: () => ({}),
      getBoundingBox: () => [0, 0, 1, 1],
      getWidth: () => 256,
      getHeight: () => 256,
      getFileDirectory: () => ({}),
    }
    const mockTiff = { getImage: vi.fn().mockResolvedValue(mockImage) }
    mockDetectBands.mockResolvedValue({ type: 'gray', bands: [1] })

    const result = await extractCogMetadata(mockTiff, 'https://example.com/2023-08-15_scene.tif')
    expect(result.captured_at).toBe('2023-08-15T00:00:00.000Z')
  })

  it('extracts YYYYMMDD date from URL', async () => {
    const mockImage = {
      getGeoKeys: () => ({}),
      getBoundingBox: () => [0, 0, 1, 1],
      getWidth: () => 256,
      getHeight: () => 256,
      getFileDirectory: () => ({}),
    }
    const mockTiff = { getImage: vi.fn().mockResolvedValue(mockImage) }
    mockDetectBands.mockResolvedValue({ type: 'gray', bands: [1] })

    const result = await extractCogMetadata(mockTiff, 'https://example.com/T32TQM_20230615_B04.tif')
    expect(result.captured_at).toBe('2023-06-15T00:00:00.000Z')
  })

  it('returns null captured_at when no date found', async () => {
    const mockImage = {
      getGeoKeys: () => ({}),
      getBoundingBox: () => [0, 0, 1, 1],
      getWidth: () => 256,
      getHeight: () => 256,
      getFileDirectory: () => ({}),
    }
    const mockTiff = { getImage: vi.fn().mockResolvedValue(mockImage) }
    mockDetectBands.mockResolvedValue({ type: 'gray', bands: [1] })

    const result = await extractCogMetadata(mockTiff, 'https://example.com/scene.tif')
    expect(result.captured_at).toBeNull()
  })
})

describe('generateThumbnail', () => {
  function mockCanvas() {
    const imgData = { data: new Uint8ClampedArray(128 * 128 * 4) }
    const ctx = {
      createImageData: vi.fn().mockReturnValue(imgData),
      putImageData: vi.fn(),
    }
    const canvas = {
      width: 0, height: 0,
      getContext: vi.fn().mockReturnValue(ctx),
      toDataURL: vi.fn().mockReturnValue('data:image/png;base64,fake'),
    }
    // Mock document.createElement only for 'canvas'
    const origCreate = globalThis.document?.createElement
    globalThis.document = globalThis.document || {}
    globalThis.document.createElement = (tag) => {
      if (tag === 'canvas') return canvas
      return origCreate?.(tag)
    }
    return { canvas, ctx, imgData }
  }

  it('generates thumbnail from RGB tiff', async () => {
    mockCanvas()
    const rasters = [
      new Float32Array([0, 100, 200, 255]),
      new Float32Array([0, 50, 150, 200]),
      new Float32Array([10, 20, 30, 40]),
    ]
    const mockImage = {
      getWidth: () => 2,
      getHeight: () => 2,
      readRasters: vi.fn().mockResolvedValue(rasters),
    }
    const mockTiff = {
      getImageCount: vi.fn().mockResolvedValue(1),
      getImage: vi.fn().mockResolvedValue(mockImage),
    }

    const result = await generateThumbnail(mockTiff)
    expect(result).toBe('data:image/png;base64,fake')
  })

  it('uses smallest overview when multiple images', async () => {
    mockCanvas()
    const rasters = [new Float32Array([0, 255])]
    const bigImage = { getWidth: () => 4096, getHeight: () => 4096, readRasters: vi.fn().mockResolvedValue(rasters) }
    const smallImage = { getWidth: () => 2, getHeight: () => 1, readRasters: vi.fn().mockResolvedValue(rasters) }
    const mockTiff = {
      getImageCount: vi.fn().mockResolvedValue(3),
      getImage: vi.fn().mockImplementation((i) => Promise.resolve(i === 2 ? smallImage : bigImage)),
    }

    await generateThumbnail(mockTiff)
    // Should read from the last (smallest) image
    expect(smallImage.readRasters).toHaveBeenCalled()
  })

  it('returns null on error', async () => {
    const mockTiff = {
      getImageCount: vi.fn().mockRejectedValue(new Error('fail')),
    }
    const result = await generateThumbnail(mockTiff)
    expect(result).toBeNull()
  })

  it('handles grayscale (single band) tiff', async () => {
    mockCanvas()
    const rasters = [new Float32Array([0, 128, 255, 50])]
    const mockImage = {
      getWidth: () => 2,
      getHeight: () => 2,
      readRasters: vi.fn().mockResolvedValue(rasters),
    }
    const mockTiff = {
      getImageCount: vi.fn().mockResolvedValue(1),
      getImage: vi.fn().mockResolvedValue(mockImage),
    }

    const result = await generateThumbnail(mockTiff)
    expect(result).toBe('data:image/png;base64,fake')
  })
})
