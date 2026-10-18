"use client";
import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { isAllowedCrmRoute } from "../lib/crmBoundary.mjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);
const PUBLIC = new Set(["/", "/reset-password"]);

export default function CrmBoundaryGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    let active = true;
    async function check() {
      setAllowed(false);
      if (PUBLIC.has(pathname)) {
        if (active) setAllowed(true);
        return;
      }
      const { data: identity, error } = await supabase.auth.getUser();
      if (error || !identity.user) { router.replace("/"); return; }
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles").select("role,is_active").eq("id",identity.user.id).single();
      if (profileError || !profile?.is_active || !isAllowedCrmRoute(pathname,profile.role || "")) {
        if (profile?.is_active && isAllowedCrmRoute("/dashboard",profile.role || "")) {
          router.replace("/dashboard");
        } else {
          await supabase.auth.signOut();
          router.replace("/");
        }
        return;
      }
      if (active) setAllowed(true);
    }
    void check();
    return () => { active = false; };
  }, [pathname,router]);
  return allowed ? <>{children}</> : <div style={{minHeight:"100vh",display:"grid",placeItems:"center"}}>Checking Orbit CRM access...</div>;
}
