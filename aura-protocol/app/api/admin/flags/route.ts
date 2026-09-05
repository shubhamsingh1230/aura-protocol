import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// NOTE: swap this for a real admin/role check (e.g. a role_tag === 'ADMIN'
// column check on the caller's profile) before shipping to production.
async function assertIsAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role_tag")
    .eq("id", user.id)
    .single();

  return (profile as any)?.role_tag === "ADMIN";
}

export async function GET() {
  if (!(await assertIsAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("flags")
    .select("*, daily_logs(*)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ flags: data });
}

export async function POST(request: Request) {
  if (!(await assertIsAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { flagId, decision } = (await request.json()) as {
    flagId: string;
    decision: "approved" | "rejected";
  };

  if (!flagId || !["approved", "rejected"].includes(decision)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Uses the service role so the update bypasses RLS — the -10 Aura /
  // -10 flag_accuracy_score penalty on "rejected" is applied automatically
  // by the apply_flag_resolution() trigger in supabase/schema.sql.
  const supabase = createServiceClient();
  const { error } = await supabase.from("flags").update({ status: decision }).eq("id", flagId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
