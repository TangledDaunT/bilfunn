"use strict";
/* =========================================================================
   Bilfunn — Norwegian vehicle ownership & information platform
   Working end-to-end prototype: search → preview → paywall → checkout →
   report → account → subscription lifecycle → admin.
   All data is simulated locally. No real personal data, no real payments.
   ========================================================================= */

/* ---------------------------- config ---------------------------------- */
const CFG_DEFAULT = {
  introPrice: 3,
  introDays: 3,
  renewPrice: 249,
  currency: "NOK",
  introSearchLimit: 10,
  monthlySearchLimit: 50,
  duplicatesCount: false,      // repeat lookup of same plate within 24h is free
  cancelKeepsAccess: true,     // access until end of paid period
  graceDays: 5,
  retrySchedule: [1, 3, 5],    // days after failed renewal
  reminderHoursBefore: 24,
  ipSearchesPerHour: 20,
  vatRate: 0.25
};

/* ---------------------------- storage --------------------------------- */
const KEY = "bilfunn.v1";
const blank = () => ({
  cfg: { ...CFG_DEFAULT },
  clockOffsetMs: 0,
  lang: "no",
  consent: null,            // {necessary, analytics, marketing, at}
  session: null,            // userId
  users: {},                // id -> user
  subs: {},                 // id -> subscription
  payments: [],
  searches: [],
  events: [],
  emails: [],
  tickets: [],
  pendingCode: null,
  lastReport: null,
  seeded: false
});
let S = blank();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) S = Object.assign(blank(), JSON.parse(raw));
    S.cfg = Object.assign({ ...CFG_DEFAULT }, S.cfg || {});
  } catch (e) { S = blank(); }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* private mode */ }
}
function resetAll() { try { localStorage.removeItem(KEY); } catch (e) {} S = blank(); seed(); save(); }

/* ---------------------------- clock ----------------------------------- */
/* A shiftable clock so the 3-day period, renewal, dunning and cancellation
   can actually be exercised without waiting three days. */
const now = () => Date.now() + (S.clockOffsetMs || 0);
const DAY = 86400000, HOUR = 3600000;
function advanceDays(d) { S.clockOffsetMs = (S.clockOffsetMs || 0) + d * DAY; runBilling(); save(); }

/* ---------------------------- utils ----------------------------------- */
const uid = (p) => p + "_" + Math.random().toString(36).slice(2, 9);
const $ = (sel, root) => (root || document).querySelector(sel);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const kr = (n) => new Intl.NumberFormat(S.lang === "en" ? "en-GB" : "nb-NO", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n) + " kr";
function fdate(ts, withTime) {
  const d = new Date(ts);
  const o = withTime
    ? { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
    : { day: "2-digit", month: "short", year: "numeric" };
  return new Intl.DateTimeFormat(S.lang === "en" ? "en-GB" : "nb-NO", o).format(d);
}
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return Math.abs(h); }
const pick = (arr, n) => arr[n % arr.length];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test((e || "").trim()); }
function luhn(num) {
  const d = (num || "").replace(/\D/g, ""); if (d.length < 12) return false;
  let sum = 0, alt = false;
  for (let i = d.length - 1; i >= 0; i--) { let n = +d[i]; if (alt) { n *= 2; if (n > 9) n -= 9; } sum += n; alt = !alt; }
  return sum % 10 === 0;
}

/* ---------------------- i18n (Bokmål + English) ----------------------- */
const NO = {
  "nav.how": "Slik virker det", "nav.price": "Priser", "nav.faq": "Spørsmål", "nav.contact": "Kontakt",
  "nav.login": "Logg inn", "nav.account": "Min side", "nav.logout": "Logg ut", "nav.admin": "Admin",
  "hero.h1": "Hvem eier bilen?", "hero.lede": "Skriv inn et norsk registreringsnummer for å se kjøretøyopplysninger og tilgjengelig eierinformasjon. Første oppslag koster 3 kr.",
  "hero.cta": "Finn eier", "hero.ph": "AB 12345", "hero.label": "Registreringsnummer",
  "hero.a1": "Kjøretøydata hentet fra offentlig tilgjengelige kilder", "hero.a2": "3 kr for 3 dager, deretter 249 kr/mnd", "hero.a3": "Avslutt selv, når som helst, på Min side",
  "err.empty": "Skriv inn et registreringsnummer.",
  "err.format": "Ugyldig format. Norske skilt har to bokstaver og fem sifre, for eksempel AB 12345.",
  "err.notfound": "Fant ingen kjøretøy med dette registreringsnummeret. Kontroller nummeret og prøv igjen.",
  "err.provider": "Datakilden svarer ikke akkurat nå. Prøv igjen om et øyeblikk.",
  "search.loading": "Søker i kjøretøyregisteret …",
  "prev.title": "Er dette riktig kjøretøy?", "prev.free": "Gratis forhåndsvisning",
  "prev.locked": "Låst informasjon", "prev.unlock": "Lås opp for 3 kr",
  "steps.search": "Søk", "steps.preview": "Kjøretøy", "steps.pay": "Betaling", "steps.report": "Rapport",
  "co.title": "Fullfør tilgang", "co.email": "E-postadresse", "co.method": "Betalingsmåte",
  "co.card": "Bankkort", "co.vipps": "Vipps", "co.pay": "Betal 3 kr og lås opp",
  "co.terms": "Jeg godtar vilkårene og bekrefter at abonnementet fornyes automatisk til 249 kr/mnd etter 3 dager, inntil jeg sier opp.",
  "rep.title": "Kjøretøyrapport", "acc.title": "Min side",
  "sub.active": "Aktivt", "sub.trial": "Introduksjonsperiode", "sub.past_due": "Betaling mislyktes",
  "sub.canceled": "Sagt opp", "sub.expired": "Utløpt"
};
const EN = {
  "nav.how": "How it works", "nav.price": "Pricing", "nav.faq": "FAQ", "nav.contact": "Contact",
  "nav.login": "Log in", "nav.account": "My page", "nav.logout": "Log out", "nav.admin": "Admin",
  "hero.h1": "Who owns the car?", "hero.lede": "Enter a Norwegian registration number to see vehicle details and the owner information that is available. The first lookup costs NOK 3.",
  "hero.cta": "Find owner", "hero.ph": "AB 12345", "hero.label": "Registration number",
  "hero.a1": "Vehicle data from publicly available sources", "hero.a2": "NOK 3 for 3 days, then NOK 249/month", "hero.a3": "Cancel yourself, any time, from My page",
  "err.empty": "Enter a registration number.",
  "err.format": "Invalid format. Norwegian plates have two letters and five digits, for example AB 12345.",
  "err.notfound": "No vehicle found with this registration number. Check the number and try again.",
  "err.provider": "The data source is not responding right now. Try again in a moment.",
  "search.loading": "Searching the vehicle register …",
  "prev.title": "Is this the right vehicle?", "prev.free": "Free preview",
  "prev.locked": "Locked information", "prev.unlock": "Unlock for NOK 3",
  "steps.search": "Search", "steps.preview": "Vehicle", "steps.pay": "Payment", "steps.report": "Report",
  "co.title": "Complete access", "co.email": "Email address", "co.method": "Payment method",
  "co.card": "Bank card", "co.vipps": "Vipps", "co.pay": "Pay NOK 3 and unlock",
  "co.terms": "I accept the terms and confirm that the subscription renews automatically at NOK 249/month after 3 days, until I cancel.",
  "rep.title": "Vehicle report", "acc.title": "My page",
  "sub.active": "Active", "sub.trial": "Introductory period", "sub.past_due": "Payment failed",
  "sub.canceled": "Cancelled", "sub.expired": "Expired"
};
const T = (k) => (S.lang === "en" ? EN[k] : NO[k]) || NO[k] || k;
const L = (no, en) => (S.lang === "en" ? en : no);

/* ------------------- analytics event pipeline ------------------------- */
function track(name, props) {
  const allowed = S.consent && S.consent.analytics;
  S.events.unshift({ id: uid("ev"), name, props: props || {}, at: now(), sent: !!allowed });
  if (S.events.length > 400) S.events.length = 400;
  save();
}

/* --------------------- transactional email ---------------------------- */
const EMAILS = {
  login_code: (d) => [L("Din innloggingskode", "Your login code"), L(`Koden din er ${d.code}. Den er gyldig i 10 minutter. Du kan også bruke lenken i denne e-posten.`, `Your code is ${d.code}. It is valid for 10 minutes.`)],
  welcome: () => [L("Velkommen til Bilfunn", "Welcome to Bilfunn"), L("Kontoen din er opprettet. Du har nå tilgang i 3 dager.", "Your account is ready. You now have 3 days of access.")],
  payment_ok: (d) => [L("Betaling bekreftet", "Payment confirmed"), L(`Vi har belastet ${kr(d.amount)}. Kvittering nr. ${d.receipt}.`, `We charged ${kr(d.amount)}. Receipt no. ${d.receipt}.`)],
  subscription: (d) => [L("Abonnementet er aktivert", "Subscription activated"), L(`Du har tilgang til ${fdate(d.renewAt)}. Deretter fornyes abonnementet automatisk til 249 kr/mnd.`, `You have access until ${fdate(d.renewAt)}. It then renews automatically at NOK 249/month.`)],
  reminder: (d) => [L("Abonnementet fornyes i morgen", "Your subscription renews tomorrow"), L(`Introduksjonsperioden avsluttes ${fdate(d.renewAt)} og vi belaster 249 kr. Du kan si opp på Min side før dette.`, `The introductory period ends ${fdate(d.renewAt)} and we charge NOK 249. You can cancel on My page before then.`)],
  renewed: (d) => [L("Abonnementet er fornyet", "Subscription renewed"), L(`Vi har belastet ${kr(d.amount)} for neste måned.`, `We charged ${kr(d.amount)} for the next month.`)],
  failed: (d) => [L("Betalingen mislyktes", "Payment failed"), L(`Vi fikk ikke gjennomført betalingen. Vi prøver igjen automatisk. Oppdater betalingsmåten på Min side innen ${fdate(d.until)} for å beholde tilgangen.`, `We could not complete the payment. We will retry automatically. Update your payment method by ${fdate(d.until)} to keep access.`)],
  canceled: (d) => [L("Oppsigelsen er registrert", "Cancellation confirmed"), L(`Abonnementet er sagt opp. Du har tilgang til ${fdate(d.until)}. Ingen flere trekk vil bli gjort.`, `Your subscription is cancelled. You have access until ${fdate(d.until)}. No further charges will be made.`)],
  refund: (d) => [L("Refusjon utført", "Refund issued"), L(`${kr(d.amount)} er refundert til betalingsmåten din.`, `${kr(d.amount)} has been refunded to your payment method.`)],
  deleted: () => [L("Kontoen er slettet", "Account deleted"), L("Kontoen og tilhørende søkehistorikk er slettet.", "Your account and search history have been deleted.")]
};
function sendEmail(type, to, data) {
  const [subject, body] = EMAILS[type](data || {});
  S.emails.unshift({ id: uid("em"), type, to, subject, body, at: now() });
  if (S.emails.length > 200) S.emails.length = 200;
  save();
  return { subject, body };
}

/* --------------------- registration numbers --------------------------- */
function normalizePlate(raw) { return (raw || "").toUpperCase().replace(/[\s\-.]/g, "").replace(/[^A-ZÆØÅ0-9]/g, ""); }
function plateKind(p) {
  if (/^[A-ZÆØÅ]{2}\d{5}$/.test(p)) return "standard";
  if (/^E[KLVBCD]\d{5}$/.test(p)) return "standard";
  if (/^[A-ZÆØÅ]{2}\d{4}$/.test(p)) return "old";
  if (/^\d{5}$/.test(p)) return "moped";
  if (/^[A-ZÆØÅ0-9]{2,7}$/.test(p) && /[A-ZÆØÅ]/.test(p) && /\d/.test(p)) return "personal";
  return null;
}
const prettyPlate = (p) => /^[A-ZÆØÅ]{2}\d{4,5}$/.test(p) ? p.slice(0, 2) + " " + p.slice(2) : p;

/* --------------------- simulated vehicle provider ---------------------
   Stands in for the Statens vegvesen / commercial data provider behind a
   normalized internal model, exactly as the real integration should work:
   one adapter, one shape, swap the source without touching the UI.       */
const MAKES = [
  ["Toyota", ["RAV4", "Yaris", "Corolla Touring Sports", "Hilux", "Auris"]],
  ["Volkswagen", ["Golf", "Passat Variant", "ID.4", "Tiguan", "Polo"]],
  ["Volvo", ["V70", "XC60", "V60", "XC40", "S60"]],
  ["Tesla", ["Model 3", "Model Y", "Model S"]],
  ["Skoda", ["Octavia Combi", "Superb", "Enyaq iV", "Fabia"]],
  ["Audi", ["A4 Avant", "Q5", "e-tron", "A3 Sportback"]],
  ["BMW", ["320d Touring", "i3", "X1", "530e"]],
  ["Nissan", ["Leaf", "Qashqai", "X-Trail"]],
  ["Ford", ["Focus", "Kuga", "Mondeo"]],
  ["Hyundai", ["Kona electric", "Ioniq 5", "Tucson"]],
  ["Mercedes-Benz", ["C 220 d", "E 300 de", "GLC"]],
  ["Peugeot", ["308 SW", "3008", "e-208"]]
];
const COLORS = [["Sort", "Black"], ["Hvit", "White"], ["Grå", "Grey"], ["Sølv", "Silver"], ["Blå", "Blue"], ["Rød", "Red"], ["Mørk grønn", "Dark green"]];
const FUELS = [["Diesel", "Diesel"], ["Bensin", "Petrol"], ["Elektrisk", "Electric"], ["Hybrid (bensin/el)", "Hybrid (petrol/electric)"], ["Ladbar hybrid", "Plug-in hybrid"]];
const BODIES = [["Stasjonsvogn", "Estate"], ["Personbil", "Passenger car"], ["Flerbruksbil", "MPV"], ["Kombinert bil", "Combi"], ["Varebil", "Van"]];
const FIRSTNAMES = ["Ola", "Kari", "Anders", "Ingrid", "Lars", "Nora", "Jonas", "Maja", "Henrik", "Sofie", "Emil", "Thea", "Magnus", "Linnea", "Sverre", "Astrid"];
const LASTNAMES = ["Nordmann", "Hansen", "Johansen", "Olsen", "Larsen", "Andersen", "Pedersen", "Nilsen", "Kristiansen", "Berg", "Haugen", "Solberg", "Lie", "Moen"];
const STREETS = ["Storgata", "Kirkeveien", "Bjørnsons gate", "Sjøgata", "Fjellveien", "Parkveien", "Elvegata", "Skogstien", "Havnegata", "Rådhusgata"];
const CITIES = [["0157", "Oslo"], ["5003", "Bergen"], ["7010", "Trondheim"], ["4006", "Stavanger"], ["9008", "Tromsø"], ["3015", "Drammen"], ["1607", "Fredrikstad"], ["4836", "Arendal"], ["6003", "Ålesund"], ["2003", "Lillestrøm"]];

function buildVehicle(plate) {
  const h = hashStr(plate);
  const [make, models] = pick(MAKES, h);
  const model = pick(models, h >> 3);
  const fuel = pick(FUELS, h >> 5);
  const isEV = fuel[0] === "Elektrisk";
  const year = 2006 + (h >> 7) % 19;
  const firstReg = new Date(Date.UTC(year, (h >> 11) % 12, 1 + (h >> 13) % 27));
  const col = pick(COLORS, h >> 9);
  const body = pick(BODIES, h >> 15);
  const owners = 1 + (h >> 17) % 5;
  const [zip, city] = pick(CITIES, h >> 19);
  const ownerName = pick(FIRSTNAMES, h >> 21) + " " + pick(LASTNAMES, h >> 23);
  const lastInsp = new Date(now() - ((h >> 4) % 900) * DAY);
  const nextInsp = new Date(lastInsp.getTime() + 730 * DAY);
  const inspOverdue = nextInsp.getTime() < now();
  const weight = 1150 + (h % 900);
  const power = isEV ? 100 + (h % 220) : 66 + (h % 160);
  const hist = [];
  let t = firstReg.getTime();
  for (let i = owners; i >= 1; i--) {
    const span = 300 + ((h >> (i * 2)) % 1400) * DAY / DAY * 1;
    hist.push({
      from: t,
      to: i === 1 ? null : t + span * DAY,
      name: i === 1 ? ownerName : pick(FIRSTNAMES, h >> (i * 3)) + " " + pick(LASTNAMES, h >> (i * 5)),
      type: (h >> (i + 6)) % 7 === 0 ? "company" : "person",
      city: pick(CITIES, h >> (i * 7))[1]
    });
    t += span * DAY;
    if (t > now()) { hist[hist.length - 1].to = null; break; }
  }
  const cur = hist[hist.length - 1];
  const imported = (h >> 25) % 5 === 0;
  return {
    plate,
    // free preview
    make, model, year,
    body: body, colorPair: col,
    // paid
    vin: "YV1" + String(h).slice(0, 5) + (make[0] + model[0]).toUpperCase() + String(h >> 3).slice(0, 6),
    fuelPair: fuel,
    firstReg: firstReg.getTime(),
    firstRegNo: imported ? firstReg.getTime() + (200 + h % 900) * DAY : firstReg.getTime(),
    imported,
    importFrom: imported ? pick(["Tyskland/Germany", "Sverige/Sweden", "Danmark/Denmark", "Nederland/Netherlands"], h >> 27) : null,
    gearbox: isEV ? ["Automat (1-trinn)", "Automatic (1-speed)"] : ((h >> 6) % 2 ? ["Manuell", "Manual"] : ["Automat", "Automatic"]),
    power, displacement: isEV ? null : 1200 + (h % 1800),
    co2: isEV ? 0 : 95 + (h % 120),
    euroClass: isEV ? "—" : "Euro " + (4 + (h >> 8) % 3),
    weight, maxWeight: weight + 480 + (h % 200),
    length: 4100 + (h % 900), width: 1730 + (h % 180), height: 1420 + (h % 300),
    seats: 5, axles: 2, towWeight: 700 + (h % 1100),
    tyreFront: (195 + (h % 5) * 10) + "/" + (45 + (h % 4) * 5) + "R" + (16 + h % 3),
    lastInspection: lastInsp.getTime(), nextInspection: nextInsp.getTime(), inspOverdue,
    regStatus: (h >> 29) % 9 === 0 ? ["Avregistrert", "Deregistered"] : ["Registrert", "Registered"],
    owners,
    ownerName: cur.name, ownerType: cur.type,
    ownerAddress: pick(STREETS, h >> 12) + " " + (1 + h % 70) + ", " + zip + " " + city,
    ownedSince: cur.from,
    history: hist,
    annualFee: isEV ? 0 : 2950 + (h % 600),
    lien: (h >> 31) % 4 === 0 ? { holder: pick(["Santander Consumer Bank", "Nordea Finans", "DNB Finans", "Møller Bilfinans"], h), amount: 40000 + (h % 250000) } : null
  };
}
/* deterministic "misses" so the not-found path is real */
function vehicleExists(plate) { return hashStr(plate + "#exists") % 17 !== 0; }

async function providerLookup(plate) {
  const t0 = performance.now();
  await sleep(420 + Math.random() * 520);
  const h = hashStr(plate + "#err");
  let res;
  if (h % 41 === 0) res = { ok: false, code: "provider_unavailable", status: 503 };
  else if (!vehicleExists(plate)) res = { ok: false, code: "not_found", status: 404 };
  else res = { ok: true, status: 200, vehicle: buildVehicle(plate) };
  res.ms = Math.round(performance.now() - t0);
  return res;
}

/* ----------------------- subscription engine -------------------------- */
function currentUser() { return S.session ? S.users[S.session] : null; }
function subOf(u) { return u && u.subId ? S.subs[u.subId] : null; }

function createSubscription(userId, method) {
  const t = now();
  const sub = {
    id: uid("sub"), userId, status: "trialing", method,
    startedAt: t, periodStart: t, periodEnd: t + S.cfg.introDays * DAY,
    price: S.cfg.renewPrice, cancelAt: null, canceledAt: null,
    failedAttempts: 0, nextRetryAt: null, graceUntil: null,
    reminderSent: false, searchesThisPeriod: 0, renewals: 0
  };
  S.subs[sub.id] = sub; S.users[userId].subId = sub.id;
  return sub;
}
function charge(userId, amount, kind, forceFail) {
  const u = S.users[userId];
  const fail = forceFail || (u && u.forceFail);
  const p = {
    id: uid("pay"), userId, amount, vat: +(amount - amount / (1 + S.cfg.vatRate)).toFixed(2),
    kind, at: now(), status: fail ? "failed" : "succeeded",
    method: u && u.method ? u.method : "card",
    last4: u && u.last4 ? u.last4 : "",
    receipt: "BF-" + String(10000 + S.payments.length + 1),
    refunded: 0,
    error: fail ? "card_declined" : null
  };
  S.payments.unshift(p);
  return p;
}
function statusLabel(sub) {
  if (!sub) return L("Ingen", "None");
  return { trialing: T("sub.trial"), active: T("sub.active"), past_due: T("sub.past_due"), canceled: T("sub.canceled"), expired: T("sub.expired") }[sub.status] || sub.status;
}
function accessOk(sub) {
  if (!sub) return false;
  if (sub.status === "expired") return false;
  if (sub.status === "past_due") return now() < (sub.graceUntil || 0);
  if (sub.status === "canceled") return S.cfg.cancelKeepsAccess && now() < sub.periodEnd;
  return now() < sub.periodEnd;
}
/* Runs the billing lifecycle forward to the current (possibly shifted) time. */
function runBilling() {
  const t = now();
  Object.values(S.subs).forEach(sub => {
    const u = S.users[sub.userId]; if (!u) return;
    let guard = 0;
    // renewal reminder before first charge
    if (!sub.reminderSent && sub.status === "trialing" && t >= sub.periodEnd - S.cfg.reminderHoursBefore * HOUR) {
      sub.reminderSent = true; sendEmail("reminder", u.email, { renewAt: sub.periodEnd });
    }
    while ((sub.status === "trialing" || sub.status === "active") && t >= sub.periodEnd && guard++ < 40) {
      const p = charge(sub.userId, S.cfg.renewPrice, sub.status === "trialing" ? "first_renewal" : "renewal");
      track(p.status === "succeeded" ? "renewal_success" : "renewal_failure", { subId: sub.id, amount: p.amount });
      if (p.status === "succeeded") {
        sub.status = "active"; sub.renewals++; sub.periodStart = sub.periodEnd;
        sub.periodEnd = sub.periodEnd + 30 * DAY; sub.searchesThisPeriod = 0; sub.failedAttempts = 0;
        sendEmail("renewed", u.email, { amount: p.amount });
      } else {
        sub.status = "past_due"; sub.failedAttempts = 1;
        sub.graceUntil = t + S.cfg.graceDays * DAY;
        sub.nextRetryAt = t + S.cfg.retrySchedule[0] * DAY;
        sendEmail("failed", u.email, { until: sub.graceUntil });
      }
    }
    // dunning
    while (sub.status === "past_due" && sub.nextRetryAt && t >= sub.nextRetryAt && guard++ < 40) {
      const p = charge(sub.userId, S.cfg.renewPrice, "retry");
      if (p.status === "succeeded") {
        sub.status = "active"; sub.renewals++; sub.failedAttempts = 0; sub.graceUntil = null; sub.nextRetryAt = null;
        sub.periodStart = t; sub.periodEnd = t + 30 * DAY; sub.searchesThisPeriod = 0;
        sendEmail("renewed", u.email, { amount: p.amount });
      } else {
        sub.failedAttempts++;
        const next = S.cfg.retrySchedule[Math.min(sub.failedAttempts, S.cfg.retrySchedule.length) - 1];
        sub.nextRetryAt = t + next * DAY;
        if (sub.failedAttempts >= S.cfg.retrySchedule.length) { sub.status = "expired"; sub.nextRetryAt = null; }
      }
    }
    if (sub.status === "canceled" && t >= sub.periodEnd) sub.status = "expired";
    if (sub.status === "past_due" && sub.graceUntil && t >= sub.graceUntil && sub.failedAttempts >= S.cfg.retrySchedule.length) sub.status = "expired";
  });
  save();
}

/* ----------------------- search allowance ----------------------------- */
function searchAllowance(u) {
  const sub = subOf(u);
  if (!sub) return { limit: 0, used: 0, left: 0 };
  const limit = sub.status === "trialing" ? S.cfg.introSearchLimit : S.cfg.monthlySearchLimit;
  const used = sub.searchesThisPeriod || 0;
  return { limit, used, left: Math.max(0, limit - used) };
}
function countSearch(u, plate) {
  const sub = subOf(u); if (!sub) return;
  if (!S.cfg.duplicatesCount) {
    const dup = S.searches.find(s => s.userId === u.id && s.plate === plate && now() - s.at < DAY && s.counted);
    if (dup) return;
  }
  sub.searchesThisPeriod = (sub.searchesThisPeriod || 0) + 1;
}
function logSearch(plate, result, ms, userId, counted) {
  S.searches.unshift({ id: uid("s"), plate, result, ms, at: now(), userId: userId || null, ip: sessionIp(), counted: !!counted });
  if (S.searches.length > 300) S.searches.length = 300;
  save();
}
function sessionIp() {
  if (!sessionStorage.getItem("bf_ip")) {
    try { sessionStorage.setItem("bf_ip", "10." + (1 + hashStr(String(Date.now())) % 250) + ".14.7"); } catch (e) { return "10.0.0.1"; }
  }
  try { return sessionStorage.getItem("bf_ip"); } catch (e) { return "10.0.0.1"; }
}
function ipRateOk() {
  const last = S.searches.filter(s => s.ip === sessionIp() && now() - s.at < HOUR);
  return last.length < S.cfg.ipSearchesPerHour;
}
