#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import calendar from './content-calendar.mjs';

const root = path.resolve(process.cwd(), 'automation/comptia');
const output = path.join(root, 'content-calendar.json');

function materialize(template, item) {
  return String(template)
    .replaceAll('{{headline}}', item.headline)
    .replaceAll('{{proof}}', item.proof)
    .replaceAll('{{cta}}', item.cta)
    .replaceAll('{{whatsapp_short}}', item.whatsapp_short);
}

const built = {
  campaign: calendar.campaign,
  days: calendar.days.map((item) => ({
    ...item,
    copy: Object.fromEntries(
      Object.entries(calendar.templates).map(([platform, template]) => [platform, materialize(template, item)])
    )
  }))
};

fs.writeFileSync(output, `${JSON.stringify(built, null, 2)}\n`, 'utf8');
console.log(`Built ${built.days.length}-day CompTIA content calendar at ${output}.`);
