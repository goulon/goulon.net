/**
 * aurelien.goulon.net — edge worker
 *
 * Two jobs:
 *   1. GET /whoami   → show visitors their own connection, annotated
 *   2. GET /         → serve a short plain-text card to curl/wget/HTTPie,
 *                      normal HTML to browsers (content negotiation)
 *
 * Everything else — including non-GET requests to the two paths above —
 * falls through to the GitHub Pages origin untouched.
 *
 * Route: aurelien.goulon.net/*
 */

const SITE = "https://aurelien.goulon.net";

/* ── escaping ─────────────────────────────────────────────────────── */

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

/**
 * Tagged template for HTML fragments that mix trusted, hand-written markup
 * with dynamic values: the literal parts pass through untouched, every
 * `${...}` interpolation is escaped automatically. Use this instead of a
 * plain template literal anywhere a dynamic value (especially anything
 * client-supplied, like a header) ends up inside HTML — it removes the
 * need to remember `esc()` at each interpolation site.
 */
const html = (strings, ...values) =>
  strings.reduce((out, s, i) => out + s + (i < values.length ? esc(values[i]) : ""), "");

const isTerminalClient = (ua) =>
  /^(curl|Wget|HTTPie|got|python-requests|fetch)\b/i.test(ua.trim());

/** Collect what Cloudflare's edge knows about this request. */
function connectionFacts(request) {
  const cf = request.cf ?? {};
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const ipVersion = ip.includes(":") ? "IPv6" : "IPv4";

  return {
    ip,
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

function whoamiText(f) {
  const line = "─".repeat(68);
  return `${line}
  WHAT I CAN SEE ABOUT YOUR CONNECTION
${line}

  Your address        ${f.ip}
                      That is ${f.ipVersion}.

  Your network        ${f.asn} — ${f.asOrg}
                      The autonomous system that carries your traffic.

  Reached me at       ${f.colo}${f.city ? `  (you look like ${f.city}${f.region ? ", " + f.region : ""})` : ""}
                      The closest edge location that answered you.

  Protocol            ${f.httpProtocol}
  Encryption          ${f.tlsVersion}, ${f.tlsCipher}
${f.rtt ? `  Round trip          ~${f.rtt} ms\n` : ""}
  Client              ${f.ua}

${line}
  None of this is stored. It is read from the connection you just opened
  and thrown away when this response ends.

  Aurélien Goulon — ${SITE}
${line}
`;
}

/* ── /whoami : HTML ───────────────────────────────────────────────── */

function whoamiHtml(f) {
  const row = (label, value, note) => `
      <div class="fact">
        <div class="label">${esc(label)}</div>
        <div class="value">${esc(value)}</div>
        <div class="note">${note}</div>
      </div>`;

  return `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Your connection — Aurélien Goulon</title>
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
  <h1>Your connection</h1>

  <p class="intro">
    You didn’t tell me any of this. It all came from the connection your
    browser just opened to reach this page — which is roughly what every
    server you visit can see.
  </p>

${row("Your address", f.ip, html`This is <strong>${f.ipVersion}</strong>. ${f.ipVersion === "IPv6" ? "Good — you are on the modern internet. Most people still aren’t." : "The original 1981 addressing scheme. We ran out of these in 2011 and have been improvising ever since."}`)}

${row("Your network", `${f.asn} — ${f.asOrg}`, html`An <em>autonomous system</em>: one organisation’s slice of the internet. There are roughly 75,000 of them, and they spend all day telling each other which addresses they can reach. That constant negotiation is BGP, and it is the closest thing the internet has to a nervous system.`)}

${row("You reached", f.colo + (f.city ? ` — you look like ${f.city}${f.region ? ", " + f.region : ""}` : ""), html`The nearest edge location that answered you, out of hundreds worldwide. You didn’t pick it; routing did.`)}

${row("Protocol", f.httpProtocol, html`${f.httpProtocol.includes("3") ? "HTTP/3 — running over QUIC on UDP rather than TCP. Faster to set up, and it survives switching from Wi-Fi to cellular without dropping." : f.httpProtocol.includes("2") ? "HTTP/2 — many requests multiplexed over one connection instead of queued one behind the other." : "HTTP/1.1, from 1997. Still works."}`)}

${row("Encryption", `${f.tlsVersion} · ${f.tlsCipher}`, html`Negotiated in the first fraction of a second, before a single byte of this page moved. Nobody between us can read it.`)}

${f.rtt ? row("Round trip", `~${f.rtt} ms`, html`How long a packet takes to get from you to the edge and back. Light in fibre covers about 200 km per millisecond.`) : ""}

${row("Your client", f.ua, html`The identifying string your browser or client sends with every request. It’s entirely self-reported — nothing on the wire verifies it, so it’s also the easiest of these facts to fake.`)}

  <p class="outro">
    None of this is logged or stored. It is read off the live connection and
    discarded when this response finishes. There is no database here, and no
    cookie was set.
    <br><br>
    Prefer a terminal? <code>curl ${SITE}/whoami</code>
    <br>
    <a href="/">Back to the site</a>
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

    /* 1. GET /whoami */
    if (path === "/whoami" && method === "GET") {
      const facts = connectionFacts(request);
      const wantsText =
        isTerminalClient(ua) ||
        (accept.includes("text/plain") && !accept.includes("text/html"));

      return new Response(
        wantsText ? whoamiText(facts) : whoamiHtml(facts),
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
