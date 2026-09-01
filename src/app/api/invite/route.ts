import { NextRequest, NextResponse } from "next/server";

function buildInviteEmailHtml(shareUrl: string): string {
  return `
<div style="background-color:#FBF6F0;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:420px;margin:0 auto;background-color:#ffffff;border-radius:24px;padding:32px 28px;text-align:center;">
    <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#fb7185;">
      My Relationship Needs
    </p>
    <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#292524;">
      I found out what I need most
    </h1>
    <p style="margin:0 0 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#57534e;">
      I just took a quick assessment on the relationship needs that matter
      most to me. Take it too, and we can compare where we differ.
    </p>
    <a href="${shareUrl}"
       style="display:inline-block;padding:14px 32px;border-radius:999px;background-color:#fb7185;background-image:linear-gradient(135deg,#fb7185 0%,#fb923c 55%,#fbbf24 100%);color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:600;text-decoration:none;">
      Take the assessment
    </a>
    <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#a8a29e;">
      Takes about 3&ndash;5 minutes. If the button doesn't work, copy this link:<br />
      <a href="${shareUrl}" style="color:#a8a29e;">${shareUrl}</a>
    </p>
  </div>
</div>`.trim();
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = body?.email;
  const shareUrl = body?.shareUrl;

  if (typeof email !== "string" || !email.includes("@") || typeof shareUrl !== "string") {
    return NextResponse.json(
      { error: "A valid email and share link are required." },
      { status: 400 }
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Email sending isn't configured yet. Add RESEND_API_KEY to your environment (see .env.local.example).",
      },
      { status: 500 }
    );
  }

  const fromAddress =
    process.env.RESEND_FROM_EMAIL || "My Relationship Needs <onboarding@resend.dev>";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress,
      to: email,
      subject: "Take the My Relationship Needs assessment?",
      html: buildInviteEmailHtml(shareUrl),
      text: `I just found out which relationship needs matter most to me — take this quick assessment and let's compare notes: ${shareUrl}`,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Resend send failed:", errorText);
    return NextResponse.json(
      { error: "The email couldn't be sent. Please try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
