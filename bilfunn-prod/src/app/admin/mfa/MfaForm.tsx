"use client";
import { clientRequest, retryMessage } from "@/lib/client-request";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function MfaForm() {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          const res = await clientRequest("/api/auth/mfa", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code }),
          });
          if (res.ok) {
            router.replace("/admin");
            router.refresh();
          } else
            setMessage(
              res.status === 429
                ? retryMessage(res)
                : "Koden er feil, eller innloggingen må bekreftes på nytt.",
            );
        } catch {
          setMessage("Prøv igjen senere.");
        }
      }}
    >
      <label htmlFor="totp">Kode fra autentiseringsappen</label>
      <input
        id="totp"
        className="input"
        required
        pattern="[0-9]{6}"
        autoComplete="one-time-code"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <button className="btn">Bekreft</button>
      <p role="alert">{message}</p>
      <a href="/logg-inn?next=/admin/mfa">Logg inn på nytt</a>
    </form>
  );
}
