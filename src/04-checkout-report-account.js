
/* ============================ checkout ================================ */
route("/kasse", (m, q) => {
  const plate = normalizePlate(q.get("nr") || "");
  if (!plate) { go("#/"); return; }
  const u = currentUser();
  m.innerHTML = `<div class="wrap narrow">${steps(2)}
    <div class="card">
      <h1 style="font-size:1.5rem">${T("co.title")}</h1>
      <p class="muted small">${L("Kontoen din opprettes automatisk med e-postadressen du oppgir. Ingen passord er nødvendig.", "Your account is created automatically with the email you provide. No password needed.")}</p>

      <div class="note" style="margin:16px 0">
        <div class="rowsplit" style="gap:8px">
          <span>${L("Kjøretøy", "Vehicle")}</span><strong>${esc(prettyPlate(plate))}</strong>
        </div>
        <div class="rowsplit" style="gap:8px;margin-top:6px">
          <span>${L("Belastes i dag", "Charged today")}</span><strong style="font-size:1.15rem">${kr(S.cfg.introPrice)}</strong>
        </div>
        <div class="rowsplit" style="gap:8px;margin-top:6px">
          <span>${L("Etter 3 dager", "After 3 days")}</span><strong>${kr(S.cfg.renewPrice)}/${L("mnd", "mo")}</strong>
        </div>
      </div>

      <form id="cform" novalidate>
        <div class="field">
          <label class="f" for="cemail">${T("co.email")}</label>
          <input class="input" id="cemail" type="email" inputmode="email" autocomplete="email" placeholder="navn@eksempel.no" value="${u ? esc(u.email) : ""}">
          <span class="err hide" id="eemail"></span>
          <span class="tiny">${L("Kvittering og innloggingslenke sendes hit.", "Receipt and login link are sent here.")}</span>
        </div>

        <label class="f">${T("co.method")}</label>
        <div class="grid g2" style="gap:10px;margin-bottom:15px">
          <label class="choice on" id="mVipps"><input type="radio" name="pm" value="vipps" checked>
            <span><strong style="color:#FF5B24">Vipps</strong><br><span class="tiny">${L("Bekreft i Vipps-appen", "Confirm in the Vipps app")}</span></span></label>
          <label class="choice" id="mCard"><input type="radio" name="pm" value="card">
            <span><strong>${T("co.card")}</strong><br><span class="tiny">Visa / Mastercard</span></span></label>
        </div>

        <div id="vippsFields">
          <div class="field">
            <label class="f" for="cphone">${L("Mobilnummer", "Mobile number")}</label>
            <input class="input" id="cphone" inputmode="tel" placeholder="4XX XX XXX" maxlength="11">
            <span class="err hide" id="ephone"></span>
          </div>
        </div>

        <div id="cardFields" class="hide">
          <div class="field">
            <label class="f" for="ccard">${L("Kortnummer", "Card number")}</label>
            <input class="input" id="ccard" inputmode="numeric" autocomplete="cc-number" placeholder="4242 4242 4242 4242" maxlength="23">
            <span class="err hide" id="ecard"></span>
          </div>
          <div class="grid g2" style="gap:12px">
            <div class="field"><label class="f" for="cexp">${L("Utløp", "Expiry")}</label>
              <input class="input" id="cexp" inputmode="numeric" placeholder="MM/ÅÅ" maxlength="5"><span class="err hide" id="eexp"></span></div>
            <div class="field"><label class="f" for="ccvc">CVC</label>
              <input class="input" id="ccvc" inputmode="numeric" placeholder="123" maxlength="4"><span class="err hide" id="ecvc"></span></div>
          </div>
        </div>

        <label class="check" style="margin:4px 0 16px">
          <input type="checkbox" id="cterms"><span>${T("co.terms")}</span>
        </label>
        <span class="err hide" id="eterms" style="margin:-10px 0 12px;display:block"></span>

        <button class="btn block lg" type="submit" id="paybtn">${T("co.pay")}</button>
        <p class="tiny" style="text-align:center;margin:12px 0 0">${ICON.lock} ${L("Kortopplysninger lagres aldri hos oss. Betalingen håndteres av betalingsleverandøren.", "Card details are never stored by us. Payment is handled by the payment provider.")}</p>
      </form>
      <p class="tiny" style="margin-top:16px;border-top:1px solid var(--line-2);padding-top:12px">
        ${L("Demo: ingen ekte betaling skjer. Bruk kortnummer 4242 4242 4242 4242 for godkjent betaling, eller 4000 0000 0000 0002 for avvist betaling.", "Demo: no real payment happens. Use card 4242 4242 4242 4242 for approval, or 4000 0000 0000 0002 for decline.")}
      </p>
    </div></div>`;

  const setMethod = (v) => {
    $("#mVipps").classList.toggle("on", v === "vipps");
    $("#mCard").classList.toggle("on", v === "card");
    $("#vippsFields").classList.toggle("hide", v !== "vipps");
    $("#cardFields").classList.toggle("hide", v !== "card");
  };
  m.querySelectorAll('input[name=pm]').forEach(r => r.onchange = () => setMethod(r.value));
  $("#ccard").addEventListener("input", e => {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim();
  });
  $("#cexp").addEventListener("input", e => {
    let d = e.target.value.replace(/\D/g, "").slice(0, 4);
    e.target.value = d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d;
  });
  $("#cphone").addEventListener("input", e => { e.target.value = e.target.value.replace(/\D/g, "").slice(0, 8); });

  $("#cform").addEventListener("submit", async (e) => {
    e.preventDefault();
    const method = m.querySelector('input[name=pm]:checked').value;
    const email = $("#cemail").value.trim();
    let bad = false;
    const fail = (id, msg) => { const el = $("#" + id); el.textContent = msg; el.classList.remove("hide"); bad = true; };
    m.querySelectorAll(".err").forEach(el => el.classList.add("hide"));
    if (!validEmail(email)) fail("eemail", L("Skriv inn en gyldig e-postadresse.", "Enter a valid email address."));
    let last4 = "", declined = false;
    if (method === "card") {
      const num = $("#ccard").value.replace(/\s/g, "");
      if (!luhn(num)) fail("ecard", L("Kortnummeret er ikke gyldig.", "That card number is not valid."));
      else { last4 = num.slice(-4); declined = num === "4000000000000002"; }
      const exp = $("#cexp").value;
      const mm = +exp.slice(0, 2), yy = +exp.slice(3);
      if (!/^\d{2}\/\d{2}$/.test(exp) || mm < 1 || mm > 12) fail("eexp", L("Ugyldig utløpsdato.", "Invalid expiry date."));
      else if (new Date(2000 + yy, mm, 1).getTime() < now()) fail("eexp", L("Kortet er utløpt.", "The card has expired."));
      if (!/^\d{3,4}$/.test($("#ccvc").value)) fail("ecvc", L("Ugyldig CVC.", "Invalid CVC."));
    } else {
      if (!/^[49]\d{7}$/.test($("#cphone").value)) fail("ephone", L("Skriv inn et norsk mobilnummer på 8 siffer.", "Enter an 8-digit Norwegian mobile number."));
      last4 = $("#cphone").value.slice(-4);
      declined = $("#cphone").value === "40000000";
    }
    if (!$("#cterms").checked) fail("eterms", L("Du må godta vilkårene for å fortsette.", "You must accept the terms to continue."));
    if (bad) { track("checkout_error", { field: "validation" }); m.querySelector(".err:not(.hide)").scrollIntoView({ block: "center", behavior: "smooth" }); return; }

    const btn = $("#paybtn");
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> ${method === "vipps" ? L("Venter på Vipps …", "Waiting for Vipps …") : L("Behandler betaling …", "Processing payment …")}`;
    await sleep(method === "vipps" ? 1500 : 1100);

    if (declined) {
      btn.disabled = false; btn.textContent = T("co.pay");
      track("checkout_error", { reason: "declined" });
      $("#cform").insertAdjacentHTML("afterbegin", `<div class="note bad" style="margin-bottom:14px">${L("Betalingen ble avvist av utstederen. Prøv en annen betalingsmåte eller kontakt banken din.", "The payment was declined by the issuer. Try another payment method or contact your bank.")}</div>`);
      return;
    }

    // account: create or link
    let user = Object.values(S.users).find(x => x.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      user = { id: uid("u"), email, createdAt: now(), method, last4, role: "customer", forceFail: false };
      S.users[user.id] = user;
      sendEmail("welcome", email, {});
      track("account_created", { userId: user.id });
    } else { user.method = method; user.last4 = last4; }
    S.session = user.id;

    let sub = subOf(user);
    if (!sub || sub.status === "expired") sub = createSubscription(user.id, method);
    const pay = charge(user.id, S.cfg.introPrice, "intro");
    sendEmail("payment_ok", email, { amount: S.cfg.introPrice, receipt: pay.receipt });
    sendEmail("subscription", email, { renewAt: sub.periodEnd });
    track("checkout_completed", { amount: S.cfg.introPrice, method, plate });
    countSearch(user, plate);
    const s0 = S.searches.find(s => s.plate === plate && !s.userId);
    if (s0) { s0.userId = user.id; s0.counted = true; }
    save();
    go("#/kvittering?nr=" + plate);
  });
});

/* ========================= payment confirmation ======================= */
route("/kvittering", (m, q) => {
  const plate = normalizePlate(q.get("nr") || "");
  const u = currentUser(); if (!u) { go("#/"); return; }
  const sub = subOf(u);
  const p = S.payments.find(x => x.userId === u.id && x.kind === "intro");
  m.innerHTML = `<div class="wrap narrow"><div class="card" style="text-align:center">
    <div class="tag ok" style="font-size:.95rem;padding:6px 14px">${ICON.check} ${L("Betaling gjennomført", "Payment complete")}</div>
    <h1 style="font-size:1.6rem;margin-top:14px">${L("Tilgangen er aktivert", "Your access is active")}</h1>
    <p class="muted">${L(`Vi har belastet ${kr(S.cfg.introPrice)} og sendt kvittering til ${u.email}.`, `We charged ${kr(S.cfg.introPrice)} and sent a receipt to ${u.email}.`)}</p>
    <div class="note" style="text-align:left;margin:18px 0">
      <div class="rowsplit"><span>${L("Kvitteringsnummer", "Receipt number")}</span><strong>${p ? p.receipt : "—"}</strong></div>
      <div class="rowsplit" style="margin-top:6px"><span>${L("Tilgang til og med", "Access through")}</span><strong>${fdate(sub.periodEnd, true)}</strong></div>
      <div class="rowsplit" style="margin-top:6px"><span>${L("Neste trekk", "Next charge")}</span><strong>${kr(S.cfg.renewPrice)} · ${fdate(sub.periodEnd)}</strong></div>
    </div>
    ${plate ? `<a class="btn block lg" href="#/rapport?nr=${plate}">${L("Se kjøretøyrapporten", "View the vehicle report")}</a>` : `<a class="btn block lg" href="#/">${T("hero.cta")}</a>`}
    <p style="margin-top:14px"><a href="#/konto">${L("Administrer abonnementet på Min side", "Manage your subscription on My page")}</a></p>
  </div></div>`;
});

/* ============================== report ================================ */
function specRow(label, value) { return `<dt>${label}</dt><dd>${value}</dd>`; }
route("/rapport", async (m, q) => {
  const plate = normalizePlate(q.get("nr") || "");
  const u = currentUser(); const sub = subOf(u);
  if (!u || !accessOk(sub)) {
    m.innerHTML = `<div class="wrap narrow"><div class="card"><h1 style="font-size:1.4rem">${L("Tilgangen er ikke aktiv", "Access is not active")}</h1>
      <p class="muted">${L("Abonnementet ditt gir ikke tilgang akkurat nå. Start på nytt med et søk, eller gå til Min side for å fornye.", "Your subscription does not give access right now. Start again with a search, or go to My page to renew.")}</p>
      <a class="btn" href="#/">${L("Nytt søk", "New search")}</a> <a class="btn ghost" href="#/konto">${T("nav.account")}</a></div></div>`;
    return;
  }
  m.innerHTML = `<div class="wrap mid">${steps(3)}<div class="card"><div class="spinner blue"></div></div></div>`;
  const res = await providerLookup(plate);
  if (!res.ok) { m.innerHTML = `<div class="wrap mid"><div class="note bad">${T("err.provider")}</div></div>`; return; }
  const v = res.vehicle;
  track("report_viewed", { plate });
  const al = searchAllowance(u);
  const fuel = S.lang === "en" ? v.fuelPair[1] : v.fuelPair[0];
  const col = S.lang === "en" ? v.colorPair[1] : v.colorPair[0];
  const body = S.lang === "en" ? v.body[1] : v.body[0];
  const gearbox = S.lang === "en" ? v.gearbox[1] : v.gearbox[0];
  const regStatus = S.lang === "en" ? v.regStatus[1] : v.regStatus[0];

  m.innerHTML = `<div class="wrap mid">${steps(3)}
  <div class="card">
    <div class="rowsplit">
      <div>
        <h1 style="font-size:1.7rem;margin-bottom:2px">${esc(v.make)} ${esc(v.model)}</h1>
        <p class="muted" style="margin:0">${v.year} · ${esc(body)} · ${esc(fuel)} · ${esc(col)}</p>
      </div>
      <div style="text-align:right">${plateTag(plate)}
        <div class="tiny" style="margin-top:6px">${L("Oppslag", "Lookup")} ${fdate(now(), true)}</div></div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
      <span class="tag ${v.regStatus[0] === "Registrert" ? "ok" : "bad"}">${esc(regStatus)}</span>
      <span class="tag ${v.inspOverdue ? "bad" : "ok"}">${v.inspOverdue ? L("EU-kontroll forfalt", "EU inspection overdue") : L("EU-kontroll i orden", "EU inspection valid")}</span>
      ${v.lien ? `<span class="tag warn">${L("Pant registrert", "Lien registered")}</span>` : `<span class="tag ok">${L("Ingen pant registrert", "No lien registered")}</span>`}
      ${v.imported ? `<span class="tag warn">${L("Importert", "Imported")}</span>` : ""}
    </div>
  </div>

  <div class="card">
    <h2>${L("Eieropplysninger", "Owner information")}</h2>
    <dl class="spec">
      ${specRow(L("Nåværende eier", "Current owner"), esc(v.ownerName) + (v.ownerType === "company" ? " AS" : ""))}
      ${specRow(L("Eiertype", "Owner type"), v.ownerType === "company" ? L("Foretak", "Company") : L("Privatperson", "Private individual"))}
      ${specRow(L("Registrert adresse", "Registered address"), esc(v.ownerAddress))}
      ${specRow(L("Eier siden", "Owner since"), fdate(v.ownedSince))}
      ${specRow(L("Antall eiere", "Number of owners"), v.owners)}
    </dl>
    <p class="tiny" style="margin:12px 0 0">${L("Eieropplysninger vises kun der de er tilgjengelige fra kilden og kan vises lovlig. Opplysningene skal ikke brukes til markedsføring, kartlegging eller kontakt i strid med personvernregelverket.", "Owner information is shown only where available from the source and lawful to display. It must not be used for marketing, profiling or contact that conflicts with data protection law.")}</p>
  </div>

  <div class="grid g2" style="margin-top:16px">
    <div class="card">
      <h2>${L("Teknisk", "Technical")}</h2>
      <dl class="spec">
        ${specRow(L("Understellsnummer", "Chassis number"), esc(v.vin))}
        ${specRow(L("Drivstoff", "Fuel"), esc(fuel))}
        ${specRow(L("Girkasse", "Gearbox"), esc(gearbox))}
        ${specRow(L("Effekt", "Power"), v.power + " kW (" + Math.round(v.power * 1.36) + " hk)")}
        ${v.displacement ? specRow(L("Slagvolum", "Displacement"), v.displacement + " cm³") : ""}
        ${specRow("CO₂", v.co2 ? v.co2 + " g/km" : "0 g/km")}
        ${specRow(L("Utslippsklasse", "Emission class"), esc(v.euroClass))}
        ${specRow(L("Egenvekt", "Kerb weight"), v.weight + " kg")}
        ${specRow(L("Totalvekt", "Max weight"), v.maxWeight + " kg")}
        ${specRow(L("Tilhengervekt", "Towing capacity"), v.towWeight + " kg")}
        ${specRow(L("Lengde/bredde/høyde", "Length/width/height"), v.length + " / " + v.width + " / " + v.height + " mm")}
        ${specRow(L("Seter · aksler", "Seats · axles"), v.seats + " · " + v.axles)}
        ${specRow(L("Dekkdimensjon", "Tyre size"), esc(v.tyreFront))}
      </dl>
    </div>
    <div>
      <div class="card">
        <h2>${L("EU-kontroll", "EU inspection")}</h2>
        <dl class="spec">
          ${specRow(L("Sist godkjent", "Last approved"), fdate(v.lastInspection))}
          ${specRow(L("Neste frist", "Next deadline"), `<span class="${v.inspOverdue ? "" : ""}">${fdate(v.nextInspection)}</span>`)}
          ${specRow(L("Status", "Status"), v.inspOverdue ? `<span class="tag bad">${L("Forfalt", "Overdue")}</span>` : `<span class="tag ok">${L("Gyldig", "Valid")}</span>`)}
        </dl>
      </div>
      <div class="card">
        <h2>${L("Registrering", "Registration")}</h2>
        <dl class="spec">
          ${specRow(L("Status", "Status"), esc(regStatus))}
          ${specRow(L("Først registrert", "First registered"), fdate(v.firstReg))}
          ${specRow(L("Først registrert i Norge", "First registered in Norway"), fdate(v.firstRegNo))}
          ${specRow(L("Importert", "Imported"), v.imported ? esc(v.importFrom) : L("Nei", "No"))}
          ${specRow(L("Årsavgift (trafikkforsikringsavgift)", "Annual traffic insurance fee"), v.annualFee ? kr(v.annualFee) : kr(0))}
        </dl>
      </div>
      <div class="card">
        <h2>${L("Heftelser", "Liens")}</h2>
        ${v.lien
      ? `<dl class="spec">${specRow(L("Panthaver", "Lien holder"), esc(v.lien.holder))}${specRow(L("Beløp", "Amount"), kr(v.lien.amount))}</dl>
             <p class="tiny" style="margin:10px 0 0">${L("Pant må normalt slettes før eierskifte. Kontroller alltid med panthaver.", "A lien must normally be cleared before transfer of ownership. Always check with the lien holder.")}</p>`
      : `<p class="muted small" style="margin:0">${L("Ingen registrerte heftelser funnet på dette kjøretøyet.", "No registered liens found on this vehicle.")}</p>`}
      </div>
    </div>
  </div>

  <div class="card" style="margin-top:16px">
    <h2>${L("Eierhistorikk", "Ownership history")}</h2>
    <div class="scrollx"><table class="data">
      <thead><tr><th>#</th><th>${L("Eier", "Owner")}</th><th>${L("Type", "Type")}</th><th>${L("Sted", "Location")}</th><th>${L("Fra", "From")}</th><th>${L("Til", "To")}</th></tr></thead>
      <tbody>${v.history.map((h, i) => `<tr>
        <td>${v.history.length - i}</td><td>${esc(h.name)}${h.type === "company" ? " AS" : ""}</td>
        <td>${h.type === "company" ? L("Foretak", "Company") : L("Privat", "Private")}</td>
        <td>${esc(h.city)}</td><td>${fdate(h.from)}</td><td>${h.to ? fdate(h.to) : L("Nåværende", "Current")}</td></tr>`).join("")}</tbody>
    </table></div>
  </div>

  <div class="card" style="margin-top:16px">
    <div class="rowsplit">
      <div>
        <strong>${L("Søk brukt i denne perioden", "Searches used this period")}:</strong>
        <span class="mono-num">${al.used} / ${al.limit}</span>
        <div class="tiny">${L("Gjentatte oppslag på samme skilt innen 24 timer teller ikke.", "Repeat lookups of the same plate within 24 hours do not count.")}</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap" class="noprint">
        <button class="btn ghost sm" onclick="window.print()">${L("Skriv ut / lagre som PDF", "Print / save as PDF")}</button>
        <a class="btn sm" href="#/">${L("Nytt søk", "New search")}</a>
      </div>
    </div>
  </div>
  <p class="tiny" style="margin-top:14px;max-width:80ch">${L("Opplysningene er hentet fra tilgjengelige kilder på oppslagstidspunktet og kan avvike fra gjeldende registerdata. Bilfunn er ikke tilknyttet Statens vegvesen.", "Information was retrieved from available sources at the time of lookup and may differ from current register data. Bilfunn is not affiliated with Statens vegvesen.")}</p>
  </div>`;
});

/* ============================== login ================================= */
route("/logg-inn", (m) => {
  m.innerHTML = `<div class="wrap narrow"><div class="card">
    <h1 style="font-size:1.5rem">${L("Logg inn", "Log in")}</h1>
    <p class="muted small">${L("Vi sender en engangskode til e-postadressen din. Ingen passord å huske.", "We send a one-time code to your email. No password to remember.")}</p>
    <form id="lform" novalidate>
      <div class="field"><label class="f" for="lemail">${T("co.email")}</label>
        <input class="input" id="lemail" type="email" inputmode="email" placeholder="navn@eksempel.no">
        <span class="err hide" id="elemail"></span></div>
      <button class="btn block" type="submit">${L("Send kode", "Send code")}</button>
    </form>
    <div id="codebox" class="hide" style="margin-top:18px;border-top:1px solid var(--line-2);padding-top:18px">
      <div class="field"><label class="f" for="lcode">${L("Engangskode", "One-time code")}</label>
        <input class="input" id="lcode" inputmode="numeric" maxlength="6" placeholder="000000" style="letter-spacing:.4em;font-size:1.3rem;text-align:center">
        <span class="err hide" id="elcode"></span></div>
      <button class="btn block" id="verify">${L("Logg inn", "Log in")}</button>
      <p class="tiny" id="demohint" style="margin-top:10px"></p>
    </div>
  </div></div>`;
  $("#lform").onsubmit = (e) => {
    e.preventDefault();
    const email = $("#lemail").value.trim();
    if (!validEmail(email)) { $("#elemail").textContent = L("Skriv inn en gyldig e-postadresse.", "Enter a valid email address."); $("#elemail").classList.remove("hide"); return; }
    const code = String(100000 + Math.floor(Math.random() * 899999));
    S.pendingCode = { email, code, at: now() }; save();
    sendEmail("login_code", email, { code });
    $("#codebox").classList.remove("hide");
    $("#demohint").textContent = L("Demo: koden er " + code, "Demo: the code is " + code);
    $("#lcode").focus();
    track("login_code_sent", {});
  };
  $("#verify").onclick = () => {
    const pc = S.pendingCode;
    if (!pc || $("#lcode").value.trim() !== pc.code || now() - pc.at > 10 * 60000) {
      $("#elcode").textContent = L("Koden er feil eller utløpt.", "The code is wrong or expired."); $("#elcode").classList.remove("hide"); return;
    }
    let user = Object.values(S.users).find(x => x.email.toLowerCase() === pc.email.toLowerCase());
    if (!user) { user = { id: uid("u"), email: pc.email, createdAt: now(), role: "customer", method: "", last4: "" }; S.users[user.id] = user; }
    S.session = user.id; S.pendingCode = null; save();
    track("login_success", {});
    toast(L("Du er logget inn.", "You are logged in."), "ok");
    go("#/konto");
  };
});

/* ============================ account ================================= */
route("/konto", (m) => {
  const u = currentUser(); if (!u) { go("#/logg-inn"); return; }
  const sub = subOf(u);
  const al = searchAllowance(u);
  const pays = S.payments.filter(p => p.userId === u.id);
  const mine = S.searches.filter(s => s.userId === u.id);
  const access = accessOk(sub);
  const st = sub ? sub.status : "none";
  const badge = { trialing: "tag ok", active: "tag ok", past_due: "tag bad", canceled: "tag warn", expired: "tag" }[st] || "tag";

  m.innerHTML = `<div class="wrap mid">
    <div class="rowsplit" style="margin-bottom:16px">
      <div><h1 style="font-size:1.6rem;margin:0">${T("acc.title")}</h1><p class="muted small" style="margin:0">${esc(u.email)}</p></div>
      <a class="btn sm" href="#/">${T("hero.cta")}</a>
    </div>

    ${st === "past_due" ? `<div class="note bad" style="margin-bottom:16px">${L(`Siste betaling mislyktes. Vi prøver igjen ${sub.nextRetryAt ? fdate(sub.nextRetryAt) : ""}. Oppdater betalingsmåten for å beholde tilgangen til ${fdate(sub.graceUntil)}.`, `The last payment failed. We retry ${sub.nextRetryAt ? fdate(sub.nextRetryAt) : ""}. Update your payment method to keep access until ${fdate(sub.graceUntil)}.`)}</div>` : ""}
    ${st === "canceled" ? `<div class="note warn" style="margin-bottom:16px">${L(`Abonnementet er sagt opp. Du har tilgang til ${fdate(sub.periodEnd, true)}, og det blir ingen flere trekk.`, `Your subscription is cancelled. You have access until ${fdate(sub.periodEnd, true)} and there will be no further charges.`)}</div>` : ""}

    <div class="card">
      <div class="rowsplit">
        <h2 style="margin:0">${L("Abonnement", "Subscription")}</h2>
        <span class="${badge}">${statusLabel(sub)}</span>
      </div>
      <dl class="spec" style="margin-top:12px">
        ${specRow(L("Tilgang", "Access"), access ? `<span class="tag ok">${L("Aktiv", "Active")}</span>` : `<span class="tag bad">${L("Ikke aktiv", "Not active")}</span>`)}
        ${specRow(L("Pris", "Price"), sub && sub.status === "trialing" ? `${kr(S.cfg.introPrice)} → ${kr(S.cfg.renewPrice)}/${L("mnd", "mo")}` : kr(S.cfg.renewPrice) + "/" + L("mnd", "mo"))}
        ${specRow(sub && (sub.status === "canceled") ? L("Tilgang til", "Access until") : L("Neste trekk", "Next charge"), sub ? fdate(sub.periodEnd, true) : "—")}
        ${specRow(L("Betalingsmåte", "Payment method"), u.method === "vipps" ? "Vipps ••" + esc(u.last4 || "") : L("Kort", "Card") + " ••••" + esc(u.last4 || ""))}
        ${specRow(L("Søk brukt", "Searches used"), `<span class="mono-num">${al.used} / ${al.limit}</span>`)}
        ${specRow(L("Kunde siden", "Customer since"), fdate(u.createdAt))}
      </dl>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px">
        <button class="btn sm ghost" id="chgpm">${L("Endre betalingsmåte", "Change payment method")}</button>
        ${sub && (sub.status === "trialing" || sub.status === "active" || sub.status === "past_due")
      ? `<button class="btn sm danger" id="cancelbtn">${L("Si opp abonnementet", "Cancel subscription")}</button>` : ""}
        ${sub && sub.status === "canceled" ? `<button class="btn sm" id="resumebtn">${L("Gjenoppta abonnementet", "Resume subscription")}</button>` : ""}
        ${(!sub || sub.status === "expired") ? `<a class="btn sm" href="#/">${L("Start nytt abonnement", "Start a new subscription")}</a>` : ""}
      </div>
    </div>

    <div class="card">
      <h2>${L("Kvitteringer", "Receipts")}</h2>
      ${pays.length ? `<div class="scrollx"><table class="data">
        <thead><tr><th>${L("Dato", "Date")}</th><th>${L("Beskrivelse", "Description")}</th><th>${L("Beløp", "Amount")}</th><th>${L("Herav mva.", "Of which VAT")}</th><th>Status</th><th></th></tr></thead>
        <tbody>${pays.map(p => `<tr>
          <td>${fdate(p.at)}</td>
          <td>${{ intro: L("Introduksjonstilgang 3 dager", "Introductory access, 3 days"), first_renewal: L("Månedsabonnement", "Monthly subscription"), renewal: L("Månedsabonnement", "Monthly subscription"), retry: L("Nytt forsøk", "Retry") }[p.kind] || p.kind}</td>
          <td class="mono-num">${kr(p.amount)}</td><td class="mono-num">${kr(p.vat)}</td>
          <td>${p.status === "succeeded" ? `<span class="tag ok">${L("Betalt", "Paid")}</span>` : `<span class="tag bad">${L("Mislyktes", "Failed")}</span>`}${p.refunded ? ` <span class="tag warn">${L("Refundert", "Refunded")}</span>` : ""}</td>
          <td>${p.status === "succeeded" ? `<button class="linkbtn" data-rcpt="${p.id}">${L("Vis", "View")}</button>` : ""}</td></tr>`).join("")}</tbody></table></div>`
      : `<p class="muted small">${L("Ingen betalinger ennå.", "No payments yet.")}</p>`}
    </div>

    <div class="card">
      <h2>${L("Søkehistorikk", "Search history")}</h2>
      ${mine.length ? `<div class="scrollx"><table class="data">
        <thead><tr><th>${L("Tidspunkt", "Time")}</th><th>${L("Skilt", "Plate")}</th><th>${L("Resultat", "Result")}</th><th></th></tr></thead>
        <tbody>${mine.slice(0, 25).map(s => `<tr><td>${fdate(s.at, true)}</td><td>${esc(prettyPlate(s.plate))}</td>
          <td>${s.result === "found" ? `<span class="tag ok">${L("Treff", "Match")}</span>` : `<span class="tag">${L("Ingen treff", "No match")}</span>`}</td>
          <td>${s.result === "found" ? `<a class="linkbtn" href="#/rapport?nr=${s.plate}">${L("Åpne", "Open")}</a>` : ""}</td></tr>`).join("")}</tbody></table></div>`
      : `<p class="muted small">${L("Ingen søk registrert.", "No searches recorded.")}</p>`}
    </div>

    <div class="card">
      <h2>${L("Konto og personvern", "Account and privacy")}</h2>
      <p class="muted small">${L("Du kan laste ned opplysningene vi har om deg, eller be om sletting. Sletting fjerner konto, søkehistorikk og kontaktopplysninger. Betalingskvitteringer beholdes i regnskapet i den perioden bokføringsloven krever.", "You can download the data we hold about you, or request deletion. Deletion removes your account, search history and contact details. Payment receipts are retained for the period required by accounting law.")}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn sm ghost" id="exportbtn">${L("Last ned mine data", "Download my data")}</button>
        <button class="btn sm danger" id="delbtn">${L("Slett kontoen min", "Delete my account")}</button>
      </div>
    </div>
  </div>`;

  track("account_visit", {});

  const cb = $("#cancelbtn");
  if (cb) cb.onclick = () => cancelFlow(u, sub);
  const rb = $("#resumebtn");
  if (rb) rb.onclick = () => { sub.status = now() < sub.startedAt + S.cfg.introDays * DAY ? "trialing" : "active"; sub.canceledAt = null; save(); toast(L("Abonnementet er gjenopptatt.", "Subscription resumed."), "ok"); render(); };
  $("#chgpm").onclick = () => changeMethod(u);
  m.querySelectorAll("[data-rcpt]").forEach(b => b.onclick = () => showReceipt(b.dataset.rcpt));
  $("#exportbtn").onclick = () => {
    const data = { account: { email: u.email, createdAt: new Date(u.createdAt).toISOString() }, subscription: subOf(u), payments: S.payments.filter(p => p.userId === u.id), searches: S.searches.filter(s => s.userId === u.id) };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "bilfunn-mine-data.json"; a.click();
    track("data_export", {});
  };
  $("#delbtn").onclick = () => {
    modal(`<h2>${L("Slette kontoen?", "Delete your account?")}</h2>
      <p class="muted small">${L("Abonnementet avsluttes umiddelbart og søkehistorikken slettes. Dette kan ikke angres.", "Your subscription ends immediately and your search history is deleted. This cannot be undone.")}</p>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
        <button class="btn sm ghost" id="mNo">${L("Avbryt", "Cancel")}</button>
        <button class="btn sm danger" id="mYes">${L("Slett kontoen", "Delete account")}</button></div>`, () => {
      $("#mNo").onclick = closeModal;
      $("#mYes").onclick = () => {
        sendEmail("deleted", u.email, {});
        if (u.subId) delete S.subs[u.subId];
        S.searches = S.searches.filter(s => s.userId !== u.id);
        S.payments.forEach(p => { if (p.userId === u.id) p.userEmail = "[slettet]"; });
        delete S.users[u.id]; S.session = null; save(); closeModal();
        track("account_deleted", {});
        toast(L("Kontoen er slettet.", "Account deleted.")); go("#/");
      };
    });
  };
});

function showReceipt(id) {
  const p = S.payments.find(x => x.id === id); if (!p) return;
  const u = S.users[p.userId];
  modal(`<h2 style="font-size:1.2rem">${L("Kvittering", "Receipt")} ${p.receipt}</h2>
    <dl class="spec">
      ${specRow(L("Dato", "Date"), fdate(p.at, true))}
      ${specRow(L("Kunde", "Customer"), esc(u ? u.email : "—"))}
      ${specRow(L("Beskrivelse", "Description"), p.kind === "intro" ? L("Introduksjonstilgang, 3 dager", "Introductory access, 3 days") : L("Månedsabonnement Bilfunn", "Bilfunn monthly subscription"))}
      ${specRow(L("Beløp inkl. mva.", "Amount incl. VAT"), kr(p.amount))}
      ${specRow(L("Herav mva. 25 %", "Of which VAT 25%"), kr(p.vat))}
      ${specRow(L("Betalingsmåte", "Payment method"), p.method === "vipps" ? "Vipps" : L("Kort", "Card") + " ••••" + esc(p.last4))}
    </dl>
    <p class="tiny" style="margin-top:12px">Bilfunn AS · Org.nr 000 000 000 MVA · Storgata 1, 0155 Oslo</p>
    <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn sm ghost" id="mClose">${L("Lukk", "Close")}</button></div>`,
    () => { $("#mClose").onclick = closeModal; });
}
function changeMethod(u) {
  modal(`<h2 style="font-size:1.2rem">${L("Endre betalingsmåte", "Change payment method")}</h2>
    <div class="field"><label class="f" for="nm">${L("Nytt kortnummer", "New card number")}</label>
      <input class="input" id="nm" inputmode="numeric" placeholder="4242 4242 4242 4242"><span class="err hide" id="nmErr"></span></div>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button class="btn sm ghost" id="mNo">${L("Avbryt", "Cancel")}</button>
      <button class="btn sm" id="mYes">${L("Lagre", "Save")}</button></div>`, () => {
    $("#mNo").onclick = closeModal;
    $("#mYes").onclick = () => {
      const n = $("#nm").value.replace(/\s/g, "");
      if (!luhn(n)) { $("#nmErr").textContent = L("Kortnummeret er ikke gyldig.", "That card number is not valid."); $("#nmErr").classList.remove("hide"); return; }
      u.method = "card"; u.last4 = n.slice(-4); u.forceFail = (n === "4000000000000002");
      const sub = subOf(u);
      if (sub && sub.status === "past_due" && !u.forceFail) { sub.nextRetryAt = now(); runBilling(); }
      save(); closeModal(); toast(L("Betalingsmåten er oppdatert.", "Payment method updated."), "ok"); render();
    };
  });
}
function cancelFlow(u, sub) {
  const until = fdate(sub.periodEnd, true);
  modal(`<h2 style="font-size:1.25rem">${L("Si opp abonnementet", "Cancel subscription")}</h2>
    <p class="muted small">${L(`Vi stopper alle framtidige trekk med én gang. Du beholder tilgangen ut perioden du har betalt for, til ${until}.`, `We stop all future charges immediately. You keep access for the period you have paid for, until ${until}.`)}</p>
    <div class="field"><label class="f" for="reason">${L("Hvorfor sier du opp? (valgfritt)", "Why are you cancelling? (optional)")}</label>
      <select class="input" id="reason">
        <option value="">${L("Velg en grunn", "Choose a reason")}</option>
        <option>${L("Jeg fant informasjonen jeg trengte", "I found the information I needed")}</option>
        <option>${L("For dyrt", "Too expensive")}</option>
        <option>${L("Manglet opplysninger jeg forventet", "Missing information I expected")}</option>
        <option>${L("Jeg forsto ikke at det var et abonnement", "I did not realise it was a subscription")}</option>
        <option>${L("Annet", "Other")}</option>
      </select></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
      <button class="btn sm ghost" id="mNo">${L("Behold abonnementet", "Keep subscription")}</button>
      <button class="btn sm danger" id="mYes">${L("Bekreft oppsigelse", "Confirm cancellation")}</button></div>`, () => {
    $("#mNo").onclick = closeModal;
    $("#mYes").onclick = () => {
      sub.status = "canceled"; sub.canceledAt = now(); sub.cancelAt = sub.periodEnd;
      sub.cancelReason = $("#reason").value || null;
      sendEmail("canceled", u.email, { until: sub.periodEnd });
      track("subscription_canceled", { reason: sub.cancelReason, day: Math.round((now() - sub.startedAt) / DAY) });
      save(); closeModal();
      toast(L("Abonnementet er sagt opp.", "Subscription cancelled."), "ok"); render();
    };
  });
}
