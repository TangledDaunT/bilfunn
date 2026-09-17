import { formatDate, formatOre } from "../money";

type Ctx = Record<string, any>;
export type EmailType =
  | "login_code"
  | "welcome"
  | "payment_receipt"
  | "subscription_started"
  | "renewal_reminder"
  | "renewal_success"
  | "payment_failed"
  | "cancellation"
  | "refund"
  | "account_deleted";

const layout = (title: string, body: string, footer = true) => `
<!doctype html><html lang="nb"><body style="margin:0;background:#eef2f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#121a26">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:#0a2a55;padding:16px 22px;color:#fff;font-weight:700;font-size:16px">Skiltnummeret.no</td></tr>
<tr><td style="padding:24px 22px">
<h1 style="margin:0 0 12px;font-size:19px">${title}</h1>${body}
</td></tr>
${
  footer
    ? `<tr><td style="padding:16px 22px;background:#f5f8fc;color:#5b6a80;font-size:12px;line-height:1.5">
Skiltnummeret.no AS · Storgata 1, 0155 Oslo · support@skiltnummeret.no<br>
Du kan administrere eller si opp abonnementet når som helst på Min side.<br>
Skiltnummeret.no er ikke eid, drevet eller godkjent av Statens vegvesen.
</td></tr>`
    : ""
}
</table></td></tr></table></body></html>`;

const p = (t: string) =>
  `<p style="margin:0 0 12px;font-size:15px;line-height:1.6">${t}</p>`;
const btn = (href: string, label: string) =>
  `<p style="margin:18px 0"><a href="${href}" style="background:#1355c6;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;font-weight:600">${label}</a></p>`;

export function renderEmail(
  type: EmailType,
  c: Ctx,
): { subject: string; html: string; text: string } {
  const kr = (o: number) => formatOre(o);
  const d = (v: any, t = false) => formatDate(v, "nb-NO", t);

  switch (type) {
    case "login_code":
      return mk(
        "Innloggingskode til Skiltnummeret.no",
        layout(
          "Logg inn",
          p(`Koden din er:`) +
            `<p style="font-size:30px;letter-spacing:.28em;font-weight:700;margin:6px 0 14px">${c.code}</p>` +
            p("Koden er gyldig i 10 minutter.") +
            (c.link ? btn(c.link, "Logg inn direkte") : "") +
            p("Har du ikke bedt om denne koden, kan du se bort fra e-posten."),
        ),
      );
    case "welcome":
      return mk(
        "Velkommen til Skiltnummeret.no",
        layout(
          "Kontoen din er klar",
          p(`Du har nå tilgang i ${c.days} dager.`) +
            btn(c.link, "Gå til Min side"),
        ),
      );
    case "payment_receipt":
      return mk(
        `Kvittering ${c.receipt} fra Skiltnummeret.no`,
        layout(
          "Kvittering",
          p(`Vi har belastet <b>${kr(c.amountOre)}</b>.`) +
            p(
              `Kvitteringsnummer: ${c.receipt}<br>Dato: ${d(c.at, true)}<br>Herav mva. 25 %: ${kr(c.vatOre)}`,
            ) +
            p("Skiltnummeret.no AS, org.nr 000 000 000 MVA"),
        ),
      );
    case "subscription_started":
      return mk(
        "Abonnementet er aktivert",
        layout(
          "Tilgangen er aktiv",
          p(`Du har tilgang til <b>${d(c.periodEnd, true)}</b>.`) +
            p(
              `Deretter fornyes abonnementet automatisk til <b>${kr(c.renewalOre)} per måned</b> inntil du sier opp.`,
            ) +
            btn(c.link, "Administrer abonnementet"),
        ),
      );
    case "renewal_reminder":
      return mk(
        "Abonnementet fornyes snart",
        layout(
          "Påminnelse før fornyelse",
          p(
            `Introduksjonsperioden avsluttes <b>${d(c.periodEnd, true)}</b>, og vi belaster da ${kr(c.renewalOre)}.`,
          ) +
            p(
              "Vil du ikke fortsette, kan du si opp selv før dette — det tar to klikk.",
            ) +
            btn(c.link, "Si opp eller behold"),
        ),
      );
    case "renewal_success":
      return mk(
        "Abonnementet er fornyet",
        layout(
          "Fornyet",
          p(
            `Vi har belastet ${kr(c.amountOre)} for perioden fram til ${d(c.periodEnd)}.`,
          ),
        ),
      );
    case "payment_failed":
      return mk(
        "Betalingen mislyktes",
        layout(
          "Vi fikk ikke gjennomført betalingen",
          p(
            `Vi prøver automatisk igjen. Oppdaterer du betalingsmåten innen <b>${d(c.graceUntil)}</b>, beholder du tilgangen.`,
          ) + btn(c.link, "Oppdater betalingsmåte"),
        ),
      );
    case "cancellation":
      return mk(
        "Oppsigelsen er registrert",
        layout(
          "Abonnementet er sagt opp",
          p(
            `Du har tilgang til <b>${d(c.until, true)}</b>. Det blir ingen flere trekk.`,
          ),
        ),
      );
    case "refund":
      return mk(
        "Refusjon utført",
        layout(
          "Refusjon",
          p(`${kr(c.amountOre)} er refundert til betalingsmåten din.`),
        ),
      );
    case "account_deleted":
      return mk(
        "Kontoen er slettet",
        layout(
          "Slettet",
          p(
            "Kontoen, søkehistorikken og kontaktopplysningene dine er slettet. Kvitteringer beholdes i regnskapet så lenge bokføringsloven krever.",
          ),
        ),
      );
  }
}

function mk(subject: string, html: string) {
  return {
    subject,
    html,
    text: html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  };
}
