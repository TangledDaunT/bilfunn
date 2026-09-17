// Shared static markup: public HTML never reads session cookies.
export const icon = (name: string, size = 20) =>
  `<img class="design-icon" src="/design/${name}.svg" width="${size}" height="${size}" alt="" aria-hidden="true">`;
export const logo = `<span class="design-logo"><img src="/design/e6d05.webp" alt="Skiltnummeret – trygg informasjon, enklere valg" width="838" height="559"></span>`;
export const designHeader = `<header class="design-header"><div class="design-container"><a href="/" aria-label="Skiltnummeret – forsiden">${logo}</a><nav aria-label="Hovedmeny"><a href="/#slik-fungerer-det">Slik fungerer det</a><a href="/priser">Priser</a><a href="/faq">Spørsmål og svar</a></nav><a class="design-login" href="/logg-inn">${icon("7daf0", 17)}Logg inn</a></div></header>`;
export const designFooter = `<footer class="design-footer"><div class="design-container"><div class="footer-grid"><div><a href="/" aria-label="Skiltnummeret – forsiden">${logo}</a><p>Et registreringsnummer.<br>Et litt klarere bilde.</p></div><div><h3>Tjenesten</h3><a href="/priser">Priser</a><a href="/faq">Spørsmål og svar</a><a href="/kontakt">Kontakt oss</a><a href="/kjoretoy">Kjøretøyregister</a><a href="/blogg">Blogg</a></div><div><h3>Din konto</h3><a href="/konto">Min side</a><a href="/logg-inn">Logg inn</a><a href="/konto">Avbestill abonnement</a></div><div><h3>Det med liten skrift</h3><a href="/vilkar">Vilkår</a><a href="/personvern">Personvern</a><a href="/cookies">Informasjonskapsler</a><a href="/datakilder">Datakilder</a><a href="/angrerett">Angrerett</a></div></div><div class="footer-bottom"><p>Skiltnummeret er en uavhengig kommersiell tjeneste og er ikke driftet av eller tilknyttet Statens vegvesen.</p><p>© ${new Date().getFullYear()} Skiltnummeret</p></div></div></footer>`;
export const plateForm = (id = "plate") =>
  `<form action="/sok" method="get" class="design-search"><label for="${id}">Registreringsnummer</label><div class="plate-row"><div class="plate-field"><span class="plate-country" aria-hidden="true"><span class="norway-flag"></span>N</span><input id="${id}" name="nr" required maxlength="8" autocomplete="off" placeholder="AB 12345" aria-label="Registreringsnummer"></div><button type="submit">${icon("41f9b")}Søk kjøretøy</button></div></form>`;
export const priceCopy =
  "3 dager for 3 kr. Deretter 249 kr/måned, automatisk fornyelse. Avbestill når som helst.";
export const searchCta = `<section class="design-cta"><div class="design-container"><p class="eyebrow">Neste steg er enkelt</p><h2>Klar til å sjekke kjøretøyet?</h2><p>Start med registreringsnummeret. Se tilgjengelige opplysninger fra 3 kr.</p>${plateForm("cta-plate")}<p class="fine">${priceCopy}</p></div></section>`;
export const questions = [
  [
    "Hva koster tjenesten?",
    "3 kr for 3 dager. Deretter 249 kr per måned med automatisk fornyelse til du sier opp.",
    "Betaling og abonnement",
  ],
  [
    "Blir dette et abonnement?",
    "Ja. Introduksjonsperioden går over til månedsabonnement. Du ser pris og vilkår før du betaler.",
    "Betaling og abonnement",
  ],
  [
    "Kan jeg avbestille når som helst?",
    "Du kan be om oppsigelse fra Min side. Der ser du også status og hvor lenge du har tilgang.",
    "Betaling og abonnement",
  ],
  [
    "Hvor kommer dataene fra?",
    "Tekniske opplysninger hentes fra den konfigurerte kjøretøykilden. Se Datakilder for mer informasjon. Skiltnummeret er en uavhengig tjeneste.",
    "Data og personvern",
  ],
  [
    "Kan jeg se hvem som eier bilen?",
    "Eieropplysninger: not available in this data source. Betaling gir ikke tilgang til eieropplysninger.",
    "Data og personvern",
  ],
  [
    "Hvordan fungerer betalingen?",
    "Tilgjengelige betalingsmåter vises i kassen. Tilgang aktiveres først når betalingen er bekreftet.",
    "Betaling og abonnement",
  ],
  [
    "Hva skjer hvis kjøretøyet ikke finnes?",
    "Kontroller registreringsnummeret og prøv igjen. Midlertidige feil hos dataleverandøren vises separat fra et kjøretøy som ikke finnes.",
    "Generelt",
  ],
  [
    "Hvorfor mangler noen opplysninger?",
    "Rapporten viser bare opplysninger som er tilgjengelige og tillatt å vise. Kildene kan ha ufullstendige data.",
    "Generelt",
  ],
  [
    "Hvordan logger jeg inn igjen?",
    "Bruk engangskoden vi sender på e-post, eller Google når denne innloggingsmåten er tilgjengelig.",
    "Konto",
  ],
  [
    "Hvordan sletter jeg opplysningene mine?",
    "Logg inn på Min side for å laste ned opplysninger eller be om sletting. Sletting krever nylig innlogging.",
    "Konto",
  ],
];
export const faqMarkup = (limit = 10) =>
  `<div class="design-faq">${questions
    .slice(0, limit)
    .map(
      ([q, a]) =>
        `<details><summary>${q}<span aria-hidden="true">+</span></summary><p>${a}</p></details>`,
    )
    .join("")}</div>`;
export const homepage = `<div class="design-home">
<section class="design-hero"><div class="design-container hero-grid"><div><p class="eyebrow">Et godt valg starter med innsikt</p><h1>Kjenn bilen.<br>Før du<br><em>bestemmer deg.</em></h1><p class="hero-description">Få en full teknisk kjøretøyrapport med tilgjengelige registreringsdatoer, EU-kontroll og tekniske spesifikasjoner på ett sted.</p>${plateForm("hero-plate")}<p class="price-note"><strong>Gratis forhåndsvisning</strong><br>Full tilgang: <b>3 kr i 3 dager</b>. Deretter 249 kr/måned.<br>Fornyes automatisk. Avbestill når som helst.</p></div><div class="hero-photo"><img src="/design/4d30d.webp" alt="Illustrasjon av en sølvfarget bil ved en norsk fjord" width="1536" height="1024" fetchpriority="high"><div class="photo-top">NORSKE VEIER. KLARERE VALG.${icon("7e516")}</div><div class="photo-label">${icon("15f42", 25)}<div><small>FØR NESTE KAPITTEL</small><strong>Bli bedre kjent med bilen.</strong><span>Tekniske data · Kontroll · Registrering</span></div></div><small class="photo-credit">AI-generert illustrasjon</small></div></div></section>
<div class="trust-strip"><div class="design-container"><span>MER OVERSIKT.<br><b>MINDRE USIKKERHET.</b></span><span>${icon("11c66", 19)}Gratis forhåndsvisning</span><span>${icon("cde78", 19)}Samlet kjøretøyrapport</span><span>${icon("adcc5", 19)}Ingen bindingstid</span></div></div>
<section class="design-section" id="slik-fungerer-det"><div class="design-container"><div class="section-heading"><div><p class="eyebrow">Fra skiltnummer til oversikt</p><h2>Et lite søk.<br>Et bedre utgangspunkt.</h2></div><p>Du trenger bare registreringsnummeret.<br>Vi gjør resten enkelt å forstå.</p></div><div class="steps">${[
  [
    "01",
    "f6c3f",
    "Finn riktig kjøretøy",
    "Skriv inn skiltnummeret og se en gratis forhåndsvisning. Ingen konto nødvendig.",
  ],
  [
    "02",
    "d7796",
    "Velg full tilgang",
    "3 kr for 3 dager. Deretter 249 kr/måned til du avbestiller.",
  ],
  [
    "03",
    "70034",
    "Se det som betyr noe",
    "Utforsk rapporten i ditt tempo. Finn tekniske data, kontrollstatus og registreringsopplysninger.",
  ],
]
  .map(
    ([n, i, t, p]) =>
      `<article><div class="step-number">${n}${icon(i, 24)}</div><h3>${t}</h3><p>${p}</p></article>`,
  )
  .join("")}</div></div></section>
<section class="design-section wash"><div class="design-container split"><div class="report-illustration"><p class="eyebrow">Et klarere bilde av bilen</p><div class="sample-report"><div class="sample-top">DIN KJØRETØYRAPPORT <span>EKSEMPEL</span></div><img class="sample-car" src="/design/dec40.webp" alt="AI-generert eksempelbil, ikke et bilde av søkt kjøretøy" width="1024" height="682" loading="lazy"><div class="sample-body"><small>VOLKSWAGEN</small><h3>Golf 1.5 TSI <span>AB 12345</span></h3><dl><div><dt>Årsmodell</dt><dd>2021</dd></div><div><dt>Drivstoff</dt><dd>Bensin</dd></div><div><dt>Girkasse</dt><dd>Automat</dd></div></dl><p>✓ EU-kontroll godkjent <small>Eksempeldata</small></p></div></div><small>Illustrasjon med eksempeldata — ikke en faktisk kjøretøyrapport.</small></div><div><p class="eyebrow">Mer enn et skiltnummer</p><h2>Detaljene gjør<br>hele forskjellen.</h2><p>Et trygt valg starter med et klart bilde. Vi samler tilgjengelige opplysninger og gjør dem enklere å forstå.</p><div class="feature-list">${[
  ["Kjøretøyets identitet", "Merke, modell og registreringsopplysninger."],
  ["Teknisk og praktisk", "Viktige tekniske detaljer om kjøretøyet."],
  ["Kontroll og frister", "Se tilgjengelig informasjon om EU-kontroll."],
  ["Registreringsstatus", "Opplysninger fra den tilgjengelige datakilden."],
]
  .map(([t, p]) => `<div><h3>${t}</h3><p>${p}</p></div>`)
  .join(
    "",
  )}</div><a class="text-link" href="/datakilder">Les mer om opplysningene ${icon("39494", 17)}</a></div></div></section>
<section class="design-section"><div class="design-container split"><div><p class="eyebrow">Et valg du kan stå for</p><h2>Litt mer innsikt.<br>Litt mer ro i magen.</h2><p>Et kjøp er ikke bare et kjøretøy. Vi hjelper deg med å få et bedre grunnlag før du bestemmer deg.</p><div class="feature-list"><div><h3>Tryggere vurderinger</h3><p>Samle de viktigste detaljene på ett sted.</p></div><div><h3>Mer oversikt i hverdagen</h3><p>Hold oversikt over tekniske data og kontrollfrister.</p></div><div><h3>Enklere åpenhet</h3><p>Gjør kjøretøyopplysninger enklere å forstå.</p></div></div><a class="text-link" href="#hero-plate">Start med skiltnummeret ${icon("39494", 17)}</a></div><figure class="lifestyle"><img src="/design/adb1e.webp" alt="AI-generert illustrasjon av en person som sjekker bilen på mobilen" width="1024" height="1024" loading="lazy"><figcaption>AI-generert illustrasjon</figcaption></figure></div></section>
<section class="design-section navy"><div class="design-container split"><div><p class="eyebrow">Tydelig fra første steg</p><h2>Du kjenner prisen.<br>Du har kontrollen.</h2><p>Start med en gratis forhåndsvisning. Velg full tilgang når du trenger mer.</p><a class="text-link" href="/priser">Se priser og vilkår ${icon("4b544", 17)}</a></div><div class="intro-card"><p class="eyebrow">Prøv full tilgang</p><p class="intro-amount">3<span> kr</span></p><p>Tilgang i 3 dager</p><div class="renewal-note"><strong>Deretter 249 kr/måned</strong><p>Automatisk fornyelse til du avbestiller.</p></div><p class="fine">Ingen bindingstid. Avbestill fra Min side.</p><a class="design-button" href="#hero-plate">Finn kjøretøyet ditt ${icon("4b544", 17)}</a></div></div></section>
<section class="design-section"><div class="design-container faq-split"><div><p class="eyebrow">Lurer du på noe?</p><h2>Gode spørsmål.<br>Klare svar.</h2><p>De vanligste spørsmålene om pris,<br>abonnement og data.</p><a class="text-link" href="/faq">Se alle spørsmål ${icon("39494", 17)}</a></div>${faqMarkup(8)}</div></section>
<section class="home-final wash"><div class="design-container split"><div><p class="eyebrow">Et klart utgangspunkt</p><h2>Det starter<br>med skiltnummeret.</h2></div><div>${plateForm("bottom-plate")}<p class="fine">${priceCopy}</p></div></div></section></div>`;
