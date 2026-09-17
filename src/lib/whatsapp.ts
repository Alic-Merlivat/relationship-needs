/**
 * Builds a WhatsApp "click to chat" link.
 *
 * No phone number is included — the app never collects one — so this opens
 * WhatsApp with the message pre-filled and lets the person pick who to send
 * it to themselves, using WhatsApp's own contact picker. Works on both the
 * mobile app (deep link) and WhatsApp Web/Desktop, and needs no API key or
 * backend integration.
 *
 * The message carries no name: unlike an email's From line, WhatsApp already
 * shows the recipient exactly who is messaging them, so repeating it here
 * would just be noise.
 *
 * Deliberately only ever built around an *invitation* link, never a results
 * link: results stay private until the partner finishes their own
 * assessment, and a one-tap share button is not the place to make an
 * exception to that.
 */
export function whatsAppInviteUrl(inviteUrl: string): string {
  const message = [
    "Hi, I just worked out which relationship needs matter to me, and wanted to compare them with you.",
    "When you're done, we'll each be able to see where we line up and differ. Thank you",
    inviteUrl,
  ].join("\n\n");
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
