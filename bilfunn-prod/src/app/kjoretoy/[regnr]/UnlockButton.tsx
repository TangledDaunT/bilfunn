"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function UnlockButton({ plate, label }: { plate: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn block lg"
      style={{ marginTop: 14 }}
      disabled={busy}
      onClick={() => {
        setBusy(true);
        router.push(`/kasse?nr=${plate}`);
      }}
    >
      {busy ? <span className="spinner" /> : null} {label}
    </button>
  );
}
