#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import calendar from './content-calendar.mjs';

const failures = [];
const requiredPlatforms = ['linkedin', 'facebook', 'instagram', 'whatsapp'];
const expectedDays = Array.from({ length: 30 }, (_, index) => index + 1);
const fail = (message) => failures.push(message);
const unique = (values) => new Set(values).size === values.length;

if (calendar.days.length !== 30) fail(`expected 30 campaign days, found ${calendar.days.length}`);
if (JSON.stringify(calendar.days.map((item) => item.day)) !== JSON.stringify(expectedDays)) {
  fail('campaign days must be exactly 1 through 30 in order');
}

for (const platform of requiredPlatforms) {
  const template = calendar.templates?.[platform];
  if (!template) fail(`missing ${platform} content template`);
  if (!String(template || '').includes('{{url}}')) fail(`${platform} template must include {{url}}`);
}

if (!unique(calendar.days.map((item) => item.content_id))) fail('content_id values must be unique');
if (!unique(calendar.days.map((item) => item.asset_id))) fail('asset_id values must be unique');

for (const item of calendar.days) {
  for (const field of ['pillar', 'content_id', 'asset_id', 'headline', 'proof', 'cta', 'whatsapp_short', 'destination', 'creative_url']) {
    if (!String(item[field] || '').trim()) fail(`day ${item.day}: missing ${field}`);
  }

  let destination;
  let creative;
  try { destination = new URL(item.destination); } catch { fail(`day ${item.day}: destination is not a valid URL`); }
  try { creative = new URL(item.creative_url); } catch { fail(`day ${item.day}: creative_url is not a valid URL`); }

  if (destination && destination.protocol !== 'https:') fail(`day ${item.day}: destination must use HTTPS`);
  if (destination && destination.hostname !== 'comptia.skunkworksacademy.com') fail(`day ${item.day}: destination must use the CompTIA campaign hub`);
  if (creative && creative.protocol !== 'https:') fail(`day ${item.day}: creative_url must use HTTPS`);
  if (creative && creative.hostname !== 'marketing.skunkworksacademy.com') fail(`day ${item.day}: creative_url must use the controlled marketing host`);
  if (creative && !creative.pathname.endsWith('.png')) fail(`day ${item.day}: Instagram creative must be a PNG URL`);

  for (const platform of requiredPlatforms) {
    const time = item.publish_times?.[platform];
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(time || ''))) fail(`day ${item.day}: invalid ${platform} publishing time`);
  }

  const text = [item.headline, item.proof, item.cta, item.whatsapp_short].join(' ');
  if (/\b(guaranteed?|guarantees?|100% pass|job guaranteed|salary guaranteed)\b/i.test(text)) {
    fail(`day ${item.day}: prohibited outcome guarantee detected`);
  }
  if (/\b(twitter|x\.com)\b/i.test(text)) fail(`day ${item.day}: Twitter/X is not an approved campaign platform`);
}

const source = fs.readFileSync(new URL('./content-calendar.mjs', import.meta.url), 'utf8');
if (/access[_ -]?token|api[_ -]?key|client[_ -]?secret/i.test(source)) fail('content source must not contain credentials');

if (failures.length) {
  console.error('CompTIA social automation validation failed.');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('CompTIA social automation validation passed.');
console.log('Validated 30 days, four channels, immutable IDs, controlled URLs, scheduling format and outcome-claim guardrails.');
