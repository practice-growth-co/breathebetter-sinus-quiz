# Sinus & Allergy Quiz — BreatheBetter Institute (rebuild)

A self-contained rebuild of the SNOT-22 quiz at
`https://breathebetterhuntsville.com/sinus-allergy-quiz/`. One file
([index.html](index.html)), no dependencies, mobile-first.

## What changed vs. the old quiz

| | Old (forms.glacial.com embed) | New |
|---|---|---|
| Question flow | All 22 questions on one page (~132 radio rows) | One question per screen, tap to auto-advance (~2 min) |
| Progress | Jumps 33% → 67% → 100% | Real "N of 22" progress bar |
| Contact gate | Before the questions (step 2) | After the questions, framed as "see your results" |
| Results | Hidden formula field, no interpretation shown | Animated score ring + severity band (Minimal / Mild / Moderate / Severe) + appointment CTA |
| Keyboard | None | 0–5 number keys answer questions |

Scoring is identical: sum of 22 answers (0–5 each), 0–110 total (SNOT-22).
Severity bands use the published SNOT-22 cutoffs: 0–7 minimal, 8–20 mild,
21–50 moderate, 51+ severe.

## Red Spot Interactive (RSI) connection

The old form carried these hidden fields, which RSI's `bundle.js`
(`https://cdn.redspotinteractive.com/utm/bundle.js`, already loaded on the
WordPress site) populates via the embed URL's query string:

- `RSI Client ID` = **922**, `RSI Campaign ID` = **60873** (static, set in `CONFIG`)
- `UTMcampaign`, `UTMsource`, `UTMmedium`, `UTMcontent`, `UTMterm`, `UTMlandingpage`, `GCLID` (from URL params)

The new quiz reproduces all of them with the **exact same field names** in the
submission payload, so RSI's lead mapping doesn't change.

### What you still need from RSI

Set `CONFIG.submitUrl` in `index.html` to the endpoint that delivers leads to
RSI. Ask your RSI account rep for one of:

1. **A lead-post/webhook URL** for client 922 / campaign 60873 (preferred —
   the quiz POSTs JSON with the field names above), or
2. **A lead-parsing email address** — in that case route the POST through a
   small relay (WP plugin, Zapier, or a serverless function) that emails the
   payload in RSI's expected format.

Until `submitUrl` is set, submissions are logged to the browser console and
nothing is sent (safe for staging).

The quiz also pushes a `quiz_submission` event (with score) to `dataLayer`
if Google Tag Manager is present, so the AW-17668209953 conversion tag can
fire on it.

## Embedding in WordPress

Host `index.html` (upload to the theme, a subdomain, or keep it as a page
template) and embed with query-string passthrough so RSI's UTM data reaches
the quiz — same mechanism the old embed used:

```html
<div id="sinus-quiz"></div>
<script>
  (function () {
    var f = document.createElement("iframe");
    f.src = "https://QUIZ-HOST/index.html" + window.location.search;
    f.style.cssText = "width:100%;min-height:720px;border:0;";
    f.title = "Sinus and Allergy Quiz";
    document.getElementById("sinus-quiz").appendChild(f);
  })();
</script>
```

(If RSI's bundle.js rewrites embed URLs the way it did for the old form, it
may handle the passthrough itself — verify with a `?utm_source=test` visit.)

## Local preview

```
cd sinus-allergy-quiz && python3 -m http.server 8742
# open http://localhost:8742/index.html?utm_source=test&gclid=TEST123
```

## Config (top of the `<script>` block in index.html)

```js
const CONFIG = {
  submitUrl: "",                 // RSI webhook / relay endpoint — REQUIRED before launch
  rsiClientId: "922",
  rsiCampaignId: "60873",
  appointmentUrl: "https://breathebetterhuntsville.com/request-an-appointment/",
};
```
