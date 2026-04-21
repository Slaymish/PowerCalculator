# Power Calculator

## Overview

A lightweight web app that helps Cole calculate and communicate the flat's monthly power bill split. Hosted on Hamish's PC. Designed to feel like a simple, handmade tool — not AI-generated.

## The Problem

Every month Cole receives a power bill and has to manually calculate how much each person owes. Hamish's PC server runs 24/7 and its power cost should only be paid by Hamish, not split across the flat. Currently this requires manual back-and-forth between Cole and Hamish.

## Calculation Logic

1. Fetch Hamish's server energy usage (kWh) from Home Assistant for the billing period
2. Convert kWh to a dollar cost using the flat's power rate
3. Subtract that cost from the total bill
4. Split the remainder equally across all 5 flatmates
5. Hamish pays his equal share + the full server cost

## Primary User: Cole

- 22, does flat admin on his MacBook in Chrome
- Principled about fairness — will want to see the breakdown, not just the number
- Sceptical of AI-generated things; the app should feel like something Hamish built himself, not a generated artefact. No AI aesthetics, no suspiciously generic UI.

## User Journey

1. Cole receives power bill email in Gmail
2. He opens the Power Calculator in Chrome
3. He enters: total bill amount, billing period (start/end date), power rate (cents/kWh — may vary)
4. App fetches Hamish's server kWh from Home Assistant for that period automatically
5. App displays a transparent breakdown:
   - Server kWh used, cost calculated
   - Remaining bill after server cost removed
   - Each person's share
6. Below the breakdown: a clean, copyable summary formatted for pasting into iMessage
7. Cole copies the summary, pastes it into iMessage (Mac or iPhone via universal clipboard), sends to flat group

## Output Format (copyable summary)

```
Power bill — [Month]
Everyone (Cole, Will, Brontë, Kita): $X each
Hamish: $Y
```

## Technical Notes

- Hosted on Hamish's PC, accessible remotely
- Pulls from Home Assistant external URL via long-lived access token
- Power rate should be editable (not hardcoded) — varies billing period to billing period
- No backend required beyond HA — pure frontend is fine
- Deployment details to be handled separately

## Non-Goals

- No user accounts, no login
- No persistent history
- No mobile-first design (Cole uses MacBook + Chrome)
