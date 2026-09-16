
/* ========================= content pages ============================== */
const FAQ = () => [
  [L("Hvordan finner jeg ut hvem som eier en bil?", "How do I find out who owns a car?"),
  L("Skriv inn registreringsnummeret i søkefeltet på forsiden. Du får først en gratis bekreftelse på hvilket kjøretøy det gjelder. Etter betaling vises eieropplysningene som er tilgjengelige for kjøretøyet.", "Enter the registration number in the search field on the front page. You first get a free confirmation of which vehicle it is. After payment, the owner information available for that vehicle is shown.")],
  [L("Hva koster tjenesten?", "What does the service cost?"),
  L("3 kr for de første 3 dagene. Etter det fornyes abonnementet automatisk til 249 kr per måned inntil du sier opp. Prisen og fornyelsen vises før du betaler.", "NOK 3 for the first 3 days. After that the subscription renews automatically at NOK 249 per month until you cancel. The price and the renewal are shown before you pay.")],
  [L("Hvordan sier jeg opp?", "How do I cancel?"),
  L("Logg inn og velg «Si opp abonnementet» på Min side. Det tar to klikk, og du trenger ikke kontakte kundeservice. Du beholder tilgangen ut perioden du har betalt for.", "Log in and choose “Cancel subscription” on My page. It takes two clicks and you do not need to contact support. You keep access for the period you have paid for.")],
  [L("Hvor mange søk kan jeg gjøre?", "How many searches can I do?"),
  L("Inntil 10 oppslag i introduksjonsperioden og 50 per måned med aktivt abonnement. Gjentatte oppslag på samme skilt innen 24 timer teller ikke.", "Up to 10 lookups during the introductory period and 50 per month with an active subscription. Repeat lookups of the same plate within 24 hours do not count.")],
  [L("Hvor kommer opplysningene fra?", "Where does the information come from?"),
  L("Kjøretøyopplysningene hentes fra tilgjengelige registerkilder via vår dataleverandør. Vi er en uavhengig kommersiell tjeneste og har ingen tilknytning til Statens vegvesen.", "Vehicle information is retrieved from available register sources through our data provider. We are an independent commercial service with no affiliation to Statens vegvesen.")],
  [L("Hvorfor finner dere ikke kjøretøyet mitt?", "Why can't you find my vehicle?"),
  L("Avregistrerte kjøretøy, enkelte tilhengere, mopeder og kjøretøy med skjermet eier kan mangle i kilden. Kontroller også at nummeret er skrevet riktig.", "Deregistered vehicles, some trailers, mopeds and vehicles with protected owners may be missing from the source. Also check the number is typed correctly.")],
  [L("Kan jeg få pengene tilbake?", "Can I get a refund?"),
  L("Digitale tjenester leveres umiddelbart, og angreretten bortfaller når du har åpnet rapporten. Har noe gått galt teknisk, refunderer vi. Kontakt oss innen 14 dager.", "Digital services are delivered immediately and the right of withdrawal lapses once you open the report. If something went wrong technically, we refund. Contact us within 14 days.")],
  [L("Kan jeg søke på alle kjøretøytyper?", "Can I search all vehicle types?"),
  L("Personbiler, varebiler, motorsykler, tilhengere og campingvogner med gyldig norsk kjennemerke dekkes så langt kilden har data.", "Cars, vans, motorcycles, trailers and caravans with a valid Norwegian plate are covered as far as the source has data.")]
];
function faqHtml(limit) {
  return FAQ().slice(0, limit || 99).map(([q, a]) => `<details><summary>${q}</summary><div class="ans">${a}</div></details>`).join("");
}
route("/faq", (m) => {
  m.innerHTML = `<div class="wrap mid"><h1>${L("Spørsmål og svar", "Questions and answers")}</h1>
    <div class="card faq">${faqHtml()}</div>
    <div class="card" style="margin-top:16px"><div class="rowsplit">
      <span>${L("Fant du ikke svaret?", "Didn't find the answer?")}</span>
      <a class="btn sm" href="#/kontakt">${L("Kontakt kundeservice", "Contact support")}</a></div></div></div>`;
});
route("/hvordan", (m) => {
  const st = [
    [L("Søk på registreringsnummeret", "Search the registration number"), L("Skriv inn skiltet på forsiden. Vi normaliserer mellomrom og små bokstaver automatisk.", "Type the plate on the front page. We normalise spaces and lower case automatically.")],
    [L("Bekreft kjøretøyet", "Confirm the vehicle"), L("Du ser merke, modell, årsmodell og farge gratis, slik at du vet at du har funnet riktig bil.", "You see make, model, year and colour for free, so you know you found the right car.")],
    [L("Betal 3 kr", "Pay NOK 3"), L("Vipps eller bankkort. Kontoen din opprettes automatisk – ingen registrering på forhånd.", "Vipps or bank card. Your account is created automatically – no registration up front.")],
    [L("Les rapporten", "Read the report"), L("Eieropplysninger, teknisk informasjon, EU-kontroll, historikk og heftelser vises umiddelbart.", "Owner information, technical details, EU inspection, history and liens are shown immediately.")]
  ];
  m.innerHTML = `<div class="wrap mid"><h1>${L("Slik virker det", "How it works")}</h1>
    <p class="muted" style="max-width:62ch">${L("Fire steg fra skilt til rapport. Det tar under et minutt.", "Four steps from plate to report. It takes less than a minute.")}</p>
    <div class="grid" style="margin-top:20px">
      ${st.map(([h, p], i) => `<div class="card"><div class="rowsplit" style="align-items:flex-start;flex-wrap:nowrap;gap:14px">
        <div style="flex:none;width:34px;height:34px;border-radius:50%;background:var(--cta);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700">${i + 1}</div>
        <div style="flex:1"><h3 style="margin:2px 0 4px">${h}</h3><p class="muted small" style="margin:0">${p}</p></div></div></div>`).join("")}
    </div>
    <div class="card" style="margin-top:16px"><div style="max-width:420px">${searchWidget()}</div></div></div>`;
  wireSearch(m);
});
route("/priser", (m) => {
  m.innerHTML = `<div class="wrap mid"><h1>${L("Priser", "Pricing")}</h1>
  <p class="muted" style="max-width:62ch">${L("Én pris, ingen skjulte tillegg. Du ser alltid hva du betaler og når neste trekk skjer.", "One price, no hidden extras. You always see what you pay and when the next charge happens.")}</p>
  <div class="grid g2" style="margin-top:20px">
    <div class="pricebox">
      <div class="top"><div class="amt">${kr(3)}</div><div style="opacity:.9">${L("første 3 dager", "first 3 days")}</div></div>
      <div class="body"><ul class="terms-list">
        <li>${ICON.check}<span>${L("Inntil 10 oppslag", "Up to 10 lookups")}</span></li>
        <li>${ICON.check}<span>${L("Full rapport på hvert kjøretøy", "Full report on each vehicle")}</span></li>
        <li>${ICON.check}<span>${L("Går automatisk over til månedsabonnement", "Automatically continues as a monthly subscription")}</span></li>
      </ul><a class="btn block" href="#/" style="margin-top:14px">${L("Start søk", "Start a search")}</a></div>
    </div>
    <div class="card">
      <h2 style="margin-bottom:4px">${kr(249)}<span class="muted" style="font-size:1rem;font-weight:400">/${L("mnd", "mo")}</span></h2>
      <p class="muted small">${L("Fra dag 4, inntil du sier opp.", "From day 4, until you cancel.")}</p>
      <ul class="terms-list">
        <li>${ICON.check}<span>${L("50 oppslag per måned", "50 lookups per month")}</span></li>
        <li>${ICON.check}<span>${L("Søkehistorikk og kvitteringer", "Search history and receipts")}</span></li>
        <li>${ICON.check}<span>${L("Oppsigelse på Min side, uten oppsigelsestid", "Cancel on My page, no notice period")}</span></li>
        <li>${ICON.check}<span>${L("E-postvarsel før hver fornyelse", "Email notice before each renewal")}</span></li>
      </ul>
    </div>
  </div>
  <div class="note" style="margin-top:16px">${L("Alle priser er inkludert 25 % merverdiavgift. Betaling skjer med Vipps eller bankkort. Trekket vises som «BILFUNN» på kontoutskriften.", "All prices include 25% VAT. Payment is by Vipps or bank card. The charge appears as “BILFUNN” on your statement.")}</div>
  </div>`;
});
route("/om-oss", (m) => {
  m.innerHTML = `<div class="wrap narrow"><h1>${L("Om oss", "About us")}</h1>
  <div class="card">
    <p>${L("Bilfunn er en norsk tjeneste som gjør det enkelt for privatpersoner å slå opp opplysninger om et kjøretøy før et bruktbilkjøp, etter en parkeringsepisode eller når man bare lurer.", "Bilfunn is a Norwegian service that makes it easy for private individuals to look up information about a vehicle before a used-car purchase, after a parking incident, or simply out of curiosity.")}</p>
    <p>${L("Vi henter opplysninger fra tilgjengelige registerkilder gjennom vår dataleverandør, normaliserer dem og presenterer dem på en måte som er lett å forstå. Vi er en uavhengig kommersiell aktør og er ikke eid, drevet eller godkjent av Statens vegvesen eller andre myndigheter.", "We retrieve information from available register sources through our data provider, normalise it and present it in a way that is easy to understand. We are an independent commercial operator and are not owned, operated or endorsed by Statens vegvesen or any other authority.")}</p>
    <p>${L("Vi mener oppslag på personopplysninger krever at vi er tydelige: du skal alltid vite hva du betaler, hvor lenge tilgangen varer og hvordan du avslutter.", "We believe looking up personal data requires us to be clear: you should always know what you pay, how long access lasts and how to cancel.")}</p>
    <dl class="spec" style="margin-top:8px">
      <dt>${L("Selskap", "Company")}</dt><dd>Bilfunn AS</dd>
      <dt>${L("Organisasjonsnummer", "Organisation number")}</dt><dd>000 000 000 MVA</dd>
      <dt>${L("Adresse", "Address")}</dt><dd>Storgata 1, 0155 Oslo</dd>
      <dt>${L("Kundeservice", "Support")}</dt><dd>support@bilfunn.no</dd>
      <dt>${L("Personvernansvarlig", "Privacy contact")}</dt><dd>personvern@bilfunn.no</dd>
    </dl>
  </div></div>`;
});
route("/kontakt", (m) => {
  const u = currentUser();
  m.innerHTML = `<div class="wrap narrow"><h1>${L("Kontakt oss", "Contact us")}</h1>
  <p class="muted">${L("Vi svarer normalt innen én virkedag. Gjelder det oppsigelse, kan du gjøre det selv på Min side med én gang.", "We normally reply within one working day. For cancellation, you can do it yourself on My page straight away.")}</p>
  <div class="card"><form id="kform" novalidate>
    <div class="grid g2" style="gap:12px">
      <div class="field"><label class="f" for="knavn">${L("Navn", "Name")}</label><input class="input" id="knavn" autocomplete="name"><span class="err hide" id="eknavn"></span></div>
      <div class="field"><label class="f" for="kepost">${T("co.email")}</label><input class="input" id="kepost" type="email" value="${u ? esc(u.email) : ""}"><span class="err hide" id="ekepost"></span></div>
    </div>
    <div class="field"><label class="f" for="kkat">${L("Kategori", "Category")}</label>
      <select class="input" id="kkat">
        <option>${L("Abonnement og oppsigelse", "Subscription and cancellation")}</option>
        <option>${L("Betaling og kvittering", "Payment and receipt")}</option>
        <option>${L("Feil i kjøretøyopplysninger", "Error in vehicle information")}</option>
        <option>${L("Personvern og sletting", "Privacy and deletion")}</option>
        <option>${L("Annet", "Other")}</option>
      </select></div>
    <div class="field"><label class="f" for="kmsg">${L("Melding", "Message")}</label>
      <textarea class="input" id="kmsg" rows="5" placeholder="${L("Beskriv saken din …", "Describe your enquiry …")}"></textarea><span class="err hide" id="ekmsg"></span></div>
    <button class="btn" type="submit">${L("Send melding", "Send message")}</button>
  </form></div>
  <div class="card"><h3>${L("Andre måter å nå oss på", "Other ways to reach us")}</h3>
    <dl class="spec"><dt>E-post</dt><dd>support@bilfunn.no</dd>
    <dt>${L("Fakturaspørsmål", "Billing")}</dt><dd>faktura@bilfunn.no</dd>
    <dt>${L("Personvern", "Privacy")}</dt><dd>personvern@bilfunn.no</dd>
    <dt>${L("Post", "Post")}</dt><dd>Bilfunn AS, Storgata 1, 0155 Oslo</dd></dl></div></div>`;
  $("#kform").onsubmit = (e) => {
    e.preventDefault();
    let bad = false;
    const f = (id, msg) => { const el = $("#" + id); el.textContent = msg; el.classList.remove("hide"); bad = true; };
    m.querySelectorAll(".err").forEach(el => el.classList.add("hide"));
    if (!$("#knavn").value.trim()) f("eknavn", L("Skriv inn navnet ditt.", "Enter your name."));
    if (!validEmail($("#kepost").value)) f("ekepost", L("Skriv inn en gyldig e-postadresse.", "Enter a valid email address."));
    if ($("#kmsg").value.trim().length < 10) f("ekmsg", L("Skriv litt mer, slik at vi kan hjelpe deg.", "Write a little more so we can help you."));
    if (bad) return;
    S.tickets.unshift({ id: uid("t"), name: $("#knavn").value.trim(), email: $("#kepost").value.trim(), cat: $("#kkat").value, msg: $("#kmsg").value.trim(), at: now(), status: "open" });
    save(); track("support_ticket", { cat: $("#kkat").value });
    $("#kform").outerHTML = `<div class="note ok">${L("Takk. Meldingen er mottatt, og vi svarer på e-post innen én virkedag.", "Thank you. Your message has been received and we will reply by email within one working day.")}</div>`;
  };
});

/* --------------------------- legal pages ------------------------------ */
function legalPage(title, blocks) {
  return `<div class="wrap narrow"><h1>${title}</h1>
    <p class="tiny">${L("Sist oppdatert", "Last updated")} ${fdate(now())}</p>
    <div class="card">${blocks.map(([h, b]) => `<h3 style="margin-top:18px">${h}</h3><div class="muted small">${b}</div>`).join("")}</div>
    <p class="tiny" style="margin-top:14px">${L("Dette er standardtekst for en prototype og skal gjennomgås av norsk juridisk rådgiver før lansering.", "This is template copy for a prototype and must be reviewed by a Norwegian legal adviser before launch.")}</p></div>`;
}
route("/vilkar", (m) => {
  m.innerHTML = legalPage(L("Vilkår for bruk", "Terms of use"), [
    [L("1. Om tjenesten", "1. About the service"), L("Bilfunn AS (org.nr 000 000 000) leverer oppslag på norske kjøretøy mot betaling. Tjenesten er uavhengig og drives ikke av offentlig myndighet.", "Bilfunn AS (org. no. 000 000 000) provides paid lookups on Norwegian vehicles. The service is independent and is not operated by a public authority.")],
    [L("2. Abonnement og pris", "2. Subscription and price"), L("Første betaling er 3 kr og gir tilgang i 3 dager (72 timer) fra betalingstidspunktet. Deretter fornyes abonnementet automatisk til 249 kr per måned inntil det sies opp. Introduksjonstilbudet gjelder én gang per kunde og per betalingsmåte.", "The first payment is NOK 3 and gives access for 3 days (72 hours) from the time of payment. The subscription then renews automatically at NOK 249 per month until cancelled. The introductory offer applies once per customer and per payment method.")],
    [L("3. Oppsigelse", "3. Cancellation"), L("Du kan si opp når som helst på Min side. Oppsigelsen stopper alle framtidige trekk umiddelbart. Tilgangen varer ut den perioden du allerede har betalt for. Det er ingen oppsigelsestid og ingen gebyrer.", "You can cancel at any time on My page. Cancellation stops all future charges immediately. Access lasts for the period you have already paid for. There is no notice period and no fees.")],
    [L("4. Bruk av opplysningene", "4. Use of the information"), L("Opplysningene er til personlig, ikke-kommersiell bruk. Du kan ikke bruke tjenesten til markedsføring, systematisk innsamling, videresalg, kartlegging av enkeltpersoner, trakassering eller automatisert nedlasting. Vi kan sperre kontoer ved mistanke om misbruk.", "The information is for personal, non-commercial use. You may not use the service for marketing, systematic collection, resale, profiling of individuals, harassment or automated downloading. We may block accounts on suspicion of misuse.")],
    [L("5. Søkegrenser", "5. Search limits"), L("Inntil 10 oppslag i introduksjonsperioden og 50 per kalendermåned. Gjentatte oppslag på samme kjennemerke innen 24 timer teller ikke. Vi kan justere grensene for å beskytte tjenesten mot misbruk.", "Up to 10 lookups in the introductory period and 50 per calendar month. Repeat lookups of the same plate within 24 hours do not count. We may adjust the limits to protect the service against misuse.")],
    [L("6. Nøyaktighet", "6. Accuracy"), L("Vi viderefører opplysninger fra eksterne kilder og kan ikke garantere at de til enhver tid er korrekte eller fullstendige. Tjenesten erstatter ikke offisielle registerutskrifter.", "We pass on information from external sources and cannot guarantee it is correct or complete at all times. The service does not replace official register extracts.")],
    [L("7. Ansvar", "7. Liability"), L("Vårt ansvar er begrenset til beløpet du har betalt de siste tolv månedene, med mindre annet følger av ufravikelig lovgivning.", "Our liability is limited to the amount you have paid in the last twelve months, unless mandatory law provides otherwise.")],
    [L("8. Tvister", "8. Disputes"), L("Norsk rett gjelder. Forbrukere kan klage til Forbrukertilsynet eller Forbrukerklageutvalget.", "Norwegian law applies. Consumers may complain to the Norwegian Consumer Authority or the Consumer Disputes Commission.")]
  ]);
});
route("/personvern", (m) => {
  m.innerHTML = legalPage(L("Personvernerklæring", "Privacy policy"), [
    [L("Behandlingsansvarlig", "Data controller"), "Bilfunn AS, Storgata 1, 0155 Oslo. personvern@bilfunn.no"],
    [L("Hvilke opplysninger vi behandler", "What we process"), L("Om deg som kunde: e-postadresse, betalingsreferanse (aldri fullt kortnummer), abonnementsstatus, kvitteringer, søkehistorikk, IP-adresse og tekniske logger. Om kjøretøy og eiere: opplysninger vi henter fra vår dataleverandør for å svare på ditt oppslag.", "About you as a customer: email address, payment reference (never a full card number), subscription status, receipts, search history, IP address and technical logs. About vehicles and owners: information retrieved from our data provider to answer your lookup.")],
    [L("Formål og rettslig grunnlag", "Purpose and legal basis"), L("Levering av avtalen (GDPR art. 6(1)(b)) for konto, betaling og oppslag. Berettiget interesse (art. 6(1)(f)) for sikkerhet, misbruksforebygging og forbedring. Samtykke (art. 6(1)(a)) for analyse og markedsføring.", "Performance of the contract (GDPR art. 6(1)(b)) for account, payment and lookups. Legitimate interest (art. 6(1)(f)) for security, abuse prevention and improvement. Consent (art. 6(1)(a)) for analytics and marketing.")],
    [L("Lagringstid", "Retention"), L("Konto og søkehistorikk slettes 12 måneder etter at abonnementet er avsluttet, eller straks du ber om sletting. Kvitteringer og regnskapsbilag beholdes i fem år etter bokføringsloven. Tekniske logger slettes etter 90 dager. Eieropplysninger mellomlagres ikke ut over det som er nødvendig for å vise rapporten.", "Account and search history are deleted 12 months after the subscription ends, or immediately on your request. Receipts and accounting records are kept for five years under the Bookkeeping Act. Technical logs are deleted after 90 days. Owner information is not cached beyond what is needed to display the report.")],
    [L("Dine rettigheter", "Your rights"), L("Du kan be om innsyn, retting, sletting, begrensning og dataportabilitet, og du kan trekke tilbake samtykke. Bruk knappene på Min side eller kontakt personvern@bilfunn.no. Du kan klage til Datatilsynet.", "You can request access, rectification, erasure, restriction and portability, and withdraw consent. Use the buttons on My page or contact personvern@bilfunn.no. You may complain to the Norwegian Data Protection Authority.")],
    [L("Registrerte kjøretøyeiere", "Registered vehicle owners"), L("Er du eier og ønsker innsyn i hvilke opplysninger som er vist om deg, eller mener visningen er uriktig, kontakt personvern@bilfunn.no. Vi logger hvilke kjennemerker som er slått opp og kan følge opp misbruk.", "If you are an owner and want to know what has been shown about you, or believe the display is incorrect, contact personvern@bilfunn.no. We log which plates have been looked up and can follow up on misuse.")],
    [L("Databehandlere", "Processors"), L("Betalingsleverandør, e-postleverandør, hostingleverandør, feilovervåking og kjøretøydataleverandør. Alle er underlagt databehandleravtale, og data behandles innenfor EU/EØS der det er mulig.", "Payment provider, email provider, hosting provider, error monitoring and the vehicle data provider. All are covered by data processing agreements and data is processed within the EU/EEA where possible.")],
    [L("Hva vi aldri logger", "What we never log"), L("Fullt kortnummer, CVC, eierens navn eller adresse i analyse- eller applikasjonslogger.", "Full card number, CVC, or an owner's name or address in analytics or application logs.")]
  ]);
});
route("/cookies", (m) => {
  m.innerHTML = legalPage(L("Informasjonskapsler", "Cookies"), [
    [L("Nødvendige", "Necessary"), L("Holder deg innlogget, husker samtykkevalget og sikrer betalingsflyten. Kan ikke slås av.", "Keep you logged in, remember your consent choice and secure the payment flow. Cannot be turned off.")],
    [L("Analyse", "Analytics"), L("Måler hvordan tjenesten brukes, for eksempel hvor mange som fullfører et søk. Settes kun med samtykke.", "Measure how the service is used, for example how many complete a search. Set only with consent.")],
    [L("Markedsføring", "Marketing"), L("Brukes til annonsemåling hos tredjeparter. Settes kun med samtykke.", "Used for advertising measurement with third parties. Set only with consent.")],
    [L("Endre valget ditt", "Change your choice"), `<button class="btn sm ghost" id="resetconsent">${L("Åpne samtykkevalg på nytt", "Reopen consent choices")}</button>`]
  ]);
  const b = $("#resetconsent"); if (b) b.onclick = () => { S.consent = null; save(); renderCookie(); toast(L("Velg på nytt nederst på siden.", "Choose again at the bottom of the page.")); };
});
route("/angrerett", (m) => {
  m.innerHTML = legalPage(L("Angrerett og refusjon", "Withdrawal and refunds"), [
    [L("Digitale tjenester", "Digital services"), L("Tjenesten leveres umiddelbart etter betaling. Ved å bekrefte kjøpet samtykker du til levering før angrefristen utløper, og angreretten faller bort når rapporten er åpnet, jf. angrerettloven § 22 bokstav n.", "The service is delivered immediately after payment. By confirming the purchase you consent to delivery before the withdrawal period expires, and the right of withdrawal lapses once the report has been opened, cf. the Norwegian Right of Withdrawal Act § 22(n).")],
    [L("Når vi refunderer likevel", "When we refund anyway"), L("Hvis oppslaget ikke ga resultat på grunn av en teknisk feil hos oss, hvis du ble belastet dobbelt, eller hvis abonnementet ble fornyet etter at du hadde sagt opp, refunderer vi hele beløpet.", "If the lookup produced no result because of a technical fault on our side, if you were charged twice, or if the subscription renewed after you cancelled, we refund the full amount.")],
    [L("Slik ber du om refusjon", "How to request a refund"), L("Send en melding via kontaktskjemaet med kvitteringsnummeret. Vi behandler saken innen tre virkedager, og refusjonen går tilbake til samme betalingsmåte innen 5–10 dager.", "Send a message via the contact form with your receipt number. We handle the case within three working days and the refund returns to the same payment method within 5–10 days.")]
  ]);
});
route("/datakilder", (m) => {
  m.innerHTML = legalPage(L("Om datakildene", "About the data"), [
    [L("Hvor opplysningene kommer fra", "Where the information comes from"), L("Kjøretøy- og eieropplysninger hentes via en kommersiell dataleverandør som igjen bygger på offisielle registerkilder. Vi viser tidspunktet for oppslaget i hver rapport.", "Vehicle and owner information is retrieved via a commercial data provider which in turn builds on official register sources. We show the time of the lookup in each report.")],
    [L("Uavhengighet", "Independence"), L("Bilfunn er ikke eid, drevet, sponset eller godkjent av Statens vegvesen. Vi bruker ikke deres logo, navn eller design, og vi opptrer aldri på vegne av offentlig myndighet.", "Bilfunn is not owned, operated, sponsored or endorsed by Statens vegvesen. We do not use their logo, name or design, and we never act on behalf of a public authority.")],
    [L("Feil i opplysningene", "Errors in the information"), L("Registerdata kan være forsinket eller feil. Offisielle endringer må meldes til registereieren, ikke til oss, men si gjerne fra slik at vi kan ta det opp med leverandøren.", "Register data may be delayed or wrong. Official changes must be reported to the register owner, not to us, but do tell us so we can raise it with the provider.")],
    [L("Skjermede opplysninger", "Protected information"), L("Enkelte eiere har lovbestemt skjerming. For disse kjøretøyene vises ikke eieropplysninger, uavhengig av abonnement.", "Some owners have statutory protection. For those vehicles, owner information is not displayed, regardless of subscription.")]
  ]);
});
route("*", (m) => {
  m.innerHTML = `<div class="wrap narrow"><div class="card">
    <h1 style="font-size:1.5rem">${L("Siden finnes ikke", "Page not found")}</h1>
    <p class="muted">${L("Lenken kan være utdatert. Start et nytt søk herfra.", "The link may be out of date. Start a new search from here.")}</p>
    <div style="max-width:380px">${searchWidget()}</div></div></div>`;
  wireSearch(m);
});
