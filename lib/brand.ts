/**
 * ResearchMind — the one place the platform is named. Copy that mentions it
 * should read from here, so a rename is one edit rather than a hunt through
 * thirty files.
 *
 * The platform serves any university or research organisation, so nothing here
 * names an institution; pages say "your institution" instead.
 */
export const PLATFORM = {
  /** Full name, for page titles, emails and footers. */
  name:    'ResearchMind',
  /** The second line under the logo, where space is tight. */
  short:   'Research Collaboration',
  tagline: 'Research collaboration for universities and research teams',
  website: 'https://researchmind.live',
} as const

/** A sample address for input placeholders. */
export const EMAIL_PLACEHOLDER = 'you@university.edu'
