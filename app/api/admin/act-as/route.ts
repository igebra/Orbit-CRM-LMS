import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function authorize(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!token) return null;
  if (!url || !publishable || !secret) throw new Error("Support configuration missing");
  const auth = createClient(url, publishable, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) return null;
  const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profile, error: profileError } = await db.from("user_profiles").select("role,is_active").eq("id", data.user.id).single();
  if (profileError || profile?.role !== "super_admin" || profile.is_active !== true) return null;
  return { db, actor: data.user.id };
}

// Foundation only: deliberately disabled until the target-scoped read gateway is verified.
export async function POST(request: Request) {
  try {
    const access = await authorize(request);
    if (!access) return reply({ error: "Forbidden" }, 403);
    return reply({ error: "Support mode is not enabled; read-only permission gateway pending." }, 503);
  } catch {
    return reply({ error: "Support service unavailable" }, 503);
  }
}

export async function DELETE(request: Request) {
  try {
    const access = await authorize(request);
    if (!access) return reply({ error: "Forbidden" }, 403);
    const body = await request.json().catch(() => null);
    if (typeof body?.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id)) return reply({ error: "Invalid session" }, 400);
    const { error } = await access.db.from("orbit_support_sessions").update({ ended_at: new Date().toISOString() }).eq("id", body.id).eq("actor_id", access.actor).is("ended_at", null);
    if (error) return reply({ error: "Unable to end session" }, 503);
    return reply({ ok: true });
  } catch {
    return reply({ error: "Support service unavailable" }, 503);
  }
}
