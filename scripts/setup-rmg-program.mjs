/**
 * Collections `rmg_actions` et `rmg_events` (même base PocketBase que
 * rtc-amontana-landing, préfixe `rmg_` pour le site national rotaract.mg).
 *
 * Ces collections portent les actions et événements publiés PAR LES CLUBS
 * (champ `club` optionnel : vide = interclubs / action commune).
 * Elles alimentent la section « Prochainement & dernières activités »
 * de la page d'accueil. Les encadrés « phares » de la page d'accueil,
 * eux, restent statiques (voir `src/data/program.ts`).
 *
 * Idempotent, sans seed (les clubs créent leur contenu via `/admin/`).
 * Lancer avec :
 *   PB_URL="https://rtc-amontana.pockethost.io" PB_ADMIN_EMAIL="…" PB_ADMIN_PASSWORD="…" node scripts/setup-rmg-program.mjs
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

const clubs = await pb.collections.getOne('rmg_clubs');
const CLUBS_ID = clubs.id;

const PUBLIC_ACTIVE_RULE = RMG_PUBLIC_OR_EDITOR_RULE;
const WRITE_RULE = RMG_EDITOR_RULE;

// Champs retirés de l'ancien modèle « phares » (ordre/vedette gérés par date).
const DROPPED = new Set(['featured', 'sort_order']);

const CLUB_FIELD = {
  name: 'club',
  type: 'relation',
  required: false,
  options: { collectionId: CLUBS_ID, cascadeDelete: false, maxSelect: 1, displayFields: ['name'] },
};
const DATE_FIELD = { name: 'date', type: 'date', required: false, options: { min: '', max: '' } };
const LIEU_FIELD = { name: 'lieu', type: 'text', required: false, options: { max: 220 } };

const ACTIONS_WANTED = [
  { name: 'title', type: 'text', required: true, options: { min: 1, max: 180 } },
  { name: 'description', type: 'text', required: false, options: { max: 2000 } },
  { name: 'category', type: 'text', required: false, options: { max: 180 } },
  { name: 'meta', type: 'text', required: false, options: { max: 180 } },
  { name: 'href', type: 'text', required: false, options: { max: 500 } },
  { name: 'image', type: 'text', required: false, options: { max: 500 } },
  { name: 'image_alt', type: 'text', required: false, options: { max: 220 } },
  CLUB_FIELD,
  DATE_FIELD,
  LIEU_FIELD,
  { name: 'active', type: 'bool', required: false },
];

const EVENTS_WANTED = [
  { name: 'title', type: 'text', required: true, options: { min: 1, max: 180 } },
  { name: 'description', type: 'text', required: false, options: { max: 2000 } },
  { name: 'cadence', type: 'text', required: false, options: { max: 120 } },
  { name: 'scope', type: 'text', required: false, options: { max: 180 } },
  { name: 'href', type: 'text', required: false, options: { max: 500 } },
  CLUB_FIELD,
  DATE_FIELD,
  LIEU_FIELD,
  { name: 'active', type: 'bool', required: false },
];

async function ensureCollection(name, wanted) {
  let collection = await pb.collections.getOne(name).catch(() => null);
  if (!collection) {
    await pb.collections.create({
      name,
      type: 'base',
      schema: wanted,
      // Lecture publique des éléments actifs ; écriture réservée au compte des clubs (`rmg_users`).
      listRule: PUBLIC_ACTIVE_RULE,
      viewRule: PUBLIC_ACTIVE_RULE,
      createRule: WRITE_RULE,
      updateRule: WRITE_RULE,
      deleteRule: WRITE_RULE,
    });
    console.log(`✓ collection \`${name}\` créée (lecture publique active=true, écriture compte clubs)`);
    return;
  }
  const schema = Array.isArray(collection.schema) ? [...collection.schema] : [];
  const kept = schema.filter((f) => !DROPPED.has(f.name));
  const removed = schema.length - kept.length;
  const additions = wanted.filter((f) => !kept.some((c) => c.name === f.name));
  // Maintient le pointeur de relation vers rmg_clubs même si l'id a changé.
  const rel = kept.find((f) => f.name === 'club');
  let relFixed = false;
  if (rel && rel.options?.collectionId !== CLUBS_ID) {
    rel.options = { ...(rel.options || {}), collectionId: CLUBS_ID };
    relFixed = true;
  }
  const patch = {};
  if (removed || additions.length || relFixed) patch.schema = [...kept, ...additions];
  if (Object.keys(patch).length) {
    await pb.collections.update(collection.id, patch);
    console.log(`✓ collection \`${name}\` mise à jour (retirés: ${removed}, ajoutés: ${additions.map((f) => f.name).join(', ') || '—'})`);
  }
  // Aligne les règles sur le standard (sans écraser autre chose).
  if (await applyContentRules(pb, name)) {
    console.log(`✓ règles \`${name}\` alignées (écriture compte clubs)`);
  } else if (!Object.keys(patch).length) {
    console.log(`· collection \`${name}\` déjà à jour`);
  }
}

// Nettoyage chirurgical des lignes du seed initial « phares » (doublons du
// contenu statique) : uniquement les titres exacts du seed, sans club ni date.
// Ne touche jamais au contenu créé par les clubs via /admin/.
const LEGACY_TITLES = new Set([
  'Tolo-Tagnana', 'Agir contre la polio', 'RYLA', 'Reboisement', 'World Cleanup Day',
  'Conférence Rotaract du District', 'Rencontres interclubs', 'Semaine mondiale du Rotaract', 'Urban Trail',
]);

async function cleanupLegacySeeds(name) {
  const rows = await pb.collection(name).getFullList({ perPage: 200 }).catch(() => []);
  let deleted = 0;
  for (const row of rows || []) {
    if (LEGACY_TITLES.has(row.title) && !row.club && !row.date) {
      await pb.collection(name).delete(row.id);
      deleted += 1;
    }
  }
  console.log(deleted ? `✓ ${deleted} ligne(s) du seed initial retirée(s) de \`${name}\`` : `· rien à nettoyer dans \`${name}\``);
}

await ensureCollection('rmg_actions', ACTIONS_WANTED);
await ensureCollection('rmg_events', EVENTS_WANTED);
await cleanupLegacySeeds('rmg_actions');
await cleanupLegacySeeds('rmg_events');
console.log('Terminé.');
