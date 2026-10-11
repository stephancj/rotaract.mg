/**
 * Un compte admin par club pour le portail `/admin/` de rotaract.mg.
 *
 * Pour chaque club de `rmg_clubs`, crée (ou remet à l'état souhaité) un
 * compte dans `rmg_users` avec :
 * - e-mail : `<slug>@rotaract.mg` (ex : `rotaract-ankoay@rotaract.mg`),
 *   sauf surcharge via `RMG_CLUB_EMAILS_JSON` (`{ "<slug>": "<email>" }`).
 * - `club` = le club respectif (relation simple), `rmg_access = true`.
 *
 * Ce compte ne modifie que son club (fiche) et publie des actions /
 * événements qui l'incluent (seul = propre au club, plusieurs = multi-clubs).
 * Le compte national (sans club, voir `setup-rmg-users.mjs`) garde l'accès
 * complet, dont les contenus interclubs (sans club).
 *
 * Idempotent : les comptes existants sont conservés (mot de passe inchangé),
 * sauf si un mot de passe est fourni ET `RESET_CLUB_PASSWORDS=1`.
 * Inclut un auto-test de cloisonnement (un club ne touche pas au voisin).
 *
 * Lancer avec :
 *   PB_ADMIN_EMAIL="…" PB_ADMIN_PASSWORD="…" \
 *   RMG_CLUB_PASSWORD="mot-de-passe-commun-initial" \
 *   node scripts/setup-rmg-club-admins.mjs
 * Options :
 *   RMG_CLUB_PASSWORD="…"        mot de passe initial commun (sinon généré
 *                                par club et affiché — à transmettre aux clubs).
 *   RMG_CLUB_EMAILS_JSON='{}'    surcharges d'e-mails par slug.
 *   RESET_CLUB_PASSWORDS=1       réinitialise aussi les comptes existants.
 */
import PocketBase from 'pocketbase';
import { randomBytes } from 'node:crypto';
import { RMG_URL, applyScopedRules } from './rmg-common.mjs';

const EMAIL = process.env.PB_ADMIN_EMAIL;
const PASSWORD = process.env.PB_ADMIN_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error('PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD requis');
  process.exit(1);
}

const COMMON_PASSWORD = process.env.RMG_CLUB_PASSWORD || '';
const RESET = process.env.RESET_CLUB_PASSWORDS === '1';
let emailOverrides = {};
if (process.env.RMG_CLUB_EMAILS_JSON) {
  try {
    emailOverrides = JSON.parse(process.env.RMG_CLUB_EMAILS_JSON);
  } catch {
    console.error('RMG_CLUB_EMAILS_JSON invalide (JSON attendu)');
    process.exit(1);
  }
}
if (COMMON_PASSWORD && COMMON_PASSWORD.length < 8) {
  console.error('RMG_CLUB_PASSWORD doit faire au moins 8 caractères');
  process.exit(1);
}

const genPassword = () => randomBytes(12).toString('base64url');

const pb = new PocketBase(RMG_URL);
await pb.admins.authWithPassword(EMAIL, PASSWORD);

// S'assure que la collection `rmg_users` porte bien le rattachement au club.
const clubsCol = await pb.collections.getOne('rmg_clubs');
const usersCol = await pb.collections.getOne('rmg_users');
const schema = Array.isArray(usersCol.schema) ? [...usersCol.schema] : [];
let clubField = schema.find((f) => f.name === 'club');
if (!clubField) {
  schema.push({
    name: 'club',
    type: 'relation',
    required: false,
    options: { collectionId: clubsCol.id, cascadeDelete: false, maxSelect: 1, displayFields: ['name'] },
  });
  await pb.collections.update(usersCol.id, { schema });
  console.log('✓ champ `club` ajouté à `rmg_users`');
} else if (clubField.options?.collectionId !== clubsCol.id || clubField.options?.maxSelect !== 1) {
  clubField.options = { ...(clubField.options || {}), collectionId: clubsCol.id, maxSelect: 1, displayFields: ['name'] };
  await pb.collections.update(usersCol.id, { schema });
  console.log('✓ champ `club` de `rmg_users` réparé (relation simple vers `rmg_clubs`)');
}

const clubs = await pb.collection('rmg_clubs').getFullList({ perPage: 200, sort: 'name' });
if (!clubs.length) {
  console.error('Aucun club dans `rmg_clubs` — lancez d’abord setup-rmg-clubs.mjs');
  process.exit(1);
}

const credentials = [];
let created = 0, kept = 0, reset = 0;
for (const club of clubs) {
  const loginEmail = emailOverrides[club.slug] || `${club.slug}@rotaract.mg`;
  const existing = await pb.collection('rmg_users').getFirstListItem(`email = "${loginEmail}"`).catch(() => null);
  if (!existing) {
    const password = COMMON_PASSWORD || genPassword();
    await pb.collection('rmg_users').create({
      email: loginEmail,
      password,
      passwordConfirm: password,
      name: club.name,
      club: club.id,
      rmg_access: true,
      verified: true,
      emailVisibility: false,
    });
    created += 1;
    credentials.push({ club: club.name, slug: club.slug, email: loginEmail, password });
  } else {
    const patch = { name: existing.name || club.name, club: club.id, rmg_access: true, verified: true };
    let newPassword = '';
    if (COMMON_PASSWORD && (RESET || !existing.club || existing.club !== club.id)) {
      newPassword = COMMON_PASSWORD;
      patch.password = newPassword;
      patch.passwordConfirm = newPassword;
      reset += 1;
    } else {
      kept += 1;
    }
    await pb.collection('rmg_users').update(existing.id, patch);
    if (newPassword) credentials.push({ club: club.name, slug: club.slug, email: loginEmail, password: newPassword });
  }
}
console.log(`✓ admins par club : ${created} créé(s), ${reset} réinitialisé(s), ${kept} conservé(s) sur ${clubs.length} club(s)`);

// Aligne les règles scopées (le cloisonnement vit dans les règles).
if (await applyScopedRules(pb)) console.log('✓ règles `rmg_*` alignées (national + admins par club)');
else console.log('· règles `rmg_*` déjà à jour');

// Affiche les identifiants à transmettre (uniquement les mots de passe connus :
// créations et réinitialisations — jamais les mots de passe conservés).
if (credentials.length) {
  console.log('\nIdentifiants à transmettre aux clubs (e-mail / mot de passe) :');
  for (const c of credentials) console.log(`- ${c.club} : ${c.email} / ${c.password}`);
  if (!COMMON_PASSWORD) console.log('(mots de passe générés aléatoirement — notez-les, ils ne sont pas récupérables)');
} else {
  console.log('· aucun mot de passe à transmettre (comptes déjà existants conservés)');
}

// Auto-test de cloisonnement avec le premier club (CRUD propre + négatifs voisins).
const failures = [];
const ok = (label, cond) => {
  console.log(`${cond ? '✓' : '✗'} test: ${label}`);
  if (!cond) failures.push(label);
};
const [first, second] = clubs;
const firstCred = credentials.find((c) => c.slug === first.slug);
if (firstCred && second) {
  const clubPb = new PocketBase(RMG_URL);
  try {
    await clubPb.collection('rmg_users').authWithPassword(firstCred.email, firstCred.password);
    ok('connexion admin club', true);
  } catch {
    ok('connexion admin club', false);
  }
  // Fiche : son club oui, le voisin non.
  try {
    await clubPb.collection('rmg_clubs').update(first.id, { verified_at: first.verified_at || 'À confirmer' });
    ok('modification de son club', true);
  } catch {
    ok('modification de son club', false);
  }
  try {
    await clubPb.collection('rmg_clubs').update(second.id, { verified_at: 'test-cloisonnement' });
    ok('modification du club voisin refusée', false);
  } catch {
    ok('modification du club voisin refusée', true);
  }
  // Action propre au club oui, action du voisin seul non.
  let tmpId = null;
  try {
    const tmp = await clubPb.collection('rmg_actions').create({
      title: '__test cloisonnement (supprimé automatiquement)__',
      description: 'test',
      club: [first.id],
      active: false,
    });
    tmpId = tmp.id;
    ok('création action de son club', true);
  } catch {
    ok('création action de son club', false);
  }
  try {
    await clubPb.collection('rmg_actions').create({
      title: '__tentative voisin (refusée)__',
      description: 'test',
      club: [second.id],
      active: false,
    });
    ok('création action du voisin seul refusée', false);
  } catch {
    ok('création action du voisin seul refusée', true);
  }
  if (tmpId) {
    try {
      await clubPb.collection('rmg_actions').delete(tmpId);
      ok('suppression de sa propre action', true);
    } catch {
      ok('suppression de sa propre action', false);
    }
  }
} else {
  console.log('· auto-test ignoré (mot de passe du premier club inconnu — compte conservé)');
}

if (failures.length) {
  console.error(`ÉCHEC (${failures.length}) : ${failures.join(' ; ')}`);
  process.exit(1);
}
console.log('Terminé : un admin par club, cloisonné.');
