"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { readAuth } from "@/lib/auth-storage";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const auth = readAuth();
    router.replace(auth ? "/dashboard" : "/login");
  }, [router]);

  return (
    <p className="p-10 text-center text-slate-400">Đang chuyển hướng…</p>
  );
}
