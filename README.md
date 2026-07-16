# Sinus & Allergy Quiz — BreatheBetter Institute (rebuild)

A self-contained rebuild of the SNOT-22 quiz formerly at
`https://breathebetterhuntsville.com/sinus-allergy-quiz/`. One file
([index.html](index.html)), no dependencies, mobile-first.

- **Staging:** https://practice-growth-co.github.io/breathebetter-sinus-quiz/
- **Deploys:** push to `main` on `practice-growth-co/breathebetter-sinus-quiz`; GitHub Pages rebuilds in ~1 min.

## Architecture

```
Webflow page (iframe embed, passes ?utm_*/gclid/msclkid/fbclid through)
   └── Quiz (index.html)  — builds RSI v2 JSON payload
         └── Cloudflare Worker relay (rsi-relay-worker.js) — adds secret headers
               └── RSI External Lead Webhook v2
                   POST https://portal.redspotinteractive.com/api/v2/leads/webhook
```

The Worker exists because Webflow can't run server-side code and the RSI
credentials (API key / client id / signature) must not appear in public page
source. Verified by probe: the RSI endpoint enforces the signature (401
without it) and allows CORS, so the Worker is the only required middle piece.

## What the quiz sends (RSI v2 field names, case-sensitive)

| Field | Value |
|---|---|
| `firstName` / `lastName` | from contact step |
| `email` / `phone` | from contact step |
| `campaignId` | `60873` (set in `CONFIG`) |
| `formName` | `SinusAllergyQuiz` |
| `referralSource` | `Internet` |
| `message` | SNOT-22 total score, severity band, and all 22 answers |
| `utmCampaign/Source/Medium/Content/Term` | from quiz URL query string, only when present |
| `googleClickId` / `microsoftClickId` / `fbclid` | gclid / msclkid / fbclid from query string |

## Setup checklist

1. **Get the Signature from RSI Customer Success** (Client ID 922). We already
   have the API key; the signature is the missing third credential — requests
   without it get 401.
2. **Deploy the Worker** (Cloudflare dashboard → Workers & Pages → Create →
   paste `rsi-relay-worker.js`). Add variables under Settings → Variables &
   Secrets: `RSI_API_KEY` (secret), `RSI_CLIENT_ID` (secret, `922`),
   `RSI_SIGNATURE` (secret), and optionally `ALLOWED_ORIGINS` (plain text,
   comma-separated — the Webflow domain + staging origin).
3. **Point the quiz at the Worker:** set `CONFIG.submitUrl` in `index.html`
   to the Worker URL, push to `main`.
4. **Test:** submit the quiz using the client's designated test identity
   (Test Test / test@test.com / (999) 999-9999) and confirm with RSI that the
   lead landed on campaign 60873 with `formName: SinusAllergyQuiz`.
5. **Launch:** remove the `noindex` meta tag in `index.html`, embed in Webflow
   (below).

## Embedding in Webflow

Add an **Embed** element to the page and paste:

```html
<div id="sinus-quiz"></div>
<script>
  (function () {
    var f = document.createElement("iframe");
    f.src = "https://practice-growth-co.github.io/breathebetter-sinus-quiz/" + window.location.search;
    f.style.cssText = "width:100%;min-height:760px;border:0;";
    f.title = "Sinus and Allergy Quiz";
    f.loading = "lazy";
    document.getElementById("sinus-quiz").appendChild(f);
  })();
</script>
```

The `window.location.search` passthrough is what carries UTM tags and ad
click IDs from the Webflow page URL into the quiz, so ads → landing page →
quiz attribution keeps working. If the client wants the quiz on their own
domain instead of github.io, the single `index.html` can be hosted anywhere
(Cloudflare Pages on the same account as the Worker is a natural fit).

Also re-add RSI's site-wide tracking script to the new Webflow site
(`https://cdn.redspotinteractive.com/utm/bundle.js` was on the old WordPress
site) via Site Settings → Custom Code, so RSI's own attribution features
keep working across pages.

## Local preview

```
cd sinus-allergy-quiz && python3 -m http.server 8742
# open http://localhost:8742/index.html?utm_source=test&gclid=TEST123
```

With `CONFIG.submitUrl` empty, submissions are logged to the browser console
and nothing is sent (safe for staging/demo).
