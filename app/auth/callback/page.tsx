"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Confirming your email and securing your session…");

  useEffect(() => {
    let active = true;
    async function completeSignIn() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const next = url.searchParams.get("next") || "/";
      const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
      if (!code) {
        if (active) {
          setMessage("The confirmation link is incomplete or has expired. Please sign in again.");
          window.setTimeout(() => router.replace("/login?error=confirmation"), 1800);
        }
        return;
      }
      const { error } = await createClient().auth.exchangeCodeForSession(code);
      if (error) {
        if (active) {
          setMessage(error.message);
          window.setTimeout(() => router.replace("/login?error=confirmation"), 2200);
        }
        return;
      }
      if (active) router.replace(safeNext);
    }
    void completeSignIn();
    return () => { active = false; };
  }, [router]);

  return <main className="boot-screen"><div className="boot-mark">CT</div><div className="boot-title">CLETUS TECH WORKSPACE</div><div className="boot-line" /><p>{message}</p></main>;
}
