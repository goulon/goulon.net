/**
 * aurelien.goulon.net — edge worker
 *
 * Two jobs:
 *   1. GET /whoami, /fr/whoami → show visitors their own connection, annotated
 *   2. GET /                   → serve a short plain-text card to curl/wget/HTTPie,
 *                                normal HTML to browsers (content negotiation)
 *
 * Everything else — including non-GET requests to the paths above —
 * falls through to the GitHub Pages origin untouched.
 *
 * Route: aurelien.goulon.net/*
 */

const SITE = "https://aurelien.goulon.net";

const WHOAMI_ROUTES = {
  "/whoami": "en",
  "/fr/whoami": "fr",
};

/**
 * Marks a hand-written string as safe to render as HTML, bypassing esc().
 * Use only for markup you wrote yourself in this file — an <em> or <strong>
 * around a fixed phrase. Never wrap a value that came from the request
 * (headers, request.cf, query params) in trusted(); those must always go
 * through esc(), which happens automatically for any plain (non-trusted)
 * value passed into an `html` template.
 */
const trusted = (value) => ({ __html: String(value) });

const LOCALES = {
  en: {
    htmlLang: "en",
    title: "Your connection — Aurélien Goulon",
    textHeading: "WHAT I CAN SEE ABOUT YOUR CONNECTION",
    heading: "Your connection",

    labels: {
      address: "Your address",
      network: "Your network",
      reached: "You reached",
      protocol: "Protocol",
      encryption: "Encryption",
      roundTrip: "Round trip",
      client: "Your client",
    },

    textLabels: {
      address: "Your address",
      network: "Your network",
      reached: "Reached me at",
      protocol: "Protocol",
      encryption: "Encryption",
      roundTrip: "Round trip",
      client: "Client",
    },

    addressPrefix: "This is",

    addressNote: (f) =>
      f.ipVersion === "IPv6"
        ? "Good — you are on the modern internet. Most people still aren’t."
        : "The original 1981 addressing scheme. We ran out of these in 2011 and have been improvising ever since.",

    networkNote: trusted(
      "An <em>autonomous system</em>: one organisation’s slice of the internet. There are roughly 75,000 of them, and they spend all day telling each other which addresses they can reach. That constant negotiation is BGP, and it is the closest thing the internet has to a nervous system.",
    ),

    reachedValue: (f) =>
      f.colo + (f.city ? ` — you look like ${f.city}${f.region ? `, ${f.region}` : ""}` : ""),

    reachedTextValue: (f) =>
      f.colo + (f.city ? `  (you look like ${f.city}${f.region ? `, ${f.region}` : ""})` : ""),

    reachedNote: trusted(
      "The Cloudflare edge location that answered you, out of hundreds worldwide. You didn’t pick it; routing did.",
    ),

    protocolNote: (f) => {
      if (f.httpProtocol.includes("3")) {
        return trusted(
          "<strong>HTTP/3</strong> — running over QUIC on UDP rather than TCP. Faster to set up, and it survives switching from Wi-Fi to cellular without dropping.",
        );
      }

      if (f.httpProtocol.includes("2")) {
        return trusted(
          "<strong>HTTP/2</strong> — many requests multiplexed over one connection instead of queued one behind the other.",
        );
      }

      return trusted("<strong>HTTP/1.1</strong>, from 1997. Still works.");
    },

    encryptionNote: trusted(
      "Negotiated in the first fraction of a second, before a single byte of this page moved. Nobody between us can read it.",
    ),

    roundTripNote: trusted(
      "How long a packet takes to get from you to the edge and back. Light in fibre covers about 200 km per millisecond.",
    ),

    clientNote: trusted(
      "The identifying string your browser or client sends with every request. It’s entirely <em>self-reported</em> — nothing on the wire verifies it, so it’s also the easiest of these facts to fake.",
    ),

    textAddressNote: (f) =>
      f.ipVersion === "unknown"
        ? "The address was not available on this request."
        : `That is ${f.ipVersion}.`,

    textNetworkNote: "The autonomous system that carries your traffic.",
    textReachedNote: "The Cloudflare edge location that answered you.",

    intro: `
    You didn’t tell me any of this. It all came from the connection your
    browser just opened to reach this page — which is roughly what every
    server you visit can see.`,

    outro: `
    None of this is logged or stored. It is read off the live connection and
    discarded when this response finishes. There is no database here, and no
    cookie was set.`,

    textOutro: `
  None of this is stored. It is read from the connection you just opened
  and thrown away when this response ends.`,

    terminalPrompt: "Prefer a terminal?",
    backLink: "Back to the site",
    alternateLanguage: "Lire en",
    alternateLanguageLink: "français",
    alternateLanguageUrl: "/fr/whoami",
    alternateLanguageCode: "fr",
    homeUrl: "/",
    curlUrl: "/whoami",
  },

  fr: {
    htmlLang: "fr",
    title: "Votre connexion — Aurélien Goulon",
    textHeading: "CE QUE JE PEUX VOIR DE VOTRE CONNEXION",
    heading: "Votre connexion",

    labels: {
      address: "Votre adresse",
      network: "Votre réseau",
      reached: "Vous arrivez via",
      protocol: "Protocole",
      encryption: "Chiffrement",
      roundTrip: "Aller-retour",
      client: "Votre client",
    },

    textLabels: {
      address: "Votre adresse",
      network: "Votre réseau",
      reached: "Vous arrivez via",
      protocol: "Protocole",
      encryption: "Chiffrement",
      roundTrip: "Aller-retour",
      client: "Client",
    },

    addressPrefix: "C’est une adresse",

    addressNote: (f) =>
      f.ipVersion === "IPv6"
        ? "Vous utilisez l’Internet moderne. Tout le monde n’y est pas encore."
        : "Le plan d’adressage original, conçu en 1981. Nous avons épuisé les adresses en 2011 et nous improvisons depuis.",

    networkNote: trusted(
      "Un <em>système autonome</em>, c’est-à-dire la portion d’Internet gérée par une organisation. Il en existe environ 75 000, et ils passent leur temps à s’annoncer mutuellement les adresses qu’ils savent atteindre. Cette négociation permanente, c’est BGP. Ce qui ressemble le plus, sur Internet, à un système nerveux.",
    ),

    reachedValue: (f) =>
      f.colo + (f.city ? ` — vous semblez être à ${f.city}${f.region ? `, ${f.region}` : ""}` : ""),

    reachedTextValue: (f) =>
      f.colo + (f.city ? `  (vous semblez être à ${f.city}${f.region ? `, ${f.region}` : ""})` : ""),

    reachedNote: trusted(
      "Le point de présence Cloudflare qui vous a répondu, parmi des centaines dans le monde. Vous ne l’avez pas choisi : le routage s’en est chargé.",
    ),

    protocolNote: (f) => {
      if (f.httpProtocol.includes("3")) {
        return trusted(
          "<strong>HTTP/3</strong>, qui utilise QUIC sur UDP plutôt que TCP. La connexion s’établit plus vite et peut survivre au passage du Wi-Fi au réseau mobile sans être interrompue.",
        );
      }

      if (f.httpProtocol.includes("2")) {
        return trusted(
          "<strong>HTTP/2</strong>, qui permet de faire passer plusieurs requêtes sur une même connexion au lieu de les mettre les unes derrière les autres.",
        );
      }

      return trusted("<strong>HTTP/1.1</strong>, qui date de 1997. Il fait encore le travail.");
    },

    encryptionNote: trusted(
      "Négocié pendant la première fraction de seconde, avant le moindre octet de cette page. Personne entre vous et moi ne peut le lire.",
    ),

    roundTripNote: trusted(
      "Le temps nécessaire à un paquet pour aller de chez vous jusqu’au réseau Cloudflare et revenir. Dans une fibre, la lumière parcourt environ 200 km par milliseconde.",
    ),

    clientNote: trusted(
      "La chaîne d’identification envoyée par votre navigateur ou votre client à chaque requête. Elle est entièrement <em>déclarative</em> : personne ne la vérifie sur le réseau, ce qui en fait aussi l’une des informations les plus faciles à falsifier.",
    ),

    textAddressNote: (f) =>
      f.ipVersion === "unknown"
        ? "L’adresse n’était pas disponible pour cette requête."
        : `C’est une adresse ${f.ipVersion}.`,

    textNetworkNote: "Le système autonome qui transporte votre trafic.",
    textReachedNote: "Le point de présence Cloudflare qui vous a répondu.",

    intro: `
    Vous ne m’avez communiqué aucune de ces informations. Elles proviennent
    toutes de la connexion que votre navigateur vient d’ouvrir pour accéder à
    cette page. C’est, à peu près, ce que peut voir chaque serveur auquel vous
    vous connectez.`,

    outro: `
    Rien de tout cela n’est journalisé ni enregistré. Ces informations sont
    lues depuis la connexion en cours, puis oubliées à la fin de cette réponse.
    Il n’y a pas de base de données ici, et aucun cookie n’a été créé.`,

    textOutro: `
  Rien de tout cela n’est enregistré. Ces informations sont lues depuis
  la connexion que vous venez d’ouvrir, puis oubliées à la fin de cette
  réponse.`,

    terminalPrompt: "Vous préférez un terminal ?",
    backLink: "Retour au site",
    alternateLanguage: "Read it in",
    alternateLanguageLink: "English",
    alternateLanguageUrl: "/whoami",
    alternateLanguageCode: "en",
    homeUrl: "/fr/",
    curlUrl: "/fr/whoami",
  },
};

/* ── escaping ─────────────────────────────────────────────────────── */

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

const isTrusted = (v) => v !== null && typeof v === "object" && "__html" in v;

const renderValue = (v) => (isTrusted(v) ? v.__html : esc(v));

/**
 * Tagged template for HTML fragments that mix trusted, hand-written markup
 * with dynamic values. Literal template text passes through untouched.
 * Each `${...}` interpolation is escaped automatically UNLESS it is a
 * value produced by `trusted()`, in which case its markup passes through
 * as-is. This is the only path by which unescaped HTML can enter a page:
 * a value must explicitly be wrapped in `trusted()` at its definition
 * site, in this file, to skip escaping. A raw string, number, or anything
 * read from `request` (headers, request.cf, query params) is never
 * trusted by default and always goes through `esc()`.
 */
const html = (strings, ...values) =>
  strings.reduce((out, s, i) => out + s + (i < values.length ? renderValue(values[i]) : ""), "");

const isTerminalClient = (ua) =>
  /^(curl|Wget|HTTPie|got|python-requests|fetch)\b/i.test(ua.trim());

/** Collect what Cloudflare's edge knows about this request. */
function connectionFacts(request) {
  const cf = request.cf ?? {};
  const ip = request.headers.get("CF-Connecting-IP");
  const ipVersion =
    !ip ? "unknown" :
    ip.includes(":") ? "IPv6" :
    "IPv4";

  return {
    ip: ip ?? "unknown",
    ipVersion,
    asn: cf.asn ? `AS${cf.asn}` : "unknown",
    asOrg: cf.asOrganization ?? "unknown",
    colo: cf.colo ?? "unknown",
    country: cf.country ?? "unknown",
    city: cf.city ?? null,
    region: cf.region ?? null,
    httpProtocol: cf.httpProtocol ?? "unknown",
    tlsVersion: cf.tlsVersion ?? "unknown",
    tlsCipher: cf.tlsCipher ?? "unknown",
    rtt: cf.clientTcpRtt ?? null,
    ua: request.headers.get("User-Agent") ?? "unknown",
  };
}

/* ── /whoami : plain text (for curl) ──────────────────────────────── */

function whoamiText(f, language) {
  const t = LOCALES[language];
  const line = "─".repeat(68);

  return `${line}
  ${t.textHeading}
${line}

  ${t.textLabels.address.padEnd(20)}${f.ip}
                      ${t.textAddressNote(f)}

  ${t.textLabels.network.padEnd(20)}${f.asn} — ${f.asOrg}
                      ${t.textNetworkNote}

  ${t.textLabels.reached.padEnd(20)}${t.reachedTextValue(f)}
                      ${t.textReachedNote}

  ${t.textLabels.protocol.padEnd(20)}${f.httpProtocol}
  ${t.textLabels.encryption.padEnd(20)}${f.tlsVersion}, ${f.tlsCipher}
${f.rtt ? `  ${t.textLabels.roundTrip.padEnd(20)}~${f.rtt} ms\n` : ""}
  ${t.textLabels.client.padEnd(20)}${f.ua}

${line}
${t.textOutro}

  Aurélien Goulon — ${SITE}
${line}
`;
}

/* ── /whoami : HTML ───────────────────────────────────────────────── */

function whoamiHtml(f, language) {
  const t = LOCALES[language];

  const row = (label, value, note) => `
      <div class="fact">
        <div class="label">${esc(label)}</div>
        <div class="value">${esc(value)}</div>
        <div class="note">${note}</div>
      </div>`;

  return `<!DOCTYPE html>
<html lang="${t.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t.title}</title>
<meta name="robots" content="noindex">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23002654'/%3E%3Ctext x='32' y='46' font-family='Courier New, monospace' font-size='48' fill='%23FFFFFF' text-anchor='middle'%3EA%3C/text%3E%3Crect x='12' y='50' width='40' height='4' fill='%23EF4135'/%3E%3C/svg%3E">
<link rel="stylesheet" href="/main.css">
<style>
  .fact { margin-bottom: 1.5rem; }
  .label {
    font-size: 0.8125rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.6;
  }
  .value {
    font-size: 1.25rem;
    overflow-wrap: anywhere;
  }
  .note {
    font-size: 0.875rem;
    opacity: 0.75;
    margin-top: 0.15rem;
  }
  .intro, .outro { opacity: 0.85; }
  .outro {
    margin-top: 2.5rem;
    padding-top: 1rem;
    border-top: 1px solid rgb(255 255 255 / 0.2);
    font-size: 0.875rem;
  }
</style>
</head>
<body>
  <h1>${t.heading}</h1>

  <p class="intro">${t.intro}</p>

${row(
  t.labels.address,
  f.ip,
  html`${t.addressPrefix} <strong>${f.ipVersion}</strong>. ${t.addressNote(f)}`,
)}

${row(t.labels.network, `${f.asn} — ${f.asOrg}`, html`${t.networkNote}`)}

${row(t.labels.reached, t.reachedValue(f), html`${t.reachedNote}`)}

${row(t.labels.protocol, f.httpProtocol, html`${t.protocolNote(f)}`)}

${row(t.labels.encryption, `${f.tlsVersion} · ${f.tlsCipher}`, html`${t.encryptionNote}`)}

${f.rtt ? row(t.labels.roundTrip, `~${f.rtt} ms`, html`${t.roundTripNote}`) : ""}

${row(t.labels.client, f.ua, html`${t.clientNote}`)}

  <p class="outro">
    ${t.outro}
    <br><br>
    ${t.terminalPrompt} <code>curl ${SITE}${t.curlUrl}</code>
    <br>
    <a href="${t.homeUrl}">${t.backLink}</a>
    <br><br>
    <span lang="${t.alternateLanguageCode}">
      ${t.alternateLanguage}
      <a href="${t.alternateLanguageUrl}" hreflang="${t.alternateLanguageCode}">${t.alternateLanguageLink}</a>.
    </span>
  </p>
</body>
</html>
`;
}

/* ── plain-text card, for people who arrive by terminal ───────────── */

const BOX_WIDTH = 64; // inner width between the │ borders, in characters

const boxLine = (content = "") => `  │${content.padEnd(BOX_WIDTH)}│`;
const boxBorder = (side) =>
  `  ${side === "top" ? "┌" : "└"}${"─".repeat(BOX_WIDTH)}${side === "top" ? "┐" : "┘"}`;

const CARD = `
${boxBorder("top")}
${boxLine()}
${boxLine("   AURÉLIEN GOULON")}
${boxLine("   Software Engineer — network infrastructure")}
${boxLine()}
${boxLine("   I work where networking meets software: routing protocols,")}
${boxLine("   switching, and the APIs behind enterprise network")}
${boxLine("   management at Cisco Meraki.")}
${boxLine()}
${boxLine("   Since 2014, on three continents — France, Brazil, Canada.")}
${boxLine("   Currently in Alberta.")}
${boxLine()}
${boxLine(`   Web       ${SITE}`)}
${boxLine(`   Humans    ${SITE}/humans.txt`)}
${boxLine()}
${boxLine("   You asked for this in plain text, so here it is. If you")}
${boxLine("   want to see what your own connection looks like from my")}
${boxLine("   side of the wire:")}
${boxLine()}
${boxLine(`       curl ${SITE}/whoami`)}
${boxLine()}
${boxBorder("bottom")}

`;

/* ── entry point ──────────────────────────────────────────────────── */

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const method = request.method;
    const ua = request.headers.get("User-Agent") ?? "";
    const accept = request.headers.get("Accept") ?? "";

    const commonHeaders = {
      "X-Powered-By": "hand-written HTML, strong coffee, and BGP",
      "X-Say-Hello": `${SITE}/humans.txt`,
    };

    /* 1. GET /whoami and /fr/whoami */
    const language = WHOAMI_ROUTES[path];

    if (language && method === "GET") {
      const facts = connectionFacts(request);
      const wantsText =
        isTerminalClient(ua) ||
        (accept.includes("text/plain") && !accept.includes("text/html"));

      return new Response(
        wantsText
          ? whoamiText(facts, language)
          : whoamiHtml(facts, language),
        {
          headers: {
            "Content-Type": wantsText
              ? "text/plain; charset=utf-8"
              : "text/html; charset=utf-8",
            "Cache-Control": "no-store",
            ...commonHeaders,
          },
        },
      );
    }

    /* 2. GET / — content negotiation: plain text for terminals */
    if (path === "/" && method === "GET" && isTerminalClient(ua)) {
      return new Response(CARD, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          Vary: "User-Agent",
          ...commonHeaders,
        },
      });
    }

    /* 3. Everything else → GitHub Pages, with the extra headers bolted on */
    try {
      const response = await fetch(request);
      const out = new Response(response.body, response);
      for (const [k, v] of Object.entries(commonHeaders)) out.headers.set(k, v);
      return out;
    } catch (err) {
      return new Response(
        "502 Bad Gateway\n\nThe origin for this request couldn't be reached.\n",
        {
          status: 502,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            ...commonHeaders,
          },
        },
      );
    }
  },
};
