# CLR Transcript Studio

Next.js application for converting 1EdTech CLR 2.0 and embedded Open Badge credentials into a print-ready transcript or report-card style layout.

The app accepts:

- a CLR link
- pasted CLR JSON
- a built-in demo CLR

It then normalizes credentials into course rows, adds transcript fields such as institution name, reporting period, result, registrar, and principal, and renders a professional preview with:

- course listing
- skill summary
- QR verification
- print preview
- PDF download

## Stack

- Next.js App Router
- React
- Redux Toolkit
- RTK Query
- Playwright Chromium for PDF rendering
- qrcode.react

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Test Sources

You can test the app in three ways:

1. Demo mode
   Uses the bundled multi-course CLR payload already loaded into the app.
2. URL mode
   Enter a direct CLR JSON URL, or click `Use local demo CLR URL` to test URL ingestion against:
   `http://localhost:3000/api/clr/demo`
3. JSON mode
   Paste a CLR/Open Badge JSON payload directly.

## Current Normalization Rules

The normalizer is in [src/lib/clr/normalize.ts](src/lib/clr/normalize.ts).

It currently:

- detects top-level CLR credentials and embedded `verifiableCredential` entries
- treats embedded Open Badge / achievement credentials as transcript courses
- extracts course title, identifier/code, term, grade, credits, result, and skills
- derives a transcript summary including total courses, credits, average grade, and top skills
- preserves a verification URL for QR generation

## API Routes

- `POST /api/clr/normalize`
  Accepts `{ mode, url?, json? }` and returns normalized transcript data.
- `GET /api/clr/demo`
  Returns the built-in demo CLR payload as JSON.

## Layout Files

- [src/components/studio/transcript-studio.tsx](src/components/studio/transcript-studio.tsx)
  Main app shell and editor panel
- [src/components/transcript/transcript-preview.tsx](src/components/transcript/transcript-preview.tsx)
  Print-first transcript rendering
- [src/components/studio/transcript-studio.module.css](src/components/studio/transcript-studio.module.css)
  Sidebar/editor styles
- [src/components/transcript/transcript-preview.module.css](src/components/transcript/transcript-preview.module.css)
  Transcript page styles
- [src/app/globals.css](src/app/globals.css)
  Global theme and print rules

## Notes

- The app intentionally labels CLR credentials as courses in the transcript view.
- Badge terminology is not shown in the report-card layout.
- The QR code links to the source CLR URL when available.
- PDF export is handled by the server route using Playwright Chromium.

## Validation

Validated with:

```bash
npm run lint
npm run build
```

## Next Recommended Step

Provide one real client CLR URL and inspect its exact JSON shape. That will let you tighten any issuer-specific mapping logic for results, course codes, skills, and verification links.
