
/* ============================ chrome ================================== */
function renderNav() {
  const u = currentUser();
  const nav = $("#nav");
  const items = [
    `<a href="#/hvordan">${T("nav.how")}</a>`,
    `<a href="#/priser">${T("nav.price")}</a>`,
    `<a href="#/faq">${T("nav.faq")}</a>`,
    `<a href="#/kontakt">${T("nav.contact")}</a>`,
    u ? `<a href="#/konto">${T("nav.account")}</a>` : `<a href="#/logg-inn">${T("nav.login")}</a>`,
    u ? `<button id="logoutbtn">${T("nav.logout")}</button>` : `<a class="navcta" href="#/">${T("hero.cta")}</a>`,
    `<button class="lang" id="langbtn">${S.lang === "no" ? "EN" : "NO"}</button>`
  ];
  nav.innerHTML = items.join("");
  const cur = location.hash.split("?")[0];
  nav.querySelectorAll("a").forEach(a => { if (a.getAttribute("href") === cur) a.classList.add("on"); });
  $("#langbtn").onclick = () => { S.lang = S.lang === "no" ? "en" : "no"; document.documentElement.lang = S.lang === "no" ? "no" : "en"; save(); renderAll(); };
  const lo = $("#logoutbtn");
  if (lo) lo.onclick = () => { S.session = null; save(); toast(L("Du er logget ut.", "You are logged out.")); go("#/"); };
}
function renderFooter() {
  $("#footer").innerHTML = `<div class="wrap">
    <div class="cols">
      <div>
        <h4>Bilfunn</h4>
        <p style="max-width:34ch">${L("Bilfunn er en uavhengig kommersiell tjeneste som gir privatpersoner oppslag på norske kjøretøy.", "Bilfunn is an independent commercial service giving private individuals lookups on Norwegian vehicles.")}</p>
        <p class="tiny" style="color:#93A9C8">${L("Bilfunn AS · Org.nr 000 000 000 · Storgata 1, 0155 Oslo", "Bilfunn AS · Org. no. 000 000 000 · Storgata 1, 0155 Oslo")}</p>
      </div>
      <div><h4>${L("Tjenesten", "Service")}</h4><ul>
        <li><a href="#/">${L("Søk på skilt", "Plate lookup")}</a></li>
        <li><a href="#/hvordan">${T("nav.how")}</a></li>
        <li><a href="#/priser">${T("nav.price")}</a></li>
        <li><a href="#/faq">${T("nav.faq")}</a></li>
        <li><a href="#/om-oss">${L("Om oss", "About us")}</a></li>
      </ul></div>
      <div><h4>${L("Juridisk", "Legal")}</h4><ul>
        <li><a href="#/vilkar">${L("Vilkår", "Terms")}</a></li>
        <li><a href="#/personvern">${L("Personvern", "Privacy")}</a></li>
        <li><a href="#/cookies">${L("Informasjonskapsler", "Cookies")}</a></li>
        <li><a href="#/angrerett">${L("Angrerett og refusjon", "Withdrawal and refunds")}</a></li>
        <li><a href="#/datakilder">${L("Om datakildene", "About the data")}</a></li>
      </ul></div>
      <div><h4>${L("Kundeservice", "Support")}</h4><ul>
        <li><a href="#/kontakt">${L("Send oss en melding", "Send us a message")}</a></li>
        <li><a href="#/konto">${L("Si opp abonnementet", "Cancel subscription")}</a></li>
        <li><a href="mailto:support@bilfunn.no">support@bilfunn.no</a></li>
        <li><a href="#/admin">${L("Ansattinnlogging", "Staff login")}</a></li>
      </ul></div>
    </div>
    <p class="legal">${L(
      "Bilfunn er ikke eid, drevet eller godkjent av Statens vegvesen eller andre offentlige myndigheter. Opplysningene er hentet fra tilgjengelige kilder og kan inneholde feil eller være utdatert. Tjenesten skal ikke brukes til kartlegging, trakassering, markedsføring eller andre formål som strider mot personvernregelverket.",
      "Bilfunn is not owned, operated or endorsed by Statens vegvesen or any public authority. Information comes from available sources and may be incomplete or out of date. The service must not be used for profiling, harassment, marketing or any purpose that conflicts with data protection law."
    )}</p>
    <p class="legal" style="border:0;padding-top:6px">© ${new Date(now()).getFullYear()} Bilfunn AS. ${L("Demo med simulerte data og simulerte betalinger.", "Demo with simulated data and simulated payments.")}</p>
  </div>`;
}
function renderCookie() {
  const bar = $("#cookiebar");
  if (S.consent) { bar.classList.add("hide"); return; }
  bar.classList.remove("hide");
  bar.innerHTML = `<div class="wrap in">
    <p><strong>${L("Informasjonskapsler", "Cookies")}.</strong> ${L("Vi bruker nødvendige informasjonskapsler for innlogging og betaling. Analyse og markedsføring krever ditt samtykke.", "We use necessary cookies for login and payment. Analytics and marketing require your consent.")} <a href="#/cookies">${L("Les mer", "Read more")}</a></p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn sm ghost" id="ckNo">${L("Kun nødvendige", "Necessary only")}</button>
      <button class="btn sm" id="ckYes">${L("Godta alle", "Accept all")}</button>
    </div>
  </div>`;
  $("#ckYes").onclick = () => { S.consent = { necessary: true, analytics: true, marketing: true, at: now() }; save(); renderCookie(); track("consent_granted", { all: true }); };
  $("#ckNo").onclick = () => { S.consent = { necessary: true, analytics: false, marketing: false, at: now() }; save(); renderCookie(); };
}
function toast(msg, kind) {
  const el = document.createElement("div");
  el.className = "toast " + (kind || "");
  el.textContent = msg;
  $("#toasts").appendChild(el);
  setTimeout(() => el.remove(), 4200);
}
function modal(html, onMount) {
  const root = $("#modalroot");
  root.innerHTML = `<div class="modal"><div class="box" role="dialog" aria-modal="true">${html}</div></div>`;
  root.querySelector(".modal").addEventListener("mousedown", e => { if (e.target.classList.contains("modal")) closeModal(); });
  document.addEventListener("keydown", escClose);
  if (onMount) onMount(root);
}
function escClose(e) { if (e.key === "Escape") closeModal(); }
function closeModal() { $("#modalroot").innerHTML = ""; document.removeEventListener("keydown", escClose); }

const ICON = {
  check: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3.2 3.2L13 5" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  lock: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="7" rx="1.6" stroke="currentColor" stroke-width="1.6"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" stroke-width="1.6"/></svg>',
  search: '<svg width="17" height="17" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.6" stroke="currentColor" stroke-width="1.9"/><path d="M10.6 10.6L14 14" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>'
};
const plateTag = (p) => `<span class="plate-static"><span class="eu">N</span><span>${esc(prettyPlate(p))}</span></span>`;
function steps(active) {
  const s = ["steps.search", "steps.preview", "steps.pay", "steps.report"];
  return `<div class="steps">` + s.map((k, i) =>
    `<span class="${i === active ? "on" : ""}">${i + 1}. ${T(k)}</span>` + (i < 3 ? `<span>›</span>` : "")
  ).join("") + `</div>`;
}

/* ============================ router ================================== */
const routes = {};
function route(path, fn) { routes[path] = fn; }
function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
function parseHash() {
  const raw = location.hash.replace(/^#/, "") || "/";
  const [path, qs] = raw.split("?");
  return { path, q: new URLSearchParams(qs || "") };
}
function render() {
  runBilling();
  const { path, q } = parseHash();
  const main = $("#main");
  main.className = "page";
  const fn = routes[path] || routes["*"];
  main.innerHTML = "";
  fn(main, q);
  renderNav();
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}
function renderAll() { renderFooter(); renderCookie(); render(); }

/* ============================ home ==================================== */
function searchWidget(autofocus) {
  return `
  <form id="searchform" novalidate>
    <label class="f" for="plateinput">${T("hero.label")}</label>
    <div class="plate" id="platewrap">
      <span class="eu"><span class="stars">★★★<br>★&nbsp;&nbsp;★<br>★★★</span><span class="n">N</span></span>
      <input id="plateinput" inputmode="latin" autocomplete="off" spellcheck="false" maxlength="9"
        placeholder="${T("hero.ph")}" aria-describedby="plateerr" ${autofocus ? "autofocus" : ""}>
    </div>
    <span class="err hide" id="plateerr"></span>
    <button class="btn block lg" type="submit" id="searchbtn" style="margin-top:12px">${ICON.search} ${T("hero.cta")}</button>
  </form>`;
}
function wireSearch(scope) {
  const form = $("#searchform", scope); if (!form) return;
  const input = $("#plateinput", form);
  input.addEventListener("input", () => {
    const v = normalizePlate(input.value);
    input.value = /^[A-ZÆØÅ]{2}\d+$/.test(v) ? v.slice(0, 2) + " " + v.slice(2) : v;
    $("#plateerr").classList.add("hide"); $("#platewrap").classList.remove("err");
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const p = normalizePlate(input.value);
    const errEl = $("#plateerr");
    if (!p) { errEl.textContent = T("err.empty"); errEl.classList.remove("hide"); $("#platewrap").classList.add("err"); input.focus(); return; }
    if (!plateKind(p)) { errEl.textContent = T("err.format"); errEl.classList.remove("hide"); $("#platewrap").classList.add("err"); input.focus(); track("search_invalid", { plate: p }); return; }
    track("search_started", { plate: p });
    go("#/kjoretoy?nr=" + p);
  });
}
const RECENT = ["EH52540", "BR72978", "ZH43691", "RY11794", "EF26640", "BS85395", "SU98133", "LJ21677", "EB81601", "DR32440", "TV80148", "EN86287"];

route("/", (m) => {
  const u = currentUser();
  m.className = "page tight";
  m.innerHTML = `
  <section class="hero">
    <div class="wrap inner">
      <div>
        <h1>${T("hero.h1")}</h1>
        <p class="lede">${T("hero.lede")}</p>
        <ul class="assure">
          <li>${ICON.check}<span>${T("hero.a1")}</span></li>
          <li>${ICON.check}<span>${T("hero.a2")}</span></li>
          <li>${ICON.check}<span>${T("hero.a3")}</span></li>
        </ul>
      </div>
      <div class="searchcard">
        ${searchWidget(true)}
        <div style="margin-top:14px;display:grid;gap:7px" class="tiny">
          <span>${ICON.lock} ${L("Sikker betaling med Vipps eller bankkort", "Secure payment with Vipps or bank card")}</span>
          <span>${L("3 kr for 3 dagers tilgang. Deretter 249 kr/mnd inntil du sier opp.", "NOK 3 for 3 days of access. Then NOK 249/month until you cancel.")}</span>
        </div>
      </div>
    </div>
  </section>

  <section class="wrap" style="margin-top:44px">
    <h2>${L("Hva du får tilgang til", "What you get access to")}</h2>
    <p class="muted" style="max-width:62ch">${L("Et abonnement gir deg oppslag på kjøretøy i Norge – ikke bare ett søk. Innholdet avhenger av hva datakilden kan levere for det enkelte kjøretøyet.", "A subscription gives you lookups on vehicles in Norway – not just one search. Content depends on what the data source can deliver for each vehicle.")}</p>
    <div class="grid g3" style="margin-top:18px">
      ${[
      [L("Eieropplysninger", "Owner information"), L("Navn og registrert adresse på nåværende eier, der dette er tilgjengelig og lovlig å vise.", "Name and registered address of the current owner, where this is available and lawful to display.")],
      [L("Teknisk informasjon", "Technical details"), L("Motor, effekt, vekt, mål, drivstoff, utslipp og understellsnummer.", "Engine, power, weight, dimensions, fuel, emissions and chassis number.")],
      [L("EU-kontroll", "EU inspection"), L("Siste godkjente kontroll og neste frist, slik at du ser om bilen er forsinket.", "Last approved inspection and next deadline, so you can see if the car is overdue.")],
      [L("Eierhistorikk", "Ownership history"), L("Antall eiere og eierskifter tilbake i tid, der historikken finnes.", "Number of owners and changes of ownership over time, where history exists.")],
      [L("Heftelser", "Liens"), L("Om det er registrert pant på kjøretøyet – nyttig før et bruktbilkjøp.", "Whether a lien is registered on the vehicle – useful before a used-car purchase.")],
      [L("Import og registrering", "Import and registration"), L("Registreringsstatus, første gang registrert og om bilen er importert.", "Registration status, first registration and whether the car was imported.")]
    ].map(([h, p]) => `<div class="card"><h3>${h}</h3><p class="muted small" style="margin:0">${p}</p></div>`).join("")}
    </div>
  </section>

  <section class="wrap" style="margin-top:44px">
    <div class="card">
      <div class="rowsplit">
        <div style="max-width:52ch">
          <h2 style="margin-bottom:.2em">${L("3 kr nå, 3 dager tilgang", "NOK 3 now, 3 days of access")}</h2>
          <p class="muted" style="margin:0">${L("Etter 3 dager fornyes abonnementet automatisk til 249 kr per måned. Du kan si opp selv på Min side når som helst – også i introduksjonsperioden.", "After 3 days the subscription renews automatically at NOK 249 per month. You can cancel yourself on My page at any time – including during the introductory period.")}</p>
        </div>
        <a class="btn" href="#/priser">${L("Se hva som er inkludert", "See what's included")}</a>
      </div>
    </div>
  </section>

  <section class="wrap" style="margin-top:44px">
    <h2 style="text-align:center">${L("Ofte stilte spørsmål", "Frequently asked questions")}</h2>
    <div class="card faq" style="margin-top:16px">${faqHtml(5)}</div>
    <p style="text-align:center;margin-top:14px"><a href="#/faq">${L("Alle spørsmål og svar", "All questions and answers")}</a></p>
  </section>

  <section class="wrap" style="margin-top:44px;text-align:center">
    <h2>${L("Nylige søk", "Recent searches")}</h2>
    <p class="muted small">${L("Skilt andre har slått opp. Trykk på et skilt for å se kjøretøyet.", "Plates others have looked up. Tap a plate to see the vehicle.")}</p>
    <div class="plates-cloud" style="margin-top:14px">
      ${RECENT.map(p => `<button data-plate="${p}">${plateTag(p)}</button>`).join("")}
    </div>
  </section>`;
  wireSearch(m);
  m.querySelectorAll("[data-plate]").forEach(b => b.onclick = () => { track("search_started", { plate: b.dataset.plate, src: "recent" }); go("#/kjoretoy?nr=" + b.dataset.plate); });
  track("home_view", {});
});

/* ======================= vehicle preview / paywall ==================== */
route("/kjoretoy", async (m, q) => {
  const plate = normalizePlate(q.get("nr") || "");
  if (!plate || !plateKind(plate)) { go("#/"); return; }
  const u = currentUser();
  const sub = subOf(u);
  const hasAccess = accessOk(sub);

  m.innerHTML = `<div class="wrap mid">${steps(1)}
    <div class="card" id="loadcard">
      <div style="display:flex;gap:12px;align-items:center">
        <div class="spinner blue"></div>
        <div><strong>${T("search.loading")}</strong><div class="tiny">${esc(prettyPlate(plate))}</div></div>
      </div>
      <div style="margin-top:18px;display:grid;gap:10px">
        <div class="skeleton" style="width:60%"></div><div class="skeleton" style="width:85%"></div><div class="skeleton" style="width:45%"></div>
      </div>
    </div></div>`;

  if (!ipRateOk()) {
    $("#loadcard").outerHTML = `<div class="note bad">${L("For mange søk fra denne nettleseren den siste timen. Vent litt før du prøver igjen.", "Too many searches from this browser in the last hour. Please wait before trying again.")}</div>`;
    track("rate_limited", { plate }); return;
  }
  if (hasAccess) {
    const al = searchAllowance(u);
    const dupFree = !S.cfg.duplicatesCount && S.searches.some(s => s.userId === u.id && s.plate === plate && now() - s.at < DAY && s.counted);
    if (al.left <= 0 && !dupFree) {
      $("#loadcard").outerHTML = `<div class="card"><h2>${L("Søkegrensen er nådd", "Search limit reached")}</h2>
        <p class="muted">${L(`Du har brukt ${al.used} av ${al.limit} søk i denne perioden. Grensen nullstilles ved neste fornyelse.`, `You have used ${al.used} of ${al.limit} searches this period. The limit resets at your next renewal.`)}</p>
        <a class="btn" href="#/konto">${L("Gå til Min side", "Go to My page")}</a></div>`;
      track("search_limit_hit", { plate }); return;
    }
  }

  const res = await providerLookup(plate);
  if (parseHash().q.get("nr") !== q.get("nr")) return; // navigated away

  if (!res.ok) {
    logSearch(plate, res.code, res.ms, u ? u.id : null, false);
    track("vehicle_not_found", { plate, code: res.code });
    const msg = res.code === "not_found" ? T("err.notfound") : T("err.provider");
    $("#loadcard").outerHTML = `<div class="card">
      <h2>${res.code === "not_found" ? L("Ingen treff", "No match") : L("Datakilden er utilgjengelig", "Data source unavailable")}</h2>
      <p class="muted">${msg}</p>
      <div style="max-width:380px">${searchWidget(true)}</div>
      ${res.code === "not_found" ? `<p class="tiny" style="margin-top:14px">${L("Tips: avregistrerte kjøretøy, mopeder og enkelte tilhengere kan mangle i kilden.", "Tip: deregistered vehicles, mopeds and some trailers may be missing from the source.")}</p>` : ""}
    </div>`;
    wireSearch(m);
    return;
  }

  const v = res.vehicle;
  S.lastReport = plate;
  const counted = hasAccess;
  if (hasAccess) countSearch(u, plate);
  logSearch(plate, "found", res.ms, u ? u.id : null, counted);
  track("vehicle_found", { plate, ms: res.ms });

  if (hasAccess) { go("#/rapport?nr=" + plate); return; }

  track("paywall_viewed", { plate });
  const col = S.lang === "en" ? v.colorPair[1] : v.colorPair[0];
  const body = S.lang === "en" ? v.body[1] : v.body[0];
  $("#loadcard").outerHTML = `
    <div class="card">
      <div class="rowsplit" style="align-items:flex-start">
        <div>
          <div class="tag ok">${ICON.check} ${L("Kjøretøy funnet", "Vehicle found")}</div>
          <h1 style="font-size:1.6rem;margin:10px 0 4px">${esc(v.make)} ${esc(v.model)}</h1>
          <p class="muted" style="margin:0">${v.year} · ${esc(body)} · ${esc(col)}</p>
        </div>
        ${plateTag(plate)}
      </div>
      <p class="tiny" style="margin:14px 0 0">${T("prev.free")} — ${L("kontroller at dette er riktig bil før du låser opp.", "check this is the right car before unlocking.")}</p>
    </div>

    <div class="card locked" style="margin-top:16px">
      <h2>${T("prev.locked")}</h2>
      <div class="blur" aria-hidden="true">
        <dl class="spec">
          <dt>${L("Eier", "Owner")}</dt><dd>Kari Nordmann</dd>
          <dt>${L("Adresse", "Address")}</dt><dd>Storgata 14, 0155 Oslo</dd>
          <dt>${L("Eier siden", "Owner since")}</dt><dd>12. mars 2021</dd>
          <dt>${L("Antall eiere", "Number of owners")}</dt><dd>3</dd>
          <dt>${L("Understellsnummer", "Chassis number")}</dt><dd>YV1XXXXXXXXXXXXXX</dd>
          <dt>${L("Neste EU-kontroll", "Next EU inspection")}</dt><dd>30. november 2026</dd>
        </dl>
      </div>
      <div class="lockover">
        <div style="text-align:center;padding:0 12px">
          <div class="tag">${ICON.lock} ${L("Låst", "Locked")}</div>
          <p class="small muted" style="margin:10px 0 0;max-width:34ch">${L("Eierinformasjon, teknisk detalj, EU-kontroll, eierhistorikk og heftelser vises etter betaling.", "Owner information, technical detail, EU inspection, ownership history and liens are shown after payment.")}</p>
        </div>
      </div>
    </div>

    <div class="pricebox" style="margin-top:16px">
      <div class="top">
        <div class="amt">${kr(S.cfg.introPrice)}</div>
        <div style="opacity:.9">${L("for 3 dagers tilgang", "for 3 days of access")}</div>
      </div>
      <div class="body">
        <ul class="terms-list">
          <li>${ICON.check}<span>${L("Du belastes", "You are charged")} <b>${kr(S.cfg.introPrice)}</b> ${L("i dag", "today")}.</span></li>
          <li>${ICON.check}<span>${L("Tilgangen varer i", "Access lasts")} <b>${S.cfg.introDays} ${L("dager", "days")}</b> (${S.cfg.introDays * 24} ${L("timer", "hours")}) ${L("og inkluderer inntil", "and includes up to")} ${S.cfg.introSearchLimit} ${L("oppslag", "lookups")}.</span></li>
          <li>${ICON.check}<span>${L("Deretter fornyes abonnementet automatisk til", "Then the subscription renews automatically at")} <b>${kr(S.cfg.renewPrice)}/${L("mnd", "month")}</b> ${L("inntil du sier opp.", "until you cancel.")}</span></li>
          <li>${ICON.check}<span>${L("Du kan si opp når som helst på Min side. Vi minner deg på e-post før første fornyelse.", "You can cancel any time on My page. We remind you by email before the first renewal.")}</span></li>
        </ul>
        <button class="btn block lg" id="unlockbtn" style="margin-top:16px">${T("prev.unlock")}</button>
        <p class="tiny" style="margin:10px 0 0;text-align:center">${L("Ved å fortsette godtar du", "By continuing you accept the")} <a href="#/vilkar">${L("vilkårene", "terms")}</a> ${L("og", "and")} <a href="#/personvern">${L("personvernerklæringen", "privacy policy")}</a>.</p>
      </div>
    </div>`;
  $("#unlockbtn").onclick = () => { track("checkout_started", { plate }); go("#/kasse?nr=" + plate); };
});
