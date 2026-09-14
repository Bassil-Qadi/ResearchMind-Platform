import { describe, expect, it } from 'vitest'
import { givenName, initialsOf } from '@/lib/names'

describe('givenName', () => {
  it('skips academic titles, with or without the dot', () => {
    // Regression: the dashboard said "Welcome back, Prof."
    expect(givenName('Prof. Omar Al-Momani')).toBe('Omar')
    expect(givenName('Dr. Rana Obeidat')).toBe('Rana')
    expect(givenName('dr rana obeidat')).toBe('rana')
    expect(givenName('Eng. Laith Bani Hani')).toBe('Laith')
  })

  it('skips Arabic titles', () => {
    expect(givenName('د. رنا عبيدات')).toBe('رنا')
    expect(givenName('أ.د. عمر المومني')).toBe('عمر')
  })

  it('leaves names without a title alone', () => {
    expect(givenName('Sara Haddad')).toBe('Sara')
    // A given name that merely starts like a title is not one.
    expect(givenName('Drew Miller')).toBe('Drew')
  })

  it('keeps the word when the name is only a title, and is null when there is no name', () => {
    expect(givenName('Dr.')).toBe('Dr.')
    expect(givenName('  ')).toBeNull()
    expect(givenName(undefined)).toBeNull()
  })
})

describe('initialsOf', () => {
  it('uses the name, not the title', () => {
    // Regression: avatars read "PO" and "DA".
    expect(initialsOf('Prof. Omar Al-Momani')).toBe('OA')
    expect(initialsOf('Dr. Ahmad Jaradat')).toBe('AJ')
  })

  it('takes at most two letters and tolerates extra spaces', () => {
    expect(initialsOf('Dr. Tariq Abu Hassan')).toBe('TA')
    expect(initialsOf('  sara   haddad ')).toBe('SH')
    expect(initialsOf('Sara')).toBe('S')
  })
})
