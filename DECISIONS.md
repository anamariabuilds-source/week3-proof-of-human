# Week 3 — Decisions

## Working slice
Pre-payment counterparty consistency check for small Mexican businesses receiving new or changed supplier payment instructions through WhatsApp.

## Exact moment
The check happens after the user receives payment instructions and before the user authorizes the bank transfer.

## Evidence
- Required: one fictional WhatsApp payment-instructions screenshot.
- Optional: one fictional fiscal document.
- Optional: one bank-information source, entered manually or uploaded as a fictional banking-app screenshot.
- WhatsApp alone can start the check.
- At least one additional usable source is needed to produce Match or Mismatch.
- Missing, invalid, or unresolved evidence becomes Unverified.

## Result logic
- Coincide = Match.
- No coincide = Mismatch.
- No verificado = Unverified.
- Unverified does not mean suspicious.
- Match does not mean safe or trustworthy.
- Mismatch does not prove fraud.
- No trust score.
- No automated SAFE or FRAUD verdict.

## Technical boundaries
- Vision AI performs extraction only.
- The user reviews and can correct extracted fields.
- Deterministic code validates and compares fields.
- Fixed Spanish templates explain results and next steps.
- No application-level persistence.
- No database or accounts in this working slice.
- No intentional logging of uploaded images or extracted information.
- Fictional demonstration data only.

## Product boundaries
- The prototype does not authenticate fiscal documents with SAT.
- It does not independently verify bank-account ownership.
- It does not verify ownership of a WhatsApp number.
- It does not detect deepfakes, voice clones, biometrics, or document forgery.
- It does not send, approve, reject, pause, or block a real transfer.
- The final payment decision remains with the user.

## Benchmark
The main global benchmark is the UK's Confirmation of Payee. This prototype borrows the pre-payment comparison principle but does not reproduce direct payment-provider verification.

## Long-view boundary
The product may eventually use stronger authoritative evidence and expand to other messaging channels, while preserving the same pre-payment transaction moment. No trust score and no automated SAFE or FRAUD verdict remain permanent product boundaries.

## Pending
- First deployment after extraction integration.
- Final source/limit polish, Shadow Clause demo cases, and behavior prompt.

## Session Close
### 2026-08-27 — Commit 1 application shell

- Initialized the application with Next.js, TypeScript, and Tailwind CSS.
- Locked the interface moment to after receiving payment instructions through WhatsApp and before authorizing the bank transfer.
- Implemented a mobile-first Spanish shell with local-only navigation through required WhatsApp evidence, optional fiscal evidence, optional bank evidence, and pre-transfer review.
- Added persistent language stating that the prototype compares available information and does not determine whether a counterparty is safe, trustworthy, or fraudulent.
- Kept evidence input, vision extraction, field definitions, validation, comparison, result states, external APIs, authentication, and persistence outside this commit.

Next first move: implement validated evidence inputs and editable review/correction forms using local state, without adding vision extraction or comparison logic.

### 2026-08-27 — Commit 2 evidence input and review

- Made one WhatsApp payment-instructions screenshot the required starting evidence and kept fiscal and bank evidence optional.
- Limited image inputs in this increment to one JPG, PNG, or WebP file of at most 5 MB; PDF support remains an open decision for a later increment.
- Added explicit confirmation that every uploaded image contains fictional or demonstration information only.
- Added local editable fields for WhatsApp claims (displayed name, RFC, bank, and CLABE), fiscal claims (legal name and RFC), and bank information (displayed beneficiary, bank, and CLABE).
- Supported one bank source through either manual entry or one fictional banking-app screenshot.
- Added format and length validation, at-least-one-field validation, and an explicit reviewed/corrected confirmation before each included source can proceed.
- Kept all files and entered information in browser memory only, with no persistence, external requests, or intentional evidence logging.
- Labeled fiscal information as document-provided and not SAT-verified, and bank information as user-provided rather than independent account-owner verification.
- Preserved optional missing evidence as a neutral absence and did not create comparison or result states.

Next first move: select the vision provider and implement extraction-only server calls with strict response validation, while preserving user review/correction and keeping all comparison logic out of the model.

### 2026-08-27 — Commit 3 extraction-only vision integration

- Selected the Google Gemini Developer API with the stable `gemini-2.5-flash-lite` model for extraction only.
- Locked `GEMINI_API_KEY` as a server-only environment variable; it must not use a `NEXT_PUBLIC_` prefix or enter Git.
- Kept JPG, PNG, and WebP as the only supported inputs and explicitly excluded PDF support from this working slice.
- Reduced the maximum image size from 5 MB to 4 MB to remain below Vercel's 4.5 MB function request limit after multipart overhead.
- Send one image inline from server memory to Gemini. The implementation does not use Gemini File API, Vercel Blob, a database, filesystem persistence, or intentional evidence logging.
- Locked WhatsApp extraction fields to displayed name, RFC, bank name, and CLABE; fiscal extraction fields to legal name and RFC; and bank-screenshot fields to displayed beneficiary name, bank name, and CLABE.
- Added strict source-specific response schemas with exact keys, nullable values, `extracted` / `not_found` / `uncertain` states, runtime validation, and rejection of extra fields.
- Invalid, missing, illegible, ambiguous, or uncertain model output remains empty and unresolved. No confidence scores or model-written explanations are used.
- Kept all extracted fields editable and reset the reviewed confirmation after every successful extraction. Provider failure leaves manual review/correction available.
- Added a pre-extraction disclosure that the fictional image is sent to Google. Gemini's unpaid tier may use inputs and outputs for product improvement and human review, so real, personal, sensitive, or confidential evidence remains prohibited.
- Gemini does not evaluate trust, fraud, safety, identity, ownership, authenticity, SAT status, or evidence relationships. Comparison remains deterministic TypeScript work for a later commit.

Next first move: configure `GEMINI_API_KEY` in the deployment environment and complete Deploy 1, then implement deterministic comparison only after Commit 4 approval.

### 2026-08-28 — Gemini model compatibility fix

- The first live local extraction reached Gemini, but `gemini-2.5-flash-lite` returned HTTP 404 because it is no longer available to new API users.
- Locked the replacement model to `gemini-3.5-flash-lite`; the provider, extraction-only purpose, exact schemas, and all product boundaries remain unchanged.
- Provider HTTP 429 and 503 failures receive exactly one retry after a bounded 750 ms delay. Other provider errors are not retried.
- Server diagnostics contain only the provider name, HTTP status, and normalized error category. They do not include keys, images, extracted values, prompts, provider response bodies, or evidence contents.
- If the retry also encounters provider capacity or rate limits, the existing bounded user-facing fallback remains unchanged and manual entry stays available.

Next first move: after approval, commit this compatibility fix, configure the server-only key in Vercel, and complete Deploy 1.

### 2026-08-28 — Commit 4 deterministic evidence comparison

- Locked the deterministic comparison matrix to five source-to-source relationships: WhatsApp RFC ↔ fiscal RFC; WhatsApp displayed name ↔ fiscal legal name; WhatsApp CLABE ↔ bank CLABE; WhatsApp bank name ↔ bank name; and WhatsApp displayed name ↔ bank beneficiary name.
- Comparison uses only the editable values after the user has reviewed and corrected each included source. Raw Gemini output is never compared directly, and Gemini does not classify relationships.
- `Coincide` means both supported values are present and equal after the field's transparent normalization. It does not mean the counterparty is safe or trustworthy.
- `No coincide` means both supported values are present and different after normalization. It does not prove fraud, illegitimacy, or risk.
- `No verificado` means one or both supported values are absent, so consistency or conflict cannot be established. It is not suspicious or negative evidence.
- RFC normalization trims whitespace and compares uppercase values. CLABE normalization trims whitespace and otherwise compares the reviewed 18-digit value exactly.
- Name and bank-name normalization applies Unicode NFKC normalization, trim, Spanish lowercase, removal of periods and commas, replacement of other punctuation/symbols with spaces, and repeated-whitespace collapse. It does not remove corporate suffixes, strip accents, use fuzzy similarity, infer aliases, or use semantic/AI matching.
- When two reviewed name fields are present but the transparent normalized strings differ, the relationship is `No coincide`; the interface explicitly notes that commercial, legal, personal, and bank-displayed names may legitimately differ. When either name is absent, it is `No verificado`.
- Results are ordered `No coincide`, then `No verificado`, then `Coincide`; matching results remain visible and every card shows both source names and reviewed values.
- Optional missing fiscal or bank evidence uses the neutral `No verificado` presentation and is visually distinct from a conflict.
- No trust score, SAFE/FRAUD verdict, external verification, persistence, or new evidence source was added.

Next first move: implement Commit 5 source/limit polish, legitimate incomplete demo cases, input-validation refinements, and the final “¿Qué harías ahora?” behavior prompt.
