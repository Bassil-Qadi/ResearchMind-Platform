/**
 * People's names, as the interface shows them.
 *
 * Academic names usually begin with a title: "Dr. Rana Obeidat", "Prof. Omar
 * Al-Momani". Taking the first word as the first name greeted people as
 * "Welcome back, Prof." and gave them the initials "PO", so both skip titles.
 */

const TITLES = new Set([
  'dr', 'prof', 'professor', 'eng', 'mr', 'mrs', 'ms', 'miss',
  // Arabic: د. (doctor), أ.د. (professor), م. (engineer)
  'د', 'أ.د', 'م',
])

/** The words of a name with any leading titles removed. Never removes the last word. */
function nameWords(name: string): string[] {
  const words = name.trim().split(/\s+/).filter(Boolean)
  let start = 0
  while (start < words.length - 1 && TITLES.has(words[start].replace(/\.+$/, '').toLowerCase())) {
    start++
  }
  return words.slice(start)
}

/** "Prof. Omar Al-Momani" → "Omar". Null when there is no name to use. */
export function givenName(name: string | null | undefined): string | null {
  if (!name?.trim()) return null
  return nameWords(name)[0]
}

/** "Prof. Omar Al-Momani" → "OA". */
export function initialsOf(name: string): string {
  return nameWords(name)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
