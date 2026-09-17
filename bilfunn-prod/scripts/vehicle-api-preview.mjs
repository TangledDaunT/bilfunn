// Local diagnostic only: never imported by the application or deployed as a route.
import http from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
  throw new Error("Local diagnostic cannot run in production");
}
const key = process.env.SVV_API_KEY;
if (!key) throw new Error("Missing SVV_API_KEY in private environment configuration");
const port = 3102;
const origin = `http://127.0.0.1:${port}`;
const token = randomBytes(32).toString("hex");
let busy = false, count = 0, last = 0;
const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
function page(message = "", data) {
  const nonce = randomBytes(18).toString("base64");
  return { nonce, html: `<!doctype html><html lang="nb"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Lokalt API-oppslag</title><style nonce="${nonce}">body{font:16px system-ui;background:#edf3f6;color:#0a2540;margin:0;padding:24px}main{max-width:1000px;margin:auto}section{background:white;padding:24px;border-radius:12px;margin:18px 0}input,button{font:inherit;padding:12px;border-radius:6px;border:1px solid #9baab8}button{background:#0068ef;color:white;cursor:pointer}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px}label{display:block;margin:12px 0}p{line-height:1.6}.status{font-weight:600}a{color:#0068ef}</style><main><a href="http://localhost:3100/">Til nettsiden</a><h1>Test Statens vegvesen API</h1><p>Kun på denne maskinen. Henter tekniske kjøretøydata med din private API-nøkkel. Ingen innlogging eller betaling i dette lokale testverktøyet.</p><section><form method="post" action="/lookup"><input type="hidden" name="token" value="${token}"><label for="plate">Registreringsnummer</label><input id="plate" name="plate" maxlength="8" required placeholder="Ditt registreringsnummer" autocomplete="off"><button>Hent fra Statens vegvesen</button></form><p>Bruk et kjøretøy du kjenner for å kontrollere resultatet. Ingen eksempeldata eller automatiske oppslag. Maksimalt 20 forespørsler per oppstart.</p></section><p class="status" role="status">${escape(message)}</p>${data === undefined ? "" : `<section><h2>Komplett teknisk API-respons</h2><p>Feltnavn og verdier vises uendret fra kilden, også tomme felt. Dette er ikke en bekreftelse på datakvalitet. Responsen lagres ikke av verktøyet.</p><pre>${escape(JSON.stringify(data, null, 2))}</pre></section>`}<p>Eieropplysninger krever en separat tjeneste og vises ikke her. Dette verktøyet aktiverer ikke offentlig publisering eller produksjonsoppslag.</p></main></html>` };
}
function send(res, status, message, data) {
  const rendered = page(message, data);
  res.writeHead(status, {"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","X-Robots-Tag":"noindex, nofollow","X-Content-Type-Options":"nosniff","Referrer-Policy":"same-origin","Content-Security-Policy":`default-src 'none'; style-src 'nonce-${rendered.nonce}'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'`});
  res.end(rendered.html);
}
http.createServer(async (req,res) => {
  if (req.headers.host !== `127.0.0.1:${port}`) return send(res,403,"Ugyldig vert.");
  if (req.method === "GET" && req.url === "/") return send(res,200,"");
  if (req.method !== "POST" || req.url !== "/lookup") return send(res,404,"Siden finnes ikke.");
  if (req.headers.origin !== origin || !req.headers["content-type"]?.startsWith("application/x-www-form-urlencoded")) return send(res,403,"Forespørselen ble avvist.");
  try {
    let body = "";
    for await (const chunk of req) {
      body += chunk.toString();
      if (Buffer.byteLength(body) > 2048) return send(res,413,"Forespørselen er for stor.");
    }
    const form = new URLSearchParams(body);
    const received = Buffer.from(form.get("token") || "");
    if (received.length !== token.length || !timingSafeEqual(received,Buffer.from(token))) return send(res,403,"Åpne testsiden på nytt.");
    const plate = (form.get("plate") || "").trim().toUpperCase();
    if (!/^[A-ZÆØÅ]{2} ?[0-9]{4,5}$/.test(plate)) return send(res,400,"Bruk et vanlig registreringsnummer med to bokstaver og fire eller fem sifre.");
    if (busy || count >= 20 || Date.now()-last < 2000) return send(res,429,"Testgrensen er nådd eller et oppslag pågår. Vent før neste forsøk.");
    busy = true; count++; last = Date.now();
    try {
      const url = new URL("https://www.vegvesen.no/ws/no/vegvesen/kjoretoy/felles/datautlevering/enkeltoppslag/kjoretoydata");
      url.searchParams.set("kjennemerke",plate.replace(" ",""));
      const response = await fetch(url,{headers:{"SVV-Authorization":`Apikey ${key}`,Accept:"application/json"},signal:AbortSignal.timeout(10000),redirect:"error",cache:"no-store"});
      if (!response.ok) {
        await response.body?.cancel();
        const explanation = response.status===401 || response.status===403 ? "API-nøkkelen ble ikke godkjent for tekniske enkeltoppslag. Kontroller nøkkel og tjenestetype." : response.status===404 ? "Kilden fant ikke kjøretøyet." : response.status===429 ? "Statens vegvesens kvote er nådd. Prøv senere." : "Statens vegvesen svarte med en feil. Prøv senere.";
        return send(res,502,`${explanation} (HTTP ${response.status})`);
      }
      let bytes=0; const chunks=[];
      for await (const chunk of response.body) { bytes+=chunk.length; if(bytes>2_000_000) throw new Error("Response limit"); chunks.push(chunk); }
      const data=JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if(!Array.isArray(data.kjoretoydataListe)) return send(res,502,"Uventet responsformat. Ingen data vises.");
      return send(res,200,data.kjoretoydataListe.length ? `Hentet fra Statens vegvesen ${new Date().toISOString()}.` : "Kilden returnerte ingen kjøretøy.",data);
    } finally { busy=false; }
  } catch { return send(res,503,"Oppslaget kunne ikke fullføres. Kontroller forbindelsen og prøv igjen. Ingen data er lagret."); }
}).listen(port,"127.0.0.1",()=>console.log(`Local vehicle API test: ${origin}`));
