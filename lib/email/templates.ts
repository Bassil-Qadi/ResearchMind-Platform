import { appUrl } from '@/lib/email/client'
import { PLATFORM } from '@/lib/brand'

export interface EmailContent {
  subject: string
  html:    string
  text:    string
}

/** Escape anything that came from a user before it goes into the HTML body. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface LayoutOptions {
  heading: string
  /** Already-escaped HTML paragraphs. */
  body:    string
  cta?:    { label: string; href: string }
  footer?: string
}

function layout({ heading, body, cta, footer }: LayoutOptions): string {
  const button = cta
    ? `<tr><td style="padding:8px 0 24px;">
         <a href="${cta.href}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 20px;border-radius:10px;">${esc(cta.label)}</a>
       </td></tr>`
    : ''

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f7f9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;border:1px solid #e6e8eb;padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2933;">
        <tr><td style="font-size:13px;font-weight:600;color:#6b7280;letter-spacing:0.04em;text-transform:uppercase;padding-bottom:16px;">${esc(PLATFORM.name)}</td></tr>
        <tr><td style="font-size:20px;font-weight:700;line-height:1.35;padding-bottom:12px;">${esc(heading)}</td></tr>
        <tr><td style="font-size:15px;line-height:1.6;color:#3f4a56;padding-bottom:20px;">${body}</td></tr>
        ${button}
        <tr><td style="font-size:12px;line-height:1.6;color:#9aa3ad;border-top:1px solid #eceef0;padding-top:16px;">
          ${esc(footer ?? `You are receiving this because you have an account on ${PLATFORM.name}.`)}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function p(text: string): string {
  return `<p style="margin:0 0 12px;">${esc(text)}</p>`
}

// ---------------------------------------------------------------------------

export function registrationReceived(name: string): EmailContent {
  const lines = [
    `Hi ${name},`,
    `Thanks for requesting access to ${PLATFORM.name}. An administrator will review your registration shortly.`,
    'You will get another email as soon as your account is approved. You will not be able to sign in until then.',
  ]

  return {
    subject: 'We received your registration',
    html: layout({
      heading: 'Registration received',
      body:    lines.map(p).join(''),
    }),
    text: lines.join('\n\n'),
  }
}

export function registrationPendingForAdmins(
  applicantName: string,
  applicantEmail: string,
  department: string,
  role: string
): EmailContent {
  const lines = [
    `${applicantName} (${applicantEmail}) has requested access.`,
    `Role: ${role} · Department: ${department}`,
    'Review the request in the admin area to approve or decline it.',
  ]

  return {
    subject: `New access request from ${applicantName}`,
    html: layout({
      heading: 'A new registration needs review',
      body:    lines.map(p).join(''),
      cta:     { label: 'Review requests', href: `${appUrl()}/admin` },
      footer:  'You are receiving this because you are an administrator.',
    }),
    text: `${lines.join('\n\n')}\n\n${appUrl()}/admin`,
  }
}

export function registrationApproved(name: string): EmailContent {
  const lines = [
    `Hi ${name},`,
    'Your account has been approved. You can now sign in and start collaborating.',
  ]

  return {
    subject: 'Your account has been approved',
    html: layout({
      heading: 'You are in',
      body:    lines.map(p).join(''),
      cta:     { label: 'Sign in', href: `${appUrl()}/login` },
    }),
    text: `${lines.join('\n\n')}\n\n${appUrl()}/login`,
  }
}

export function registrationRejected(name: string, reason?: string): EmailContent {
  const lines = [
    `Hi ${name},`,
    'Your registration was not approved.',
    ...(reason ? [`Reason: ${reason}`] : []),
    'If you believe this is a mistake, please contact your university administrator.',
  ]

  return {
    subject: 'About your registration',
    html: layout({
      heading: 'Registration not approved',
      body:    lines.map(p).join(''),
    }),
    text: lines.join('\n\n'),
  }
}

export function projectInvitation(
  inviterName: string,
  projectTitle: string,
  projectId: string,
  role: string
): EmailContent {
  const lines = [
    `${inviterName} added you to "${projectTitle}" as ${role}.`,
    'You now have access to the project discussion, tasks and files.',
  ]

  return {
    subject: `You were added to "${projectTitle}"`,
    html: layout({
      heading: 'You joined a project',
      body:    lines.map(p).join(''),
      cta:     { label: 'Open project', href: `${appUrl()}/projects/${projectId}` },
    }),
    text: `${lines.join('\n\n')}\n\n${appUrl()}/projects/${projectId}`,
  }
}

export function joinRequestReceived(
  applicantName: string,
  projectTitle: string,
  projectId: string,
  message?: string
): EmailContent {
  const lines = [
    `${applicantName} asked to join "${projectTitle}".`,
    ...(message ? [`They wrote: "${message}"`] : []),
  ]

  return {
    subject: `${applicantName} asked to join "${projectTitle}"`,
    html: layout({
      heading: 'New request to join',
      body:    lines.map(p).join(''),
      cta:     { label: 'Review request', href: `${appUrl()}/projects/${projectId}` },
      footer:  'You are receiving this because you lead this project.',
    }),
    text: `${lines.join('\n\n')}\n\n${appUrl()}/projects/${projectId}`,
  }
}

export function joinRequestApproved(
  projectTitle: string,
  projectId: string,
  role: string
): EmailContent {
  const lines = [
    `Your request to join "${projectTitle}" was approved.`,
    `You joined as ${role}.`,
  ]

  return {
    subject: `You joined "${projectTitle}"`,
    html: layout({
      heading: 'Request approved',
      body:    lines.map(p).join(''),
      cta:     { label: 'Open project', href: `${appUrl()}/projects/${projectId}` },
    }),
    text: `${lines.join('\n\n')}\n\n${appUrl()}/projects/${projectId}`,
  }
}

export function joinRequestDeclined(
  projectTitle: string,
  reason?: string
): EmailContent {
  const lines = [
    `Your request to join "${projectTitle}" was not approved.`,
    ...(reason ? [`Reason: ${reason}`] : []),
    'You are welcome to apply again later, or explore other projects looking for collaborators.',
  ]

  return {
    subject: `About your request to join "${projectTitle}"`,
    html: layout({
      heading: 'Request declined',
      body:    lines.map(p).join(''),
      cta:     { label: 'Browse projects', href: `${appUrl()}/projects` },
    }),
    text: `${lines.join('\n\n')}\n\n${appUrl()}/projects`,
  }
}

export function accountSuspended(name: string, reason?: string): EmailContent {
  const lines = [
    `Hi ${name},`,
    `Your access to ${PLATFORM.name} has been suspended by an administrator.`,
    ...(reason ? [`Reason: ${reason}`] : []),
    'If you think this is a mistake, please contact your university administrator.',
  ]

  return {
    subject: 'Your account has been suspended',
    html: layout({
      heading: 'Account suspended',
      body:    lines.map(p).join(''),
    }),
    text: lines.join('\n\n'),
  }
}

export function accountReinstated(name: string): EmailContent {
  const lines = [
    `Hi ${name},`,
    'Your access has been restored. You can sign in again as normal.',
  ]

  return {
    subject: 'Your account has been restored',
    html: layout({
      heading: 'Welcome back',
      body:    lines.map(p).join(''),
      cta:     { label: 'Sign in', href: `${appUrl()}/login` },
    }),
    text: `${lines.join('\n\n')}\n\n${appUrl()}/login`,
  }
}

export function passwordResetRequested(name: string, url: string, ttlMinutes: number): EmailContent {
  const lines = [
    `Hi ${name},`,
    `Someone asked to reset the password for your ${PLATFORM.name} account. Use the link below to choose a new one. It expires in ${ttlMinutes} minutes and works once.`,
    'If this was not you, you can ignore this email — your password has not changed.',
  ]

  return {
    subject: 'Reset your password',
    html: layout({
      heading: 'Reset your password',
      body:    lines.map(p).join(''),
      cta:     { label: 'Choose a new password', href: url },
    }),
    text: `${lines.join('\n\n')}\n\n${url}`,
  }
}

export function passwordChanged(name: string): EmailContent {
  const lines = [
    `Hi ${name},`,
    'Your password has been changed, and anyone who was signed in with the old one has been signed out.',
    'If this was not you, contact an administrator straight away — whoever did it has access to your email.',
  ]

  return {
    subject: 'Your password was changed',
    html: layout({
      heading: 'Password changed',
      body:    lines.map(p).join(''),
      cta:     { label: 'Sign in', href: `${appUrl()}/login` },
    }),
    text: `${lines.join('\n\n')}\n\n${appUrl()}/login`,
  }
}
