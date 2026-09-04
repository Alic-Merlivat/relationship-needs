const BRAND = "My Relationship Needs";

/**
 * Absolute base URL used to build links in emails.
 *
 * Deliberately not derived from the incoming request's Host header: that
 * header is attacker-controlled, and an email is exactly the wrong place to
 * discover you've minted links pointing at someone else's domain.
 */
export function appUrl(): string {
  const configured = process.env.APP_URL;
  if (configured) return configured.replace(/\/+$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(options: {
  heading: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  footer: string;
}): string {
  const { heading, body, ctaLabel, ctaUrl, footer } = options;
  return `
<div style="background-color:#FBF6F0;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:420px;margin:0 auto;background-color:#ffffff;border-radius:24px;padding:32px 28px;text-align:center;">
    <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#fb7185;">
      ${BRAND}
    </p>
    <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#292524;">
      ${heading}
    </h1>
    <div style="margin:0 0 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#57534e;text-align:left;">
      ${body}
    </div>
    <a href="${ctaUrl}"
       style="display:inline-block;padding:14px 32px;border-radius:999px;background-color:#fb7185;background-image:linear-gradient(135deg,#fb7185 0%,#fb923c 55%,#fbbf24 100%);color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:600;text-decoration:none;">
      ${ctaLabel}
    </a>
    <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#a8a29e;">
      ${footer}<br /><br />
      If the button doesn't work, copy this link:<br />
      <a href="${ctaUrl}" style="color:#a8a29e;word-break:break-all;">${ctaUrl}</a>
    </p>
  </div>
</div>`.trim();
}

interface Message {
  subject: string;
  html: string;
  text: string;
}

const LINK_LIFETIME_NOTE =
  "This private link works for 30 days. It's yours — anyone with it can see your results, so don't forward it.";

export function resultsEmail(name: string, url: string): Message {
  return {
    subject: "Your relationship needs results",
    html: layout({
      heading: "Your results are saved",
      body: `<p style="margin:0 0 12px;">Hi ${escapeHtml(name)},</p>
<p style="margin:0;">Here's your private link back to the relationship needs that matter most to you. Open it any time to revisit what you found.</p>`,
      ctaLabel: "See my results",
      ctaUrl: url,
      footer: LINK_LIFETIME_NOTE,
    }),
    text: `Hi ${name},\n\nHere's your private link back to your relationship needs results:\n${url}\n\n${LINK_LIFETIME_NOTE}`,
  };
}

/**
 * The invitation.
 *
 * Carries no part of the inviter's results — the partner takes the
 * assessment first, and only then can either of them see the comparison.
 */
export function invitationEmail(options: {
  inviterName: string;
  inviterEmail: string;
  url: string;
}): Message {
  const { inviterName, inviterEmail, url } = options;
  const who = `${inviterName} (${inviterEmail})`;
  return {
    subject: `${inviterName} invited you to compare relationship needs`,
    html: layout({
      heading: `${escapeHtml(inviterName)} invited you`,
      body: `<p style="margin:0 0 12px;">${escapeHtml(who)} just worked out which relationship needs matter most to them, and asked to compare notes with you.</p>
<p style="margin:0 0 12px;">It's about 5 minutes of picking between two things at a time. You won't see their answers until you've finished your own.</p>
<p style="margin:0;">When you're both done, you'll each be able to see where you line up and where you differ.</p>`,
      ctaLabel: "Take the assessment",
      ctaUrl: url,
      footer:
        "This invitation expires in 30 days. If you weren't expecting it, you can ignore this email — nothing is shared unless you take part.",
    }),
    text: `${who} just worked out which relationship needs matter most to them, and asked to compare notes with you.\n\nIt takes about 5 minutes. You won't see their answers until you've finished your own.\n\n${url}\n\nThis invitation expires in 30 days. If you weren't expecting it, you can ignore this email.`,
  };
}

export function partnerCompletedEmail(options: {
  name: string;
  partnerName: string;
  url: string;
}): Message {
  const { name, partnerName, url } = options;
  return {
    subject: `${partnerName} finished their assessment`,
    html: layout({
      heading: "Your comparison is ready",
      body: `<p style="margin:0 0 12px;">Hi ${escapeHtml(name)},</p>
<p style="margin:0;">${escapeHtml(partnerName)} has finished their assessment. You can now see where your needs line up and where they differ.</p>`,
      ctaLabel: "See the comparison",
      ctaUrl: url,
      footer: LINK_LIFETIME_NOTE,
    }),
    text: `Hi ${name},\n\n${partnerName} has finished their assessment. You can now see where your needs line up and where they differ:\n${url}\n\n${LINK_LIFETIME_NOTE}`,
  };
}

export function partnerResultsEmail(options: {
  name: string;
  partnerName: string;
  url: string;
}): Message {
  const { name, partnerName, url } = options;
  return {
    subject: "Your results and comparison are ready",
    html: layout({
      heading: "Your results are saved",
      body: `<p style="margin:0 0 12px;">Hi ${escapeHtml(name)},</p>
<p style="margin:0;">Here's your private link to your own results, and to the comparison with ${escapeHtml(partnerName)}.</p>`,
      ctaLabel: "See my results",
      ctaUrl: url,
      footer: LINK_LIFETIME_NOTE,
    }),
    text: `Hi ${name},\n\nHere's your private link to your own results, and to the comparison with ${partnerName}:\n${url}\n\n${LINK_LIFETIME_NOTE}`,
  };
}

/**
 * Sends one message.
 *
 * Returns a result rather than throwing: a failed notification should never
 * roll back a completed assessment, and the caller decides what (if
 * anything) the person is told.
 */
export async function sendEmail(
  to: string,
  message: Message
): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY is not set." };

  const from =
    process.env.RESEND_FROM_EMAIL || `${BRAND} <onboarding@resend.dev>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("Resend send failed:", response.status, detail);
      return { ok: false, error: `Resend returned ${response.status}.` };
    }
    return { ok: true };
  } catch (error) {
    console.error("Resend request threw:", error);
    return { ok: false, error: "The email provider could not be reached." };
  }
}
