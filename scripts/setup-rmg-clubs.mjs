/**
 * Crée la collection `rmg_clubs` sur la même base PocketBase que
 * rtc-amontana-landing, avec le préfixe `rmg_` pour isoler les tables
 * du site national rotaract.mg.
 *
 * Idempotent + seed initial depuis les clubs connus.
 * Lancer avec :
 *   PB_URL="https://rtc-amontana.pockethost.io" PB_ADMIN_EMAIL="…" PB_ADMIN_PASSWORD="…" node scripts/setup-rmg-clubs.mjs
 */
import PocketBase from 'pocketbase';
import { RMG_URL, RMG_EDITOR_RULE, RMG_PUBLIC_OR_EDITOR_RULE, applyContentRules } from './rmg-common.mjs';

const URL = RMG_URL;
const EMAIL = process.env.PB_ADMIN_EMAIL;
const PASSWORD = process.env.PB_ADMIN_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error('PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD requis');
  process.exit(1);
}

const pb = new PocketBase(URL);
await pb.admins.authWithPassword(EMAIL, PASSWORD);

const SCHEMA = [
  { name: 'slug', type: 'text', required: true, options: { min: 1, max: 120, pattern: '^[a-z0-9-]+$' } },
  { name: 'name', type: 'text', required: true, options: { min: 1, max: 180 } },
  { name: 'city', type: 'text', required: false, options: { max: 120 } },
  { name: 'area', type: 'text', required: false, options: { max: 220 } },
  { name: 'meeting', type: 'text', required: false, options: { max: 220 } },
  { name: 'email', type: 'email', required: false },
  { name: 'phone', type: 'text', required: false, options: { max: 60 } },
  { name: 'website', type: 'url', required: false },
  { name: 'website_label', type: 'text', required: false, options: { max: 120 } },
  { name: 'facebook', type: 'url', required: false },
  { name: 'instagram', type: 'url', required: false },
  { name: 'description', type: 'text', required: false, options: { max: 5000 } },
  { name: 'president', type: 'text', required: false, options: { max: 180 } },
  { name: 'meeting_address', type: 'text', required: false, options: { max: 300 } },
  { name: 'verified_at', type: 'text', required: false, options: { max: 120 } },
  { name: 'active', type: 'bool', required: false },
];

// Tri A-Z uniquement : pas de colonne d'ordre manuel.
const DROPPED = new Set(['sort_order']);

const SEED = [
  { slug: 'rotaract-ankoay', name: 'Rotaract Ankoay', city: 'Antananarivo', area: 'Tsimbazaza', meeting: 'Samedi · 14h00', email: 'rtcankoay.secretariat@gmail.com', website: 'https://rotaractankoay.wixsite.com/district9220', website_label: 'Site du club', verified_at: 'À confirmer', active: true },
  { slug: 'rotaract-ankorondrano', name: 'Rotaract Ankorondrano', city: 'Antananarivo', area: 'Tamboho Waterfront', meeting: 'Dimanche · 15h00', email: 'rotaract.ankorondrano@gmail.com', verified_at: 'À confirmer', active: true },
  { slug: 'rotaract-faneva', name: 'Rotaract Faneva', city: 'Antananarivo', area: 'Hôtel Restaurant Glacier', meeting: 'Samedi · 13h00', email: 'fanevarotaract@gmail.com', verified_at: 'À confirmer', active: true },
  { slug: 'rotaract-amontana', name: 'Rotaract Amontana', city: 'Antananarivo', area: 'Ampasanisadoda', meeting: '2e et 4e vendredi · 18h30', email: 'contact@rotaractamontana.org', website: 'https://www.rotaractamontana.org/', website_label: 'Site du club', verified_at: 'À confirmer', active: true },
  { slug: 'rotaract-athenee-antsirabe', name: 'Rotaract Athénée Antsirabe', city: 'Antsirabe', area: 'Hôtel Royal Palace', meeting: 'Samedi · 14h00', email: 'rotaract.athenee@gmail.com', website: 'https://rotaractathenee.wordpress.com/', website_label: 'Site du club', verified_at: 'À confirmer', active: true },
  { slug: 'rotaract-hina', name: 'Rotaract Hina', city: 'Antananarivo', area: 'Ambondrona', meeting: 'Samedi · 13h30', website: 'https://rotaryclubtsimbaroa.org/rotaract-hina/', website_label: 'Actualités du club', verified_at: 'À confirmer', active: true },
  { slug: 'rotaract-iarivo', name: 'Rotaract Iarivo', city: 'Antananarivo', area: 'Antananarivo', meeting: 'À confirmer', website: 'https://www.facebook.com/RTCIarivo', website_label: 'Page Facebook', verified_at: 'À confirmer', active: true },
  { slug: 'rotaract-iloivato', name: 'Rotaract Iloivato', city: 'Antananarivo', area: 'Phô Lounge · Ampasamadinika', meeting: '2e et 4e samedi · 19h00', verified_at: 'À confirmer', active: true },
  { slug: 'rotaract-mahajanga-bombacaceae', name: 'Rotaract Mahajanga-Bombacaceae', city: 'Mahajanga', area: 'Orlando Services · Majunga Be', meeting: 'Samedi · 18h30', verified_at: 'À confirmer', active: true },
  { slug: 'rotaract-tsinjo', name: 'Rotaract Tsinjo', city: 'Antananarivo', area: 'Madagascar Underground · Antsahavola', meeting: 'Samedi · 13h00', email: 'rctsinjo@gmail.com', verified_at: 'À confirmer', active: true },
];

const PUBLIC_ACTIVE_RULE = RMG_PUBLIC_OR_EDITOR_RULE;
const WRITE_RULE = RMG_EDITOR_RULE;

let collection = await pb.collections.getOne('rmg_clubs').catch(() => null);

if (!collection) {
  collection = await pb.collections.create({
    name: 'rmg_clubs',
    type: 'base',
    schema: SCHEMA,
    indexes: ['CREATE UNIQUE INDEX idx_rmg_clubs_slug ON rmg_clubs (slug)'],
    // Lecture publique des clubs actifs ; écriture réservée au compte des clubs (`rmg_users`).
    listRule: PUBLIC_ACTIVE_RULE,
    viewRule: PUBLIC_ACTIVE_RULE,
    createRule: WRITE_RULE,
    updateRule: WRITE_RULE,
    deleteRule: WRITE_RULE,
  });
  console.log('✓ collection `rmg_clubs` créée (lecture publique active=true, écriture compte clubs)');
} else {
  const schema = Array.isArray(collection.schema) ? [...collection.schema] : [];
  const kept = schema.filter((f) => !DROPPED.has(f.name));
  const removed = schema.length - kept.length;
  const additions = SCHEMA.filter((field) => !kept.some((current) => current.name === field.name));
  const patch = {};
  if (removed || additions.length) patch.schema = [...kept, ...additions];
  // Harmonise les règles même si la collection existait déjà (sans écraser :
  // `applyContentRules` ne touche que ce qui diffère du standard).
  if (Object.keys(patch).length) {
    collection = await pb.collections.update(collection.id, patch);
    console.log(`✓ collection \`rmg_clubs\` mise à jour (retirés: ${removed}, ajoutés: ${additions.map((f) => f.name).join(', ') || '—'})`);
  }
  if (await applyContentRules(pb, 'rmg_clubs')) {
    console.log('✓ règles `rmg_clubs` alignées (écriture compte clubs)');
  } else if (!Object.keys(patch).length) {
    console.log('· collection `rmg_clubs` déjà à jour');
  }
}

// Seed : crée uniquement les slugs manquants, ne touche jamais aux lignes existantes.
const existing = await pb.collection('rmg_clubs').getFullList({ perPage: 200 }).catch(() => []);
const existingSlugs = new Set((existing || []).map((row) => row.slug));
let created = 0;
for (const row of SEED) {
  if (existingSlugs.has(row.slug)) continue;
  await pb.collection('rmg_clubs').create(row);
  created += 1;
}
console.log(created ? `✓ ${created} club(s) importé(s) dans \`rmg_clubs\`` : '· seed déjà complet');
console.log('Terminé.');
