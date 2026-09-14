/**
 * Where the demo lives: a separate database on the same cluster as the real
 * one. Shared by the demo seed and the local demo server so both always agree.
 */

export const DEFAULT_DEMO_DB = 'yu-demo'

/**
 * MONGODB_URI with its database swapped for the demo one.
 *
 * The name has to contain "demo". The seed wipes whatever database it is given,
 * so this is what keeps a typo from pointing it at research-platform.
 */
export function demoDatabaseUri(baseUri: string | undefined, dbName = DEFAULT_DEMO_DB): string {
  if (!baseUri) throw new Error('MONGODB_URI is not set')
  if (!/demo/i.test(dbName)) {
    throw new Error(
      `Refusing to use "${dbName}": a demo database name must contain "demo", so the real data can never be targeted.`
    )
  }

  const url = new URL(baseUri)
  url.pathname = `/${dbName}`
  return url.toString()
}
