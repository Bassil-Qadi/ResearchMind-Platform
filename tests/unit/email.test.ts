import { describe, expect, it } from 'vitest'
import { isDeliverable, isEmailConfigured, sendEmail } from '@/lib/email/client'
import {
  joinRequestApproved, joinRequestDeclined, joinRequestReceived,
  projectInvitation, registrationApproved, registrationPendingForAdmins,
  registrationReceived, registrationRejected,
} from '@/lib/email/templates'

const everyTemplate = () => [
  registrationReceived('Ada Lovelace'),
  registrationPendingForAdmins('Ada Lovelace', 'ada@university.edu', 'Maths', 'Student'),
  registrationApproved('Ada Lovelace'),
  registrationRejected('Ada Lovelace', 'Not this term'),
  projectInvitation('Grace Hopper', 'Compilers', 'abc123', 'contributor'),
  joinRequestReceived('Ada Lovelace', 'Compilers', 'abc123', 'Please!'),
  joinRequestApproved('Compilers', 'abc123', 'contributor'),
  joinRequestDeclined('Compilers', 'Not this term'),
]

describe('email templates', () => {
  it('every template has a subject and both bodies', () => {
    for (const mail of everyTemplate()) {
      expect(mail.subject.length).toBeGreaterThan(0)
      expect(mail.html).toContain('<html>')
      expect(mail.text.length).toBeGreaterThan(0)
    }
  })

  it('escapes user-supplied text before it reaches the HTML body', () => {
    const nasty = '<script>alert(1)</script>'

    const mail = registrationReceived(nasty)
    expect(mail.html).not.toContain('<script>')
    expect(mail.html).toContain('&lt;script&gt;')
  })

  it('escapes project titles and free-text messages too', () => {
    const mail = joinRequestReceived(
      'Ada "The Enchantress" Lovelace',
      '<b>Compilers</b>',
      'abc123',
      "It's <em>urgent</em> & important"
    )

    expect(mail.html).not.toMatch(/<b>Compilers<\/b>/)
    expect(mail.html).not.toMatch(/<em>urgent<\/em>/)
    expect(mail.html).toContain('&amp;')
  })

  it('links back into the app rather than nowhere', () => {
    const mail = projectInvitation('Grace', 'Compilers', 'abc123', 'contributor')
    expect(mail.html).toContain('/projects/abc123')
    expect(mail.text).toContain('/projects/abc123')
  })

  it('includes a decline reason when one is given, and reads fine without one', () => {
    expect(joinRequestDeclined('Compilers', 'No funding').text).toContain('No funding')
    expect(joinRequestDeclined('Compilers').text).not.toMatch(/reason:/i)
  })
})

describe('sendEmail', () => {
  it('reports that it is unconfigured instead of throwing', async () => {
    expect(isEmailConfigured()).toBe(false)

    // Registration and approval both call this; a mail failure must never turn
    // a completed action into an error.
    await expect(
      sendEmail({ to: 'x@university.edu', subject: 's', html: '<p>h</p>', text: 't' })
    ).resolves.toMatchObject({ sent: false })
  })

  it('refuses politely when there is nobody to send to', async () => {
    process.env.RESEND_API_KEY = 're_test_key'

    await expect(
      sendEmail({ to: [], subject: 's', html: '<p>h</p>', text: 't' })
    ).resolves.toMatchObject({ sent: false, reason: 'No recipients' })

    delete process.env.RESEND_API_KEY
  })

  it('never sends to reserved domains, which is what keeps demo data from mailing real people', async () => {
    process.env.RESEND_API_KEY = 're_test_key'

    // Returns before any request is made, so no network is involved.
    await expect(
      sendEmail({ to: ['sara.haddad@yu-demo.test', 'x@site.example'], subject: 's', html: '<p>h</p>', text: 't' })
    ).resolves.toMatchObject({ sent: false, reason: 'No deliverable recipients' })

    delete process.env.RESEND_API_KEY
  })
})

describe('isDeliverable', () => {
  it('rejects the reserved top-level domains and accepts real ones', () => {
    expect(isDeliverable('a@yu-demo.test')).toBe(false)
    expect(isDeliverable('a@foo.EXAMPLE')).toBe(false)
    expect(isDeliverable('a@x.invalid')).toBe(false)
    expect(isDeliverable('a@dev.localhost ')).toBe(false)

    expect(isDeliverable('lina@yu.edu.jo')).toBe(true)
    expect(isDeliverable('someone@gmail.com')).toBe(true)
    // Only the final label counts: "test" elsewhere in the address is fine.
    expect(isDeliverable('test@testing.com')).toBe(true)
  })
})
