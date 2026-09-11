/**
 * Aligne `rmg_clubs` sur la liste statique `src/data/clubs.ts` (qui fait foi).
 * - slug manquant → créé (actif, ordre en fin de liste)
 * - slug présent → champs mis à jour si différents (`active` existant
 *   préservé : la visibilité se gère dans `/admin/`)
 * - signale les slugs en base absents du statique (orphelins, non supprimés)
 *
 * Lancer avec :
 *   PB_ADMIN_EMAIL="…" PB_ADMIN_PASSWORD="…" node scripts/sync-rmg-clubs.mjs
 */
import PocketBase from 'pocketbase';
import { RMG_URL } from './rmg-common.mjs';
import { clubs as staticClubs } from '../src/data/clubs.ts';

const EMAIL = process.env.PB_ADMIN_EMAIL;
const PASSWORD = process.env.PB_ADMIN_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error('PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD requis');
  process.exit(1);
}

const pb = new PocketBase(RMG_URL);
await pb.admins.authWithPassword(EMAIL, PASSWORD);

// Clé PB (snake_case) -> clé statique (camelCase)
const FIELDS = [
  ['name', 'name'], ['city', 'city'], ['area', 'area'], ['meeting', 'meeting'],
  ['email', 'email'], ['phone', 'phone'], ['website', 'website'],
  ['website_label', 'websiteLabel'], ['facebook', 'facebook'], ['instagram', 'instagram'],
  ['description', 'description'], ['president', 'president'],
  ['meeting_address', 'meeting_address'], ['verified_at', 'verifiedAt'],
];
const norm = (v) => String(v ?? '');

const rows = await pb.collection('rmg_clubs').getFullList({ perPage: 200 }).catch(() => []);
const bySlug = new Map((rows || []).map((r) => [r.slug, r]));
const staticSlugs = new Set(staticClubs.map((c) => c.slug));

let created = 0, updated = 0, unchanged = 0;
for (const club of staticClubs) {
  const payload = {};
  for (const [pbKey, tsKey] of FIELDS) payload[pbKey] = norm(club[tsKey]);
  const existing = bySlug.get(club.slug);
  if (!existing) {
    await pb.collection('rmg_clubs').create({ slug: club.slug, ...payload, active: true });
    console.log(`+ créé : ${club.slug}`);
    created += 1;
    continue;
  }
  const patch = {};
  for (const [pbKey] of FIELDS) {
    if (norm(existing[pbKey]) !== payload[pbKey]) patch[pbKey] = payload[pbKey];
  }
  if (Object.keys(patch).length) {
    await pb.collection('rmg_clubs').update(existing.id, patch);
    console.log(`~ mis à jour : ${club.slug} (${Object.keys(patch).join(', ')})`);
    updated += 1;
  } else {
    unchanged += 1;
  }
}

const orphans = (rows || []).map((r) => r.slug).filter((s) => !staticSlugs.has(s));
if (orphans.length) console.log(`! orphelins en base (conservés) : ${orphans.join(', ')}`);
console.log(`Terminé : ${created} créé(s), ${updated} mis à jour, ${unchanged} déjà à jour, sur ${staticClubs.length} clubs statiques.`);
