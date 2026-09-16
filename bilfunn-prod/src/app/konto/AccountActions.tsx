"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AccountActions({ status, onlyDelete = false }: { status: string | null; onlyDelete?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState<null | "cancel" | "delete">(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const cancellable = status === "TRIALING" || status === "ACTIVE" || status === "PAST_DUE";

  async function confirmCancel() {
    setBusy(true);
    const res = await fetch("/api/subscription/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    setBusy(false);
    setOpen(null);
    if (res.ok) {
      setMsg("Abonnementet er sagt opp. Du beholder tilgangen ut perioden.");
      router.refresh();
    } else setMsg("Kunne ikke si opp akkurat nå. Kontakt support hvis det gjentar seg.");
  }

  async function resume() {
    setBusy(true);
    await fetch("/api/subscription/cancel", { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  async function confirmDelete() {
    setBusy(true);
    const res = await fetch("/api/account/delete", { method: "POST" });
    setBusy(false);
    if (res.ok) {
      router.push("/");
      router.refresh();
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  if (onlyDelete) {
    return (
      <>
        <button className="btn sm danger" onClick={() => setOpen("delete")}>
          Slett kontoen min
        </button>
        {open === "delete" && (
          <Dialog
            title="Slette kontoen?"
            body="Abonnementet avsluttes, og søkehistorikken din slettes. Dette kan ikke angres."
            confirmLabel="Slett kontoen"
            danger
            busy={busy}
            onCancel={() => setOpen(null)}
            onConfirm={confirmDelete}
          />
        )}
      </>
    );
  }

  return (
    <>
      {msg && (
        <div className="note ok" style={{ margin: "14px 0" }}>
          {msg}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
        {cancellable && (
          <button className="btn sm danger" onClick={() => setOpen("cancel")}>
            Si opp abonnementet
          </button>
        )}
        {status === "CANCELED" && (
          <button className="btn sm" onClick={resume} disabled={busy}>
            Gjenoppta abonnementet
          </button>
        )}
        <button className="btn sm ghost" onClick={logout}>
          Logg ut
        </button>
      </div>

      {open === "cancel" && (
        <Dialog
          title="Si opp abonnementet"
          body="Vi stopper alle framtidige trekk med én gang. Du beholder tilgangen ut perioden du har betalt for."
          confirmLabel="Bekreft oppsigelse"
          danger
          busy={busy}
          onCancel={() => setOpen(null)}
          onConfirm={confirmCancel}
        >
          <div className="field" style={{ marginTop: 14 }}>
            <label className="f" htmlFor="reason">
              Hvorfor sier du opp? (valgfritt)
            </label>
            <select className="input" id="reason" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">Velg en grunn</option>
              <option>Jeg fant informasjonen jeg trengte</option>
              <option>For dyrt</option>
              <option>Manglet opplysninger jeg forventet</option>
              <option>Jeg forsto ikke at det var et abonnement</option>
              <option>Annet</option>
            </select>
          </div>
        </Dialog>
      )}
    </>
  );
}

function Dialog({
  title,
  body,
  confirmLabel,
  danger,
  busy,
  onCancel,
  onConfirm,
  children,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(8,20,38,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18, zIndex: 100 }}
      onMouseDown={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="card" style={{ width: "min(100%,440px)" }} role="dialog" aria-modal="true" aria-label={title}>
        <h2 style={{ fontSize: "1.2rem" }}>{title}</h2>
        <p className="muted small">{body}</p>
        {children}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
          <button className="btn sm ghost" onClick={onCancel}>
            Avbryt
          </button>
          <button className={`btn sm ${danger ? "danger" : ""}`} onClick={onConfirm} disabled={busy}>
            {busy ? <span className="spinner blue" /> : null} {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
