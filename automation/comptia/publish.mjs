#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(process.cwd(), 'automation/comptia');
const CALENDAR_PATH = path.join(ROOT, 'content-calendar.json');
const STATE_PATH = path.join(ROOT, 'state/published.json');
const TIMEZONE = 'Africa/Johannesburg';
const TERMINAL_STATUSES = new Set(['published', 'accepted']);

function parseArgs(argv) {
  const args = { dryRun: false, live: false, day: null, platform: null };
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === '--dry-run') args.dryRun = true;
    else if (value === '--live') args.live = true;
    else if (value === '--day') args.day = Number(argv[++i]);
    else if (value === '--platform') args.platform = String(argv[++i] || '').toLowerCase();
  }
  if (args.dryRun && args.live) throw new Error('Choose either --dry-run or --live, not both.');
  return args;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readState() {
  if (!fs.existsSync(STATE_PATH)) return { version: 1, records: {} };
  const state = readJson(STATE_PATH);
  state.records ||= {};
  return state;
}

function writeState(state) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function env(name, { required = false } = {}) {
  const value = String(process.env[name] || '').trim();
  if (required && !value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function localDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`
  };
}

function dateDiffDays(start, end) {
  const startMs = Date.parse(`${start}T00:00:00Z`);
  const endMs = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) throw new Error('Invalid campaign date. Use YYYY-MM-DD.');
  return Math.floor((endMs - startMs) / 86400000);
}

function resolveCampaignDay(args) {
  if (Number.isInteger(args.day) && args.day >= 1 && args.day <= 30) return args.day;
  const start = env('COMPTIA_CAMPAIGN_START_DATE', { required: true });
  const today = localDateParts().date;
  return dateDiffDays(start, today) + 1;
}

function buildTrackedUrl(campaign, item, platform) {
  const target = new URL(item.destination);
  const medium = platform === 'whatsapp' ? 'messaging' : 'organic-social';
  target.searchParams.set('utm_id', campaign.campaign_id);
  target.searchParams.set('utm_source', platform);
  target.searchParams.set('utm_medium', medium);
  target.searchParams.set('utm_campaign', campaign.utm_campaign);
  target.searchParams.set('utm_content', `${platform}-${item.asset_id}`);
  target.searchParams.set('skw_asset_id', item.asset_id);
  target.searchParams.set('skw_content_id', item.content_id);
  return target.toString();
}

function renderCopy(template, item, url) {
  return String(template || '')
    .replaceAll('{{url}}', url)
    .replaceAll('{{headline}}', item.headline)
    .replaceAll('{{proof}}', item.proof)
    .replaceAll('{{cta}}', item.cta)
    .trim();
}

async function responseBody(response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const body = await responseBody(response);
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
    error.details = body;
    throw error;
  }
  return { response, body };
}

function requireConfig(names) {
  const missing = names.filter((name) => !String(process.env[name] || '').trim());
  if (missing.length) throw new Error(`Missing platform configuration: ${missing.join(', ')}`);
}

async function createLinkedIn(message) {
  requireConfig(['LINKEDIN_ACCESS_TOKEN', 'LINKEDIN_ORGANIZATION_URN', 'LINKEDIN_VERSION']);
  const token = env('LINKEDIN_ACCESS_TOKEN', { required: true });
  const version = env('LINKEDIN_VERSION', { required: true });
  const author = env('LINKEDIN_ORGANIZATION_URN', { required: true });
  const { response, body } = await request('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      'Linkedin-Version': version
    },
    body: JSON.stringify({
      author,
      commentary: message,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: []
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false
    })
  });
  const id = response.headers.get('x-restli-id') || body.id;
  if (!id) throw new Error('LinkedIn accepted the request but returned no post ID.');
  return { id };
}

async function verifyLinkedIn(id) {
  requireConfig(['LINKEDIN_ACCESS_TOKEN', 'LINKEDIN_VERSION']);
  const token = env('LINKEDIN_ACCESS_TOKEN', { required: true });
  const version = env('LINKEDIN_VERSION', { required: true });
  const encoded = encodeURIComponent(id);
  const { body } = await request(`https://api.linkedin.com/rest/posts/${encoded}?viewContext=AUTHOR`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'Linkedin-Version': version
    }
  });
  return {
    verified: body.lifecycleState === 'PUBLISHED',
    lifecycle_state: body.lifecycleState || null,
    id: body.id || id
  };
}

function metaVersion() {
  const version = env('META_GRAPH_VERSION', { required: true });
  if (!/^v\d+\.\d+$/.test(version)) throw new Error('META_GRAPH_VERSION must use vNN.N format.');
  return version;
}

async function createFacebook(message, url) {
  requireConfig(['META_GRAPH_VERSION', 'FACEBOOK_PAGE_ID', 'FACEBOOK_PAGE_ACCESS_TOKEN']);
  const version = metaVersion();
  const pageId = env('FACEBOOK_PAGE_ID', { required: true });
  const token = env('FACEBOOK_PAGE_ACCESS_TOKEN', { required: true });
  const form = new URLSearchParams({ message, link: url, access_token: token });
  const { body } = await request(`https://graph.facebook.com/${version}/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form
  });
  if (!body.id) throw new Error('Facebook accepted the request but returned no post ID.');
  return { id: body.id };
}

async function verifyFacebook(id) {
  requireConfig(['META_GRAPH_VERSION', 'FACEBOOK_PAGE_ACCESS_TOKEN']);
  const version = metaVersion();
  const token = env('FACEBOOK_PAGE_ACCESS_TOKEN', { required: true });
  const query = new URLSearchParams({ fields: 'id,created_time,permalink_url', access_token: token });
  const { body } = await request(`https://graph.facebook.com/${version}/${encodeURIComponent(id)}?${query}`);
  return {
    verified: body.id === id,
    id: body.id || id,
    permalink: body.permalink_url || null,
    created_at: body.created_time || null
  };
}

async function createInstagram(message, creativeUrl) {
  requireConfig(['META_GRAPH_VERSION', 'INSTAGRAM_USER_ID', 'INSTAGRAM_ACCESS_TOKEN']);
  if (!/^https:\/\//i.test(creativeUrl || '')) throw new Error('Instagram requires a public HTTPS creative_url.');
  const version = metaVersion();
  const userId = env('INSTAGRAM_USER_ID', { required: true });
  const token = env('INSTAGRAM_ACCESS_TOKEN', { required: true });

  const createForm = new URLSearchParams({ image_url: creativeUrl, caption: message, access_token: token });
  const create = await request(`https://graph.facebook.com/${version}/${userId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: createForm
  });
  const creationId = create.body.id;
  if (!creationId) throw new Error('Instagram returned no media container ID.');

  const publishForm = new URLSearchParams({ creation_id: creationId, access_token: token });
  const publish = await request(`https://graph.facebook.com/${version}/${userId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: publishForm
  });
  if (!publish.body.id) throw new Error('Instagram returned no published media ID.');
  return { id: publish.body.id, creation_id: creationId };
}

async function verifyInstagram(id) {
  requireConfig(['META_GRAPH_VERSION', 'INSTAGRAM_ACCESS_TOKEN']);
  const version = metaVersion();
  const token = env('INSTAGRAM_ACCESS_TOKEN', { required: true });
  const query = new URLSearchParams({ fields: 'id,permalink,timestamp,media_type', access_token: token });
  const { body } = await request(`https://graph.facebook.com/${version}/${encodeURIComponent(id)}?${query}`);
  return {
    verified: body.id === id,
    id: body.id || id,
    permalink: body.permalink || null,
    created_at: body.timestamp || null,
    media_type: body.media_type || null
  };
}

function whatsappRecipients() {
  requireConfig(['WHATSAPP_RECIPIENTS_JSON']);
  let recipients;
  try {
    recipients = JSON.parse(env('WHATSAPP_RECIPIENTS_JSON', { required: true }));
  } catch {
    throw new Error('WHATSAPP_RECIPIENTS_JSON must be valid JSON.');
  }
  if (!Array.isArray(recipients) || recipients.length === 0) throw new Error('WhatsApp recipient list is empty.');
  const invalid = recipients.filter((recipient) => !recipient?.to || recipient?.opt_in !== true);
  if (invalid.length) throw new Error('Every WhatsApp recipient must include a destination and opt_in=true.');
  return recipients;
}

async function createWhatsApp(item, url) {
  requireConfig([
    'META_GRAPH_VERSION',
    'WHATSAPP_PHONE_NUMBER_ID',
    'WHATSAPP_ACCESS_TOKEN',
    'WHATSAPP_TEMPLATE_NAME',
    'WHATSAPP_TEMPLATE_LANGUAGE',
    'WHATSAPP_RECIPIENTS_JSON'
  ]);
  const version = metaVersion();
  const phoneNumberId = env('WHATSAPP_PHONE_NUMBER_ID', { required: true });
  const token = env('WHATSAPP_ACCESS_TOKEN', { required: true });
  const templateName = env('WHATSAPP_TEMPLATE_NAME', { required: true });
  const language = env('WHATSAPP_TEMPLATE_LANGUAGE', { required: true });
  const recipients = whatsappRecipients();
  const accepted = [];

  for (const recipient of recipients) {
    const payload = {
      messaging_product: 'whatsapp',
      to: recipient.to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: language },
        components: [{
          type: 'body',
          parameters: [
            { type: 'text', text: item.headline },
            { type: 'text', text: item.whatsapp_short },
            { type: 'text', text: url }
          ]
        }]
      }
    };
    const { body } = await request(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const messageId = body.messages?.[0]?.id;
    if (!messageId) throw new Error(`WhatsApp accepted no message ID for recipient ending ${String(recipient.to).slice(-4)}.`);
    accepted.push({ id: messageId, recipient_ref: String(recipient.to).slice(-4) });
  }

  return { id: accepted[0]?.id || null, accepted };
}

async function verifyExisting(platform, record) {
  if (!record?.id) return { verified: false };
  if (platform === 'linkedin') return verifyLinkedIn(record.id);
  if (platform === 'facebook') return verifyFacebook(record.id);
  if (platform === 'instagram') return verifyInstagram(record.id);
  if (platform === 'whatsapp') return { verified: true, acceptance_only: true, id: record.id };
  return { verified: false };
}

async function publishPlatform(platform, item, message, url) {
  if (platform === 'linkedin') {
    const created = await createLinkedIn(message);
    return { created, verification: await verifyLinkedIn(created.id) };
  }
  if (platform === 'facebook') {
    const created = await createFacebook(message, url);
    return { created, verification: await verifyFacebook(created.id) };
  }
  if (platform === 'instagram') {
    const created = await createInstagram(message, item.creative_url);
    return { created, verification: await verifyInstagram(created.id) };
  }
  if (platform === 'whatsapp') {
    const created = await createWhatsApp(item, url);
    return { created, verification: { verified: true, acceptance_only: true, id: created.id } };
  }
  throw new Error(`Unsupported platform: ${platform}`);
}

function isDue(item, platform, now) {
  const due = item.publish_times?.[platform];
  if (!due) return false;
  return now.time >= due;
}

function dryRunPayload(platform, item, message, url) {
  const base = { platform, day: item.day, content_id: item.content_id, asset_id: item.asset_id, message, url };
  if (platform === 'instagram') base.creative_url = item.creative_url;
  if (platform === 'whatsapp') base.delivery = 'approved-template-only';
  return base;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const calendar = readJson(CALENDAR_PATH);
  const state = readState();
  const now = localDateParts();
  const day = resolveCampaignDay(args);
  const item = calendar.days.find((entry) => entry.day === day);

  if (!item) {
    console.log(`No CompTIA campaign content for day ${day}; nothing to publish.`);
    return;
  }

  const live = args.live || (!args.dryRun && env('COMPTIA_SOCIAL_AUTOMATION_ENABLED').toLowerCase() === 'true');
  if (!live && !args.dryRun) {
    console.log('COMPTIA_SOCIAL_AUTOMATION_ENABLED is not true; scheduled publisher is disabled.');
    return;
  }

  const platforms = args.platform ? [args.platform] : ['linkedin', 'facebook', 'instagram', 'whatsapp'];
  const failures = [];

  for (const platform of platforms) {
    if (!item.copy?.[platform]) continue;
    if (!args.day && !isDue(item, platform, now)) continue;

    const key = `${String(day).padStart(2, '0')}/${platform}`;
    const existing = state.records[key];

    if (existing && TERMINAL_STATUSES.has(existing.status)) {
      console.log(`${key} already ${existing.status}; skipping.`);
      continue;
    }

    try {
      if (existing?.status === 'published_unverified') {
        const verification = await verifyExisting(platform, existing);
        if (verification.verified) {
          state.records[key] = {
            ...existing,
            status: platform === 'whatsapp' ? 'accepted' : 'published',
            verified_at: new Date().toISOString(),
            verification
          };
          writeState(state);
          console.log(`${key} verification completed.`);
        } else {
          throw new Error(`${key} exists but is not yet verifiably published.`);
        }
        continue;
      }

      const url = buildTrackedUrl(calendar.campaign, item, platform);
      const message = renderCopy(item.copy[platform], item, url);

      if (!live) {
        console.log(JSON.stringify(dryRunPayload(platform, item, message, url), null, 2));
        continue;
      }

      const result = await publishPlatform(platform, item, message, url);
      const verified = Boolean(result.verification?.verified);
      state.records[key] = {
        day,
        platform,
        content_id: item.content_id,
        asset_id: item.asset_id,
        destination: url,
        id: result.created?.id || null,
        status: platform === 'whatsapp' ? 'accepted' : (verified ? 'published' : 'published_unverified'),
        published_at: new Date().toISOString(),
        verification: result.verification,
        accepted: result.created?.accepted || undefined
      };
      writeState(state);

      if (!verified && platform !== 'whatsapp') throw new Error(`${key} was created but could not yet be verified as published.`);
      console.log(`${key} ${state.records[key].status}.`);
    } catch (error) {
      failures.push({ platform, message: error.message, details: error.details || null });
      console.error(`${key} failed: ${error.message}`);
      if (error.details) console.error(JSON.stringify(error.details));
    }
  }

  if (failures.length) {
    const error = new Error(`${failures.length} CompTIA social publishing operation(s) failed.`);
    error.failures = failures;
    throw error;
  }
}

main().catch((error) => {
  console.error(error.message);
  if (error.failures) console.error(JSON.stringify(error.failures, null, 2));
  process.exit(1);
});
