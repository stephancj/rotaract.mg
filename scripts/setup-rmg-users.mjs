/**
 * Compte partagé des clubs pour le portail `/admin/` de rotaract.mg.
 *
 * Crée la collection d'auth `rmg_users` + le compte partagé, puis aligne
 * les règles des collections `rmg_*` : lecture publique des éléments actifs,
 * lecture/écriture complète pour le compte des clubs (drapeau
 * `rmg_access = true`, étanche aux autres collections d'auth de la base).
 *
 * Idempotent. Inclut un auto-test d'accès (CRUD + négatifs).
 * Lancer avec :
 *   PB_ADMIN_EMAIL="…" PB_ADMIN_PASSWORD="…" RMG_ACCOUNT_PASSWORD="…" node scripts/setup-rmg-users.mjs
 *   (RMG_ACCOUNT_EMAIL optionnel, défaut : admin@rotaract.mg)
 */
import PocketBase from 'pocketbase';
import { RMG_URL, applyContentRules } from './rmg-common.mjs';

const URL = RMG_URL;
const EMAIL = process.env.PB_ADMIN_EMAIL;
const PASSWORD = process.env.PB_ADMIN_PASSWORD;
const ACCOUNT_EMAIL = process.env.RMG_ACCOUNT_EMAIL || 'admin@rotaract.mg';
const ACCOUNT_PASSWORD = process.env.RMG_ACCOUNT_PASSWORD; // optionnel si le compte existe déjà
if (!EMAIL || !PASSWORD) {
  console.error('PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD requis');
  process.exit(1);
}

const pb = new PocketBase(URL);
await pb.admins.authWithPassword(EMAIL, PASSWORD);

const clubs = await pb.collections.getOne('rmg_clubs');

// 1. Collection d'auth dédiée (création de comptes réservée au superuser).
let users = await pb.collections.getOne('rmg_users').catch(() => null);
if (!users) {
  users = await pb.collections.create({
    name: 'rmg_users',
    type: 'auth',
    schema: [
      { name: 'name', type: 'text', required: false, options: { max: 180 } },
      { name: 'club', type: 'relation', required: false, options: { collectionId: clubs.id, cascadeDelete: false, maxSelect: 1, displayFields: ['name'] } },
      { name: 'rmg_access', type: 'bool', required: false },
    ],
    options: {
      allowEmailAuth: true,
      allowOAuth2Auth: false,
      allowUsernameAuth: false,
      exceptEmailDomains: null,
      onlyEmailDomains: null,
      minPasswordLength: 8,
      requireEmail: false,
      onlyVerified: false,
      manageRule: null,
    },
    // Listing et création réservés au superuser ; chacun ne voit/modifie que soi-même.
    listRule: null,
    viewRule: 'id = @request.auth.id && @request.auth.rmg_access = true',
    createRule: null,
    updateRule: 'id = @request.auth.id && @request.auth.rmg_access = true',
    deleteRule: null,
  });
  console.log('✓ collection `rmg_users` créée');
} else {
  console.log('· collection `rmg_users` déjà présente');
}

// 2. Compte partagé (créé ou remis à l'état souhaité).
const existing = await pb.collection('rmg_users').getFirstListItem(`email = "${ACCOUNT_EMAIL}"`).catch(() => null);
if (!existing && !ACCOUNT_PASSWORD) {
  console.error(`RMG_ACCOUNT_PASSWORD requis pour créer ${ACCOUNT_EMAIL}`);
  process.exit(1);
}
if (!existing) {
  await pb.collection('rmg_users').create({
    email: ACCOUNT_EMAIL,
    password: ACCOUNT_PASSWORD,
    passwordConfirm: ACCOUNT_PASSWORD,
    name: 'Coordination Rotaract Madagascar',
    rmg_access: true,
    verified: true,
    emailVisibility: false,
  });
  console.log(`✓ compte ${ACCOUNT_EMAIL} créé`);
} else {
  const patch = {
    name: existing.name || 'Coordination Rotaract Madagascar',
    rmg_access: true,
    verified: true,
  };
  if (ACCOUNT_PASSWORD) {
    patch.password = ACCOUNT_PASSWORD;
    patch.passwordConfirm = ACCOUNT_PASSWORD;
  }
  await pb.collection('rmg_users').update(existing.id, patch);
  console.log(`✓ compte ${ACCOUNT_EMAIL} mis à jour (${ACCOUNT_PASSWORD ? 'mot de passe + accès' : 'accès (mot de passe inchangé)'})`);
}

// 3. Règles des contenus.
for (const name of ['rmg_clubs', 'rmg_actions', 'rmg_events']) {
  if (await applyContentRules(pb, name)) console.log(`✓ règles \`${name}\` alignées (écriture compte clubs)`);
  else console.log(`· règles \`${name}\` déjà à jour`);
}

// 4. Auto-test d'accès (uniquement si le mot de passe est fourni).
const failures = [];
if (!ACCOUNT_PASSWORD) {
  console.log('· auto-test ignoré (RMG_ACCOUNT_PASSWORD absent)');
} else {
const ok = (label, cond) => {
  console.log(`${cond ? '✓' : '✗'} test: ${label}`);
  if (!cond) failures.push(label);
};

const userPb = new PocketBase(URL);
try {
  await userPb.collection('rmg_users').authWithPassword(ACCOUNT_EMAIL, ACCOUNT_PASSWORD);
  ok('connexion compte clubs', true);
} catch (e) {
  ok('connexion compte clubs', false);
}

// CRUD complet avec le compte des clubs (brouillon invisible du public).
let tmpId = null;
try {
  const tmp = await userPb.collection('rmg_events').create({
    title: '__test accès (supprimé automatiquement)__', description: 'test', active: false,
  });
  tmpId = tmp.id;
  ok('création (compte clubs)', true);
  await userPb.collection('rmg_events').update(tmpId, { description: 'test2' });
  ok('modification (compte clubs)', true);
  await userPb.collection('rmg_events').getOne(tmpId);
  ok('lecture brouillon (compte clubs)', true);
} catch (e) {
  ok('CRUD compte clubs', false);
}

// Le public ne doit pas voir le brouillon.
try {
  const pub = await fetch(`${URL}/api/collections/rmg_events/records?filter=${encodeURIComponent(`id="${tmpId}"`)}`).then((r) => r.json());
  ok('brouillon invisible du public', pub.totalItems === 0);
} catch (e) {
  ok('brouillon invisible du public', false);
}

// Le public ne peut pas écrire.
try {
  const res = await fetch(`${URL}/api/collections/rmg_events/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '__tentative non autorisée__', active: false }),
  });
  ok('création publique refusée', !res.ok);
} catch (e) {
  ok('création publique refusée', false);
}

// Nettoyage du brouillon de test.
if (tmpId) {
  try {
    await userPb.collection('rmg_events').delete(tmpId);
    ok('suppression (compte clubs)', true);
  } catch (e) {
    ok('suppression (compte clubs)', false);
  }
}

if (failures.length) {
  console.error(`ÉCHEC (${failures.length}) : ${failures.join(' ; ')}`);
  process.exit(1);
}
console.log('Terminé : compte opérationnel.');
} // fin auto-test (si RMG_ACCOUNT_PASSWORD fourni)
