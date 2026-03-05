import { describe, it, expect } from 'vitest'
import { parseTags } from '../../src/tags.js'

describe('parseTags', () => {
  it('parses space-separated hashtags', () => {
    expect(parseTags('#sentinel #landsat')).toEqual(['sentinel', 'landsat'])
  })

  it('parses comma-separated tags', () => {
    expect(parseTags('sentinel,landsat')).toEqual(['sentinel', 'landsat'])
  })

  it('handles mixed separators', () => {
    expect(parseTags('#sentinel, #landsat #sar')).toEqual(['sentinel', 'landsat', 'sar'])
  })

  it('strips # prefix', () => {
    expect(parseTags('#tag1 #tag2')).toEqual(['tag1', 'tag2'])
  })

  it('filters empty strings', () => {
    expect(parseTags('  ,  , ')).toEqual([])
  })

  it('returns empty array for null/undefined/empty', () => {
    expect(parseTags(null)).toEqual([])
    expect(parseTags(undefined)).toEqual([])
    expect(parseTags('')).toEqual([])
  })

  it('handles tags without # prefix', () => {
    expect(parseTags('forest urban water')).toEqual(['forest', 'urban', 'water'])
  })
})
