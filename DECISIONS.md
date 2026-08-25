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
- Team Blueprint alignment.
- Final Blueprint condition mapping.
- Final vision-provider selection.
- Final docs/PACKET.md assembly.
- Implementation prompt.
- Application code.

## Session Close
No application code has been created before the final Packet.
Next first move: review the Team Blueprint against the locked decisions and complete docs/PACKET.md.
