/**
 * Minimal Resend integration — plain fetch call, no SDK dependency needed.
 * If RESEND_API_KEY isn't set, sendEmail logs a warning instead of throwing,
 * so the rest of the app (and the forgot-password flow's generic response)
 * keeps working even before email is configured.
 */

const isConfigured = Boolean(process.env.RESEND_API_KEY);

async function sendEmail({ to, subject, html }) {
  if (!isConfigured) {
    console.warn(`[mailer] RESEND_API_KEY not set — skipped email to ${to}: "${subject}"`);
    return { skipped: true };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'CYBN <onboarding@resend.dev>',
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Resend API error (${res.status}): ${errText}`);
  }

  return res.json();
}

module.exports = { sendEmail, isConfigured };