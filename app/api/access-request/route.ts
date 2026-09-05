import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const DEFAULT_RECIPIENTS = [
  "azhar@igebra.ai",
];

const ALLOWED_ROLES = [
  "Admin",
  "Sales Admin",
  "Marketing",
  "Trainer",
  "Finance Admin",
];

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const fullName = String(body?.full_name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const requestedRole = String(body?.requested_role || "").trim();

    if (!fullName || !email || !requestedRole) {
      return NextResponse.json(
        { ok: false, message: "Name, email and role are required." },
        { status: 400 }
      );
    }

    if (!ALLOWED_ROLES.includes(requestedRole)) {
      return NextResponse.json(
        { ok: false, message: "Invalid requested role." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { ok: false, message: "Orbit database configuration is missing." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { error } = await supabase.rpc("submit_access_request", {
      p_full_name: fullName,
      p_email: email,
      p_requested_role: requestedRole,
    });

    if (error) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        ok: true,
        emailSent: false,
        message:
          "Access request submitted. Admin email notification is not configured yet.",
      });
    }

    const recipients = (
      process.env.ORBIT_ACCESS_NOTIFY_EMAILS || DEFAULT_RECIPIENTS.join(",")
    )
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const origin =
      request.headers.get("origin") ||
      `https://${request.headers.get("host") || "orbit-crm-lms.vercel.app"}`;

    const accessUrl = `${origin}/access`;
    const sender =
      process.env.ORBIT_EMAIL_FROM || "Orbit <orbit@igebra.ai>";

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: sender,
        to: recipients,
        reply_to: email,
        subject: `New Orbit Access Request — ${fullName}`,
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.55;color:#173637">
            <h2 style="margin-bottom:8px">New Orbit Access Request</h2>
            <p style="margin-top:0">A new user has requested access to Orbit.</p>
            <table style="border-collapse:collapse;margin:18px 0">
              <tr>
                <td style="padding:6px 16px 6px 0"><strong>Name</strong></td>
                <td>${escapeHtml(fullName)}</td>
              </tr>
              <tr>
                <td style="padding:6px 16px 6px 0"><strong>Email</strong></td>
                <td>${escapeHtml(email)}</td>
              </tr>
              <tr>
                <td style="padding:6px 16px 6px 0"><strong>Requested Role</strong></td>
                <td>${escapeHtml(requestedRole)}</td>
              </tr>
            </table>
            <p>
              <a href="${accessUrl}"
                 style="display:inline-block;background:#558C89;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:700">
                Review in Orbit
              </a>
            </p>
            <p style="font-size:12px;color:#6B7280;margin-top:22px">
              Open Orbit → Access to approve or reject this request.
            </p>
          </div>
        `,
      }),
    });

    if (!resendResponse.ok) {
      const detail = await resendResponse.text();
      console.error("Orbit access notification email failed:", detail);

      return NextResponse.json({
        ok: true,
        emailSent: false,
        message:
          "Access request submitted, but the admin notification email could not be sent.",
      });
    }

    return NextResponse.json({
      ok: true,
      emailSent: true,
      message: "Access request submitted successfully.",
    });
  } catch (error) {
    console.error("Orbit access request error:", error);

    return NextResponse.json(
      { ok: false, message: "Could not submit the access request." },
      { status: 500 }
    );
  }
}
