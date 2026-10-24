# Power Calculator

A web tool for splitting a flat power bill when one person's equipment is responsible for part of it. The flat's server runs all day, so its share is worked out separately and paid by the person who owns it. Everyone else splits the rest.

## How it works

1. Enter the total bill, the billing period and the rate in cents per kWh.
2. The app reads the server's energy use for that period from Home Assistant and turns it into a dollar cost.
3. That cost comes off the bill first. The remainder is split evenly across the flat.
4. The breakdown is formatted for copying, so it can go into the flat chat as it is.

The split logic sits in `src/calc.ts` with no DOM or network code in it. `src/ha.ts` talks to Home Assistant and `src/format.ts` builds the summary text.

## Running it

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

`.env.local` needs three things: the Home Assistant base URL, a long-lived access token, and the entity ID of a cumulative kWh sensor. If the app is served through the same origin as Home Assistant, set `VITE_HA_URL=/ha`, otherwise give it the full URL.

The sensor has to be cumulative, since the app takes the difference between the reading at the start and the end of the period. A `utility_meter` sensor or anything on the energy dashboard works.

TypeScript and Vite, no backend.

## State

Built in April 2026 for one flat. There is no test suite yet.

MIT licensed.
