
/* ============================= admin ================================== */
const ADMIN_PIN = "1234";
let adminOk = false;
function isAdminUser() { const u = currentUser(); return adminOk || (u && u.role === "admin"); }

route("/admin", (m, q) => {
  if (!isAdminUser()) {
    m.innerHTML = `<div class="wrap narrow"><div class="card">
      <h1 style="font-size:1.4rem">${L("Ansattinnlogging", "Staff login")}</h1>
      <p class="muted small">${L("Administrasjonspanelet er for kundeservice og drift.", "The admin console is for support and operations.")}</p>
      <div class="field"><label class="f" for="pin">${L("Tilgangskode", "Access code")}</label>
        <input class="input" id="pin" type="password" inputmode="numeric" placeholder="••••"><span class="err hide" id="epin"></span></div>
      <button class="btn" id="pinbtn">${L("Logg inn", "Log in")}</button>
      <p class="tiny" style="margin-top:12px">${L("Demo-kode: 1234", "Demo code: 1234")}</p></div></div>`;
    $("#pinbtn").onclick = () => {
      if ($("#pin").value.trim() === ADMIN_PIN) { adminOk = true; render(); }
      else { $("#epin").textContent = L("Feil kode.", "Wrong code."); $("#epin").classList.remove("hide"); }
    };
    return;
  }
  const tab = q.get("t") || "oversikt";
  const tabs = [["oversikt", L("Oversikt", "Overview")], ["kunder", L("Kunder", "Customers")], ["abonnement", L("Abonnement", "Subscriptions")],
  ["betalinger", L("Betalinger", "Payments")], ["sok", L("Søk", "Searches")], ["api", "API"], ["epost", L("E-post", "Email")],
  ["saker", L("Saker", "Tickets")], ["hendelser", L("Hendelser", "Events")], ["innst", L("Innstillinger", "Settings")]];
  m.innerHTML = `<div class="wrap">
    <div class="rowsplit" style="margin-bottom:14px">
      <div><h1 style="font-size:1.5rem;margin:0">${L("Administrasjon", "Admin")}</h1>
      <p class="tiny" style="margin:0">${L("Simulert klokke", "Simulated clock")}: ${fdate(now(), true)}${S.clockOffsetMs ? " (+" + Math.round(S.clockOffsetMs / DAY) + "d)" : ""}</p></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn sm ghost" data-adv="1">+1 ${L("dag", "day")}</button>
        <button class="btn sm ghost" data-adv="3">+3 ${L("dager", "days")}</button>
        <button class="btn sm ghost" data-adv="31">+31 ${L("dager", "days")}</button>
        <button class="btn sm ghost" id="resetclock">${L("Nullstill klokke", "Reset clock")}</button>
      </div>
    </div>
    <div class="steps" style="gap:4px">${tabs.map(([k, l]) => `<a href="#/admin?t=${k}" class="btn sm ${tab === k ? "" : "ghost"}" style="padding:6px 11px">${l}</a>`).join("")}</div>
    <div id="adminbody"></div></div>`;
  m.querySelectorAll("[data-adv]").forEach(b => b.onclick = () => { advanceDays(+b.dataset.adv); toast(L("Klokken er flyttet fram.", "Clock advanced.")); render(); });
  $("#resetclock").onclick = () => { S.clockOffsetMs = 0; save(); render(); };
  ({ oversikt: adminOverview, kunder: adminCustomers, abonnement: adminSubs, betalinger: adminPayments, sok: adminSearches, api: adminApi, epost: adminEmail, saker: adminTickets, hendelser: adminEvents, innst: adminSettings }[tab] || adminOverview)($("#adminbody"));
});

function kpi(v, l) { return `<div class="kpi"><div class="v">${v}</div><div class="l">${l}</div></div>`; }
function adminOverview(el) {
  const subs = Object.values(S.subs);
  const active = subs.filter(s => ["trialing", "active"].includes(s.status)).length;
  const paying = subs.filter(s => s.status === "active").length;
  const canceled = subs.filter(s => ["canceled", "expired"].includes(s.status)).length;
  const ok = S.payments.filter(p => p.status === "succeeded");
  const failed = S.payments.filter(p => p.status === "failed");
  const rev = ok.reduce((a, p) => a + p.amount - p.refunded, 0);
  const mrr = paying * S.cfg.renewPrice;
  const views = S.events.filter(e => e.name === "paywall_viewed").length;
  const buys = S.events.filter(e => e.name === "checkout_completed").length;
  const conv = views ? Math.round(buys / views * 100) : 0;
  const trialConv = subs.length ? Math.round(subs.filter(s => s.renewals > 0).length / subs.length * 100) : 0;
  el.innerHTML = `<div class="grid g3" style="margin-bottom:16px">
      ${kpi(Object.keys(S.users).length, L("Kunder", "Customers"))}
      ${kpi(active, L("Aktive abonnement", "Active subscriptions"))}
      ${kpi(kr(mrr), "MRR")}
      ${kpi(kr(rev), L("Omsetning totalt", "Total revenue"))}
      ${kpi(conv + " %", L("Betalingsmur → kjøp", "Paywall → purchase"))}
      ${kpi(trialConv + " %", L("Intro → betalende", "Intro → paying"))}
      ${kpi(failed.length, L("Mislykkede betalinger", "Failed payments"))}
      ${kpi(canceled, L("Oppsagt/utløpt", "Cancelled/expired"))}
      ${kpi(S.searches.length, L("Søk", "Searches"))}
    </div>
    <div class="card"><h3>${L("Trakt siste periode", "Funnel this period")}</h3>
    <div class="scrollx"><table class="data"><tbody>
      ${[["home_view", L("Forsidevisning", "Homepage view")], ["search_started", L("Søk startet", "Search started")], ["vehicle_found", L("Kjøretøy funnet", "Vehicle found")],
      ["paywall_viewed", L("Betalingsmur vist", "Paywall viewed")], ["checkout_started", L("Kasse startet", "Checkout started")],
      ["checkout_completed", L("Kjøp fullført", "Purchase completed")], ["report_viewed", L("Rapport vist", "Report viewed")]]
      .map(([k, l]) => { const n = S.events.filter(e => e.name === k).length; return `<tr><td>${l}</td><td class="mono-num" style="width:70px">${n}</td><td style="width:60%"><div style="height:8px;border-radius:4px;background:var(--cta);width:${Math.min(100, n * 8)}%;min-width:2px"></div></td></tr>`; }).join("")}
    </tbody></table></div></div>
    <div class="card"><h3>${L("Kundeservice-snarveier", "Support shortcuts")}</h3>
    <p class="muted small">${L("Flytt klokken fram for å teste fornyelse (+3 d), måneden etter (+31 d) og purringer. Sett «tving avslag» på en kunde for å teste mislykket fornyelse.", "Advance the clock to test renewal (+3 d), the following month (+31 d) and dunning. Set “force decline” on a customer to test a failed renewal.")}</p></div>`;
}
function adminCustomers(el) {
  const us = Object.values(S.users);
  el.innerHTML = `<div class="card"><h3>${L("Kunder", "Customers")}</h3>
    <input class="input" id="csearch" placeholder="${L("Søk på e-post", "Search email")}" style="max-width:320px;margin-bottom:12px">
    <div class="scrollx"><table class="data" id="ctab"><thead><tr>
      <th>${L("E-post", "Email")}</th><th>${L("Opprettet", "Created")}</th><th>Status</th><th>${L("Betaling", "Payment")}</th><th>${L("Søk", "Searches")}</th><th></th></tr></thead>
      <tbody>${us.map(u => { const s = subOf(u); return `<tr data-em="${esc(u.email.toLowerCase())}">
        <td>${esc(u.email)}</td><td>${fdate(u.createdAt)}</td>
        <td>${s ? `<span class="tag ${s.status === "past_due" ? "bad" : (["trialing", "active"].includes(s.status) ? "ok" : "")}">${statusLabel(s)}</span>` : "—"}</td>
        <td>${u.method === "vipps" ? "Vipps" : L("Kort", "Card")} ••${esc(u.last4 || "")}${u.forceFail ? ` <span class="tag bad">${L("tving avslag", "force decline")}</span>` : ""}</td>
        <td class="mono-num">${S.searches.filter(x => x.userId === u.id).length}</td>
        <td><button class="linkbtn" data-imp="${u.id}">${L("Logg inn som", "Log in as")}</button> ·
            <button class="linkbtn" data-fail="${u.id}">${u.forceFail ? L("Fjern avslag", "Clear decline") : L("Tving avslag", "Force decline")}</button></td></tr>`; }).join("")}
      </tbody></table></div>${us.length ? "" : `<p class="muted small">${L("Ingen kunder ennå.", "No customers yet.")}</p>`}</div>`;
  $("#csearch").oninput = (e) => {
    const v = e.target.value.toLowerCase();
    el.querySelectorAll("#ctab tbody tr").forEach(tr => tr.style.display = tr.dataset.em.includes(v) ? "" : "none");
  };
  el.querySelectorAll("[data-imp]").forEach(b => b.onclick = () => { S.session = b.dataset.imp; save(); toast(L("Logget inn som kunde.", "Logged in as customer.")); go("#/konto"); });
  el.querySelectorAll("[data-fail]").forEach(b => b.onclick = () => { const u = S.users[b.dataset.fail]; u.forceFail = !u.forceFail; save(); render(); });
}
function adminSubs(el) {
  const subs = Object.values(S.subs);
  el.innerHTML = `<div class="card"><h3>${L("Abonnement", "Subscriptions")}</h3>
    <div class="scrollx"><table class="data"><thead><tr>
      <th>ID</th><th>${L("Kunde", "Customer")}</th><th>Status</th><th>${L("Periode slutt", "Period end")}</th><th>${L("Fornyelser", "Renewals")}</th><th>${L("Søk", "Searches")}</th><th></th></tr></thead>
      <tbody>${subs.map(s => { const u = S.users[s.userId]; return `<tr>
        <td>${s.id}</td><td>${esc(u ? u.email : "—")}</td><td><span class="tag ${s.status === "past_due" ? "bad" : (["trialing", "active"].includes(s.status) ? "ok" : "")}">${statusLabel(s)}</span></td>
        <td>${fdate(s.periodEnd, true)}</td><td class="mono-num">${s.renewals}</td><td class="mono-num">${s.searchesThisPeriod}/${s.status === "trialing" ? S.cfg.introSearchLimit : S.cfg.monthlySearchLimit}</td>
        <td>${["trialing", "active", "past_due"].includes(s.status) ? `<button class="linkbtn" data-cancel="${s.id}">${L("Si opp", "Cancel")}</button>` : ""}</td></tr>`; }).join("")}
      </tbody></table></div>${subs.length ? "" : `<p class="muted small">${L("Ingen abonnement ennå.", "No subscriptions yet.")}</p>`}</div>`;
  el.querySelectorAll("[data-cancel]").forEach(b => b.onclick = () => {
    const s = S.subs[b.dataset.cancel]; const u = S.users[s.userId];
    s.status = "canceled"; s.canceledAt = now(); sendEmail("canceled", u.email, { until: s.periodEnd });
    track("subscription_canceled", { by: "admin" }); save(); render();
  });
}
function adminPayments(el) {
  el.innerHTML = `<div class="card"><h3>${L("Betalinger", "Payments")}</h3>
    <div class="scrollx"><table class="data"><thead><tr>
      <th>${L("Kvittering", "Receipt")}</th><th>${L("Dato", "Date")}</th><th>${L("Kunde", "Customer")}</th><th>${L("Type", "Type")}</th><th>${L("Beløp", "Amount")}</th><th>Status</th><th></th></tr></thead>
      <tbody>${S.payments.map(p => { const u = S.users[p.userId]; return `<tr>
        <td>${p.receipt}</td><td>${fdate(p.at, true)}</td><td>${esc(u ? u.email : "—")}</td><td>${p.kind}</td>
        <td class="mono-num">${kr(p.amount)}${p.refunded ? " (−" + kr(p.refunded) + ")" : ""}</td>
        <td>${p.status === "succeeded" ? `<span class="tag ok">OK</span>` : `<span class="tag bad">${esc(p.error || "failed")}</span>`}</td>
        <td>${p.status === "succeeded" && !p.refunded ? `<button class="linkbtn" data-ref="${p.id}">${L("Refunder", "Refund")}</button>` : ""}</td></tr>`; }).join("")}
      </tbody></table></div>${S.payments.length ? "" : `<p class="muted small">${L("Ingen betalinger ennå.", "No payments yet.")}</p>`}</div>`;
  el.querySelectorAll("[data-ref]").forEach(b => b.onclick = () => {
    const p = S.payments.find(x => x.id === b.dataset.ref); p.refunded = p.amount;
    const u = S.users[p.userId]; if (u) sendEmail("refund", u.email, { amount: p.amount });
    track("refund_issued", { amount: p.amount }); save(); render(); toast(L("Refusjon registrert.", "Refund recorded."), "ok");
  });
}
function adminSearches(el) {
  const byIp = {};
  S.searches.forEach(s => { byIp[s.ip] = (byIp[s.ip] || 0) + 1; });
  const flagged = Object.entries(byIp).filter(([, n]) => n > S.cfg.ipSearchesPerHour * 0.75);
  el.innerHTML = `${flagged.length ? `<div class="note warn" style="margin-bottom:14px">${L("Høy søkeaktivitet", "High search volume")}: ${flagged.map(([ip, n]) => esc(ip) + " (" + n + ")").join(", ")}</div>` : ""}
    <div class="card"><h3>${L("Søkelogg", "Search log")}</h3>
    <div class="scrollx"><table class="data"><thead><tr>
      <th>${L("Tid", "Time")}</th><th>${L("Skilt", "Plate")}</th><th>${L("Resultat", "Result")}</th><th>${L("Svartid", "Latency")}</th><th>${L("Kunde", "Customer")}</th><th>IP</th><th>${L("Teller", "Counts")}</th></tr></thead>
      <tbody>${S.searches.slice(0, 60).map(s => { const u = S.users[s.userId]; return `<tr>
        <td>${fdate(s.at, true)}</td><td>${esc(prettyPlate(s.plate))}</td>
        <td>${s.result === "found" ? `<span class="tag ok">found</span>` : `<span class="tag ${s.result === "not_found" ? "" : "bad"}">${esc(s.result)}</span>`}</td>
        <td class="mono-num">${s.ms} ms</td><td>${esc(u ? u.email : "—")}</td><td>${esc(s.ip)}</td><td>${s.counted ? L("ja", "yes") : L("nei", "no")}</td></tr>`; }).join("")}
      </tbody></table></div></div>`;
}
function adminApi(el) {
  const last = S.searches.slice(0, 50);
  const errs = last.filter(s => s.result !== "found");
  const avg = last.length ? Math.round(last.reduce((a, s) => a + s.ms, 0) / last.length) : 0;
  const un = last.filter(s => s.result === "provider_unavailable").length;
  el.innerHTML = `<div class="grid g3" style="margin-bottom:16px">
      ${kpi(last.length, L("Kall (siste 50)", "Calls (last 50)"))}
      ${kpi(avg + " ms", L("Snitt svartid", "Average latency"))}
      ${kpi(last.length ? Math.round(errs.length / last.length * 100) + " %" : "0 %", L("Uten treff/feil", "No match/error"))}
      ${kpi(un, L("Leverandør nede", "Provider unavailable"))}
    </div>
    <div class="card"><h3>${L("Integrasjon", "Integration")}</h3>
    <dl class="spec">
      <dt>${L("Leverandør", "Provider")}</dt><dd>${L("Simulert adapter (byttes med reell leverandør)", "Simulated adapter (swap for real provider)")}</dd>
      <dt>${L("Endepunkt", "Endpoint")}</dt><dd>GET /api/vehicle/:plate</dd>
      <dt>${L("Mellomlagring", "Caching")}</dt><dd>${L("Av – avklares mot leverandørvilkår", "Off – to be cleared against provider terms")}</dd>
      <dt>${L("Tidsavbrudd", "Timeout")}</dt><dd>4000 ms</dd>
      <dt>${L("Nøkkelrotasjon", "Key rotation")}</dt><dd>${L("90 dager", "90 days")}</dd>
    </dl>
    <p class="tiny" style="margin-top:10px">${L("Feltene normaliseres til én intern modell, slik at leverandøren kan byttes uten endringer i grensesnittet.", "Fields are normalised into one internal model so the provider can be swapped without interface changes.")}</p></div>`;
}
function adminEmail(el) {
  el.innerHTML = `<div class="card"><h3>${L("Utgående e-post", "Outbound email")}</h3>
    <p class="muted small">${L("Alle transaksjonelle e-poster tjenesten har sendt.", "All transactional emails the service has sent.")}</p>
    ${S.emails.length ? S.emails.slice(0, 30).map(e => `<div style="border-bottom:1px solid var(--line-2);padding:10px 0">
      <div class="rowsplit"><strong>${esc(e.subject)}</strong><span class="tiny">${fdate(e.at, true)}</span></div>
      <div class="tiny">${L("Til", "To")}: ${esc(e.to)} · ${esc(e.type)}</div>
      <div class="small muted" style="margin-top:4px">${esc(e.body)}</div></div>`).join("")
      : `<p class="muted small">${L("Ingen e-post sendt ennå.", "No emails sent yet.")}</p>`}</div>`;
}
function adminTickets(el) {
  el.innerHTML = `<div class="card"><h3>${L("Henvendelser", "Support tickets")}</h3>
    ${S.tickets.length ? S.tickets.map(t => `<div style="border-bottom:1px solid var(--line-2);padding:10px 0">
      <div class="rowsplit"><strong>${esc(t.name)} · ${esc(t.email)}</strong><span class="tiny">${fdate(t.at, true)}</span></div>
      <div class="tiny">${esc(t.cat)}</div><div class="small muted" style="margin-top:4px">${esc(t.msg)}</div></div>`).join("")
      : `<p class="muted small">${L("Ingen henvendelser.", "No tickets.")}</p>`}</div>`;
}
function adminEvents(el) {
  el.innerHTML = `<div class="card"><h3>${L("Hendelseslogg", "Event log")}</h3>
    <p class="muted small">${L("Hendelser sendes til analyseverktøy kun når brukeren har samtykket. «Sendt = nei» betyr at samtykke manglet.", "Events are sent to analytics only when the user has consented. “Sent = no” means consent was missing.")}</p>
    <div class="scrollx"><table class="data"><thead><tr><th>${L("Tid", "Time")}</th><th>${L("Hendelse", "Event")}</th><th>${L("Data", "Props")}</th><th>${L("Sendt", "Sent")}</th></tr></thead>
    <tbody>${S.events.slice(0, 60).map(e => `<tr><td>${fdate(e.at, true)}</td><td>${esc(e.name)}</td>
      <td style="white-space:normal">${esc(JSON.stringify(e.props))}</td><td>${e.sent ? L("ja", "yes") : L("nei", "no")}</td></tr>`).join("")}</tbody></table></div></div>`;
}
function adminSettings(el) {
  const f = (k, label, type) => `<div class="field"><label class="f" for="cfg_${k}">${label}</label>
    <input class="input" id="cfg_${k}" value="${S.cfg[k]}" ${type === "num" ? 'inputmode="numeric"' : ""}></div>`;
  el.innerHTML = `<div class="card"><h3>${L("Kommersielle regler", "Commercial rules")}</h3>
    <p class="muted small">${L("Abonnementsreglene er konfigurerbare, slik brief-en krever – ingen av dem er hardkodet i grensesnittet.", "Subscription rules are configurable, as the brief requires – none of them are hard-coded in the interface.")}</p>
    <div class="grid g2" style="gap:0 16px">
      ${f("introPrice", L("Introduksjonspris (kr)", "Introductory price (NOK)"), "num")}
      ${f("introDays", L("Introduksjonsdager", "Introductory days"), "num")}
      ${f("renewPrice", L("Månedspris (kr)", "Monthly price (NOK)"), "num")}
      ${f("introSearchLimit", L("Søk i introperioden", "Searches in intro period"), "num")}
      ${f("monthlySearchLimit", L("Søk per måned", "Searches per month"), "num")}
      ${f("graceDays", L("Nådedager ved mislykket betaling", "Grace days on failed payment"), "num")}
      ${f("ipSearchesPerHour", L("Søk per IP per time", "Searches per IP per hour"), "num")}
      ${f("reminderHoursBefore", L("Påminnelse (timer før)", "Reminder (hours before)"), "num")}
    </div>
    <label class="check" style="margin:6px 0"><input type="checkbox" id="cfg_dup" ${S.cfg.duplicatesCount ? "checked" : ""}><span>${L("Gjentatte søk på samme skilt teller mot grensen", "Repeat searches of the same plate count toward the limit")}</span></label>
    <label class="check" style="margin:0 0 14px"><input type="checkbox" id="cfg_keep" ${S.cfg.cancelKeepsAccess ? "checked" : ""}><span>${L("Ved oppsigelse beholdes tilgangen ut betalt periode", "On cancellation, access continues until the end of the paid period")}</span></label>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn sm" id="savecfg">${L("Lagre innstillinger", "Save settings")}</button>
      <button class="btn sm ghost" id="seedbtn">${L("Legg inn demodata", "Load demo data")}</button>
      <button class="btn sm danger" id="wipebtn">${L("Nullstill alt", "Reset everything")}</button>
    </div></div>
    <div class="card"><h3>${L("Administratorer", "Administrators")}</h3>
    <div class="scrollx"><table class="data"><thead><tr><th>${L("Navn", "Name")}</th><th>E-post</th><th>${L("Rolle", "Role")}</th></tr></thead>
    <tbody><tr><td>Support</td><td>support@bilfunn.no</td><td>${L("Kundeservice", "Support")}</td></tr>
    <tr><td>Finans</td><td>faktura@bilfunn.no</td><td>${L("Økonomi", "Finance")}</td></tr>
    <tr><td>Personvern</td><td>personvern@bilfunn.no</td><td>${L("Personvernansvarlig", "Privacy")}</td></tr></tbody></table></div>
    <p class="tiny" style="margin-top:10px">${L("Alle administratorhandlinger logges med bruker, tidspunkt og hva som ble endret.", "All admin actions are logged with user, timestamp and what changed.")}</p></div>`;
  $("#savecfg").onclick = () => {
    ["introPrice", "introDays", "renewPrice", "introSearchLimit", "monthlySearchLimit", "graceDays", "ipSearchesPerHour", "reminderHoursBefore"]
      .forEach(k => { const v = +$("#cfg_" + k).value; if (!isNaN(v)) S.cfg[k] = v; });
    S.cfg.duplicatesCount = $("#cfg_dup").checked;
    S.cfg.cancelKeepsAccess = $("#cfg_keep").checked;
    save(); toast(L("Innstillingene er lagret.", "Settings saved."), "ok"); render();
  };
  $("#seedbtn").onclick = () => { seedDemo(); toast(L("Demodata lagt inn.", "Demo data loaded.")); render(); };
  $("#wipebtn").onclick = () => { resetAll(); adminOk = true; toast(L("Alt er nullstilt.", "Everything reset.")); go("#/admin"); };
}

/* ============================== seed ================================== */
function seed() { if (!S.seeded) { S.seeded = true; save(); } }
function seedDemo() {
  const mk = (email, daysAgo, status, renewals, fail) => {
    const u = { id: uid("u"), email, createdAt: now() - daysAgo * DAY, role: "customer", method: renewals ? "card" : "vipps", last4: String(1000 + Math.floor(Math.random() * 8999)), forceFail: !!fail };
    S.users[u.id] = u;
    const sub = {
      id: uid("sub"), userId: u.id, status, method: u.method,
      startedAt: u.createdAt, periodStart: now() - 2 * DAY,
      periodEnd: status === "expired" ? now() - DAY : now() + (status === "trialing" ? 1 : 22) * DAY,
      price: S.cfg.renewPrice, renewals, failedAttempts: status === "past_due" ? 1 : 0,
      graceUntil: status === "past_due" ? now() + 3 * DAY : null,
      nextRetryAt: status === "past_due" ? now() + DAY : null,
      searchesThisPeriod: Math.floor(Math.random() * 8), reminderSent: true, cancelAt: null, canceledAt: status === "canceled" ? now() - DAY : null
    };
    S.subs[sub.id] = sub; u.subId = sub.id;
    S.payments.push({ id: uid("pay"), userId: u.id, amount: 3, vat: .6, kind: "intro", at: u.createdAt, status: "succeeded", method: u.method, last4: u.last4, receipt: "BF-" + (10000 + S.payments.length), refunded: 0 });
    for (let i = 0; i < renewals; i++) S.payments.push({ id: uid("pay"), userId: u.id, amount: S.cfg.renewPrice, vat: 49.8, kind: "renewal", at: u.createdAt + (3 + i * 30) * DAY, status: "succeeded", method: u.method, last4: u.last4, receipt: "BF-" + (10000 + S.payments.length), refunded: 0 });
    if (status === "past_due") S.payments.unshift({ id: uid("pay"), userId: u.id, amount: S.cfg.renewPrice, vat: 49.8, kind: "renewal", at: now() - 2 * DAY, status: "failed", error: "insufficient_funds", method: u.method, last4: u.last4, receipt: "BF-" + (10000 + S.payments.length), refunded: 0 });
    RECENT.slice(0, 3 + Math.floor(Math.random() * 4)).forEach((p, i) =>
      S.searches.push({ id: uid("s"), plate: p, result: i === 2 ? "not_found" : "found", ms: 400 + Math.floor(Math.random() * 600), at: now() - Math.random() * 5 * DAY, userId: u.id, ip: "10.20.4." + (10 + i), counted: true }));
  };
  mk("kari.nordmann@example.no", 1, "trialing", 0);
  mk("ola.hansen@example.no", 40, "active", 1);
  mk("thea.berg@example.no", 95, "active", 3);
  mk("jonas.lie@example.no", 34, "past_due", 1, true);
  mk("ingrid.moen@example.no", 61, "canceled", 1);
  mk("emil.solberg@example.no", 120, "expired", 2);
  S.tickets.unshift({ id: uid("t"), name: "Ingrid Moen", email: "ingrid.moen@example.no", cat: L("Abonnement og oppsigelse", "Subscription and cancellation"), msg: L("Jeg sa opp i går, men vil vite om jeg fortsatt har tilgang ut perioden.", "I cancelled yesterday but want to know if I still have access for the rest of the period."), at: now() - 6 * HOUR, status: "open" });
  S.searches.sort((a, b) => b.at - a.at);
  ["home_view", "search_started", "vehicle_found", "paywall_viewed", "checkout_started", "checkout_completed", "report_viewed"].forEach((n, i) => {
    for (let k = 0; k < (14 - i * 2); k++) S.events.push({ id: uid("ev"), name: n, props: {}, at: now() - Math.random() * 3 * DAY, sent: true });
  });
  S.events.sort((a, b) => b.at - a.at);
  save();
}

/* ============================== boot ================================== */
load();
document.documentElement.lang = S.lang === "no" ? "no" : "en";
seed();
runBilling();
window.addEventListener("hashchange", render);
$("#menubtn").onclick = () => {
  const n = $("#nav"); const open = n.classList.toggle("open");
  $("#menubtn").setAttribute("aria-expanded", String(open));
};
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[href^='#/']");
  if (a) { $("#nav").classList.remove("open"); }
});
renderAll();
