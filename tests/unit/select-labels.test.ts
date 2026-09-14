import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Every select must have a name a screen reader can announce.
 *
 * A Radix SelectTrigger is a button, so a <Label> beside it names it only when
 * the label's htmlFor points at the trigger's id. Twelve of them once had a
 * visible label that named nothing. This reads the source rather than
 * rendering, so it covers screens too heavy to mount in a test.
 */

const ROOT = path.resolve(__dirname, '../..')

function tsxFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return tsxFiles(full)
    return entry.name.endsWith('.tsx') ? [full] : []
  })
}

interface Trigger { file: string; line: number; attrs: string; source: string }

function triggers(): Trigger[] {
  return ['app', 'components'].flatMap((dir) => tsxFiles(path.join(ROOT, dir))).flatMap((file) => {
    const source = fs.readFileSync(file, 'utf8')
    // Attributes never contain ">" in these tags, so this finds the whole opening tag.
    return Array.from(source.matchAll(/<SelectTrigger\b([^>]*)>/g), (m) => ({
      file:  path.relative(ROOT, file).split(path.sep).join('/'),
      line:  source.slice(0, m.index).split('\n').length,
      attrs: m[1],
      source,
    }))
  })
}

describe('select labels', () => {
  const all = triggers()

  it('finds the selects it is meant to check', () => {
    expect(all.length).toBeGreaterThanOrEqual(19)
  })

  it('gives every select an accessible name', () => {
    const unnamed = all
      .filter((t) => !/\b(id|aria-label|aria-labelledby)=/.test(t.attrs))
      .map((t) => `${t.file}:${t.line}`)

    expect(unnamed).toEqual([])
  })

  it('points a label at every literal select id', () => {
    const orphaned = all.flatMap((t) => {
      const id = t.attrs.match(/\bid="([^"]+)"/)?.[1]
      return id && !t.source.includes(`htmlFor="${id}"`) ? [`${t.file}:${t.line} (#${id})`] : []
    })

    expect(orphaned).toEqual([])
  })
})
