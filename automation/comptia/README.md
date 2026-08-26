# Skunkworks Academy × CompTIA Social Content Engine

Status: **scaffolded, disabled by default**  
Timezone: `Africa/Johannesburg`  
Campaign entrypoint: `https://comptia.skunkworksacademy.com/`  
Canonical measurement hub: `https://www.skunkworksacademy.com/comptia/`

## Purpose

This automation publishes and verifies the 30-day Skunkworks Academy × CompTIA campaign across:

- LinkedIn organization page;
- Facebook Page;
- Instagram professional account;
- WhatsApp Business Cloud API recipients who have a recorded marketing opt-in.

The campaign is intentionally disabled until the commerce/measurement readiness gates pass and platform credentials are configured.

## Safety and governance

- No social access tokens are committed to the repository.
- Publishing is fail-closed when required credentials/configuration are absent.
- Each asset has immutable `content_id` and `asset_id` values used in UTM attribution.
- The publisher records a platform object ID and performs a read-back verification where the platform supports it.
- WhatsApp marketing sends require `opt_in: true` for every recipient and an approved message template.
- The engine never scrapes or invents recipient numbers.
- Instagram publishing requires a public HTTPS creative URL.
- Co-branded creative must preserve approved CompTIA and Skunkworks logo proportions, colours and clear-space; partner marks remain visually separated.
- Content uses one clear CTA and avoids certification/job outcome guarantees.

## Campaign activation gates

Do not set `COMPTIA_SOCIAL_AUTOMATION_ENABLED=true` until:

1. `skunkworks-academy/www#71` is deployed and GA4 receives the CompTIA event contract.
2. `skunkworks-academy/comptia#1` is deployed and vanity redirects preserve UTMs.
3. Merchant Center pricing/currency/SKU integrity checks pass.
4. At least one canonical Skunkworks-owned destination exists for every promoted offer.
5. LinkedIn, Meta and WhatsApp credentials pass a dry-run/preflight.
6. One test post per platform is published and verified.
7. Failure handling is confirmed by intentionally withholding a non-production test credential.

## Repository variables

Set these as GitHub **Variables** (not secrets unless your governance requires it):

- `COMPTIA_SOCIAL_AUTOMATION_ENABLED` — `true` only after activation gates pass.
- `COMPTIA_CAMPAIGN_START_DATE` — `YYYY-MM-DD` in SAST; day 1 is this date.
- `LINKEDIN_ORGANIZATION_URN` — for example `urn:li:organization:123456`.
- `LINKEDIN_VERSION` — supported LinkedIn Marketing API version in `YYYYMM` format.
- `META_GRAPH_VERSION` — approved Graph API version such as `vXX.X`; do not hard-code a stale version in source.
- `FACEBOOK_PAGE_ID`.
- `INSTAGRAM_USER_ID`.
- `WHATSAPP_PHONE_NUMBER_ID`.
- `WHATSAPP_TEMPLATE_NAME` — approved marketing template with body parameters: headline, short copy, URL.
- `WHATSAPP_TEMPLATE_LANGUAGE` — e.g. `en_US`.

## Repository secrets

- `LINKEDIN_ACCESS_TOKEN`
- `FACEBOOK_PAGE_ACCESS_TOKEN`
- `INSTAGRAM_ACCESS_TOKEN`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_RECIPIENTS_JSON`

`WHATSAPP_RECIPIENTS_JSON` format:

```json
[
  {"to":"2782XXXXXXX","opt_in":true,"source":"crm","consent_at":"2026-08-01T10:00:00+02:00"}
]
```

Do not add a recipient unless there is evidence of marketing consent.

## Run modes

### Dry run

```bash
node automation/comptia/publish.mjs --day 1 --platform linkedin --dry-run
```

Dry run builds the final UTM URL and payload but does not call the platform.

### Live manual test

```bash
node automation/comptia/publish.mjs --day 1 --platform linkedin --live
```

### Scheduled mode

The GitHub Actions workflow runs hourly. It computes the campaign day from `COMPTIA_CAMPAIGN_START_DATE`, checks each platform's configured SAST publishing time and publishes only items that are due and not already recorded in `state/published.json`.

## UTM contract

The publisher generates:

- `utm_id=comptia-2026q3-cert-pathways`
- `utm_source=linkedin|facebook|instagram|whatsapp`
- `utm_medium=organic-social` for LinkedIn/Facebook/Instagram
- `utm_medium=messaging` for WhatsApp
- `utm_campaign=comptia-cert-pathways-202608`
- `utm_content=<platform>-<asset-id>`
- `skw_asset_id=<immutable asset id>`
- `skw_content_id=<immutable content concept id>`

## Verification model

- LinkedIn: GET the created post URN with `viewContext=AUTHOR`; require `lifecycleState=PUBLISHED`.
- Facebook: GET the created Page post and require a returned ID; capture `permalink_url` where available.
- Instagram: GET the published media ID; require a returned ID and capture `permalink`.
- WhatsApp: the send API returning a WhatsApp message ID proves platform acceptance, not delivery. Delivery/read verification requires Meta webhook status ingestion and remains a separate activation gate if delivery-level proof is required.

## State

`state/published.json` is an append-style audit record keyed by `day/platform`. GitHub Actions commits state only after the publisher returns success.

A failed platform call causes the workflow to fail and no success state is written for that platform, so the next scheduled run can retry safely.
