/**
 * Règles d'accès partagées pour les tables `rmg_*` du site rotaract.mg.
 *
 * Modèle : un compte par club dans `rmg_users` (+ un compte de coordination
 * nationale sans club).
 * - `rmg_access = true` : droit d'édition (étanche aux autres collections
 *   d'auth de la base — ex : `users` d'Amontana, qui n'a pas ce champ →
 *   `null = true` → refusé, fail-closed). Non connecté → refusé également.
 * - `club` vide (= null / "") → coordination nationale : accès complet.
 * - `club` = <id> → admin du club : ne modifie que son club et les
 *   actions/événements qui le mentionnent (seul ou en multi-clubs).
 *   Chaque publication d'un club inclut obligatoirement son propre club ;
 *   les contenus « vides » (interclubs, sans club) sont réservés au national.
 */

export const RMG_URL = (process.env.PB_URL || 'https://rtc-amontana.pockethost.io').replace(/\/$/, '');

export const RMG_USERS_COLLECTION = 'rmg_users';

// Écriture + lecture des brouillons : uniquement les comptes des clubs.
export const RMG_EDITOR_RULE = '@request.auth.rmg_access = true';
// Coordination nationale = compte d'édition SANS club rattaché.
export const RMG_NATIONAL_RULE =
  '@request.auth.rmg_access = true && (@request.auth.club = null || @request.auth.club = "")';
// Lecture publique : éléments actifs pour tous, tout pour les comptes d'édition.
export const RMG_PUBLIC_OR_EDITOR_RULE = `active = true || ${RMG_EDITOR_RULE}`;

// Clubs : seul le national crée/supprime ; chacun ne modifie que son club.
export const RMG_CLUB_CREATE_DELETE_RULE = RMG_NATIONAL_RULE;
export const RMG_CLUB_UPDATE_RULE =
  `${RMG_EDITOR_RULE} && ((${RMG_NATIONAL_RULE}) || @request.auth.club = id)`;

// Actions / événements : création = national, ou club qui s'inclut lui-même
// (propre au club ou multi-clubs). Modification/suppression = national, ou
// club déjà mentionné (avant ou après modification, pour les co-organisations).
// NB : PocketBase n'a pas d'opérateur `IN` dans les règles ; le test
// d'appartenance à une relation multiple se fait avec `~` (« contains »,
// vérifié sûr : les ids sont des chaînes uniques de 15 caractères).
export const RMG_ACTIVITY_CREATE_RULE =
  `${RMG_EDITOR_RULE} && ((${RMG_NATIONAL_RULE}) || @request.data.club ~ @request.auth.club)`;
export const RMG_ACTIVITY_UPDATE_DELETE_RULE =
  `${RMG_EDITOR_RULE} && ((${RMG_NATIONAL_RULE}) || club ~ @request.auth.club || @request.data.club ~ @request.auth.club)`;

/** Applique le jeu de règles standard à une collection de contenu `rmg_*`. Retourne true si mise à jour. */
export async function applyContentRules(pb, name) {
  const col = await pb.collections.getOne(name);
  const patch = {};
  if (col.listRule !== RMG_PUBLIC_OR_EDITOR_RULE) patch.listRule = RMG_PUBLIC_OR_EDITOR_RULE;
  if (col.viewRule !== RMG_PUBLIC_OR_EDITOR_RULE) patch.viewRule = RMG_PUBLIC_OR_EDITOR_RULE;
  if (col.createRule !== RMG_EDITOR_RULE) patch.createRule = RMG_EDITOR_RULE;
  if (col.updateRule !== RMG_EDITOR_RULE) patch.updateRule = RMG_EDITOR_RULE;
  if (col.deleteRule !== RMG_EDITOR_RULE) patch.deleteRule = RMG_EDITOR_RULE;
  if (Object.keys(patch).length) {
    await pb.collections.update(col.id, patch);
    return true;
  }
  return false;
}

/**
 * Applique le jeu de règles scopées par club :
 * - `rmg_clubs` : lecture publique des actifs, création/suppression au
 *   national, modification au national ou au club lui-même.
 * - `rmg_actions` / `rmg_events` : lecture publique des actifs, création si
 *   le club s'inclut (ou national), modification/suppression si mentionné
 *   (ou national).
 * Retourne true si au moins une collection a été mise à jour.
 */
export async function applyScopedRules(pb) {
  const wanted = {
    rmg_clubs: {
      listRule: RMG_PUBLIC_OR_EDITOR_RULE,
      viewRule: RMG_PUBLIC_OR_EDITOR_RULE,
      createRule: RMG_CLUB_CREATE_DELETE_RULE,
      updateRule: RMG_CLUB_UPDATE_RULE,
      deleteRule: RMG_CLUB_CREATE_DELETE_RULE,
    },
    rmg_actions: {
      listRule: RMG_PUBLIC_OR_EDITOR_RULE,
      viewRule: RMG_PUBLIC_OR_EDITOR_RULE,
      createRule: RMG_ACTIVITY_CREATE_RULE,
      updateRule: RMG_ACTIVITY_UPDATE_DELETE_RULE,
      deleteRule: RMG_ACTIVITY_UPDATE_DELETE_RULE,
    },
    rmg_events: {
      listRule: RMG_PUBLIC_OR_EDITOR_RULE,
      viewRule: RMG_PUBLIC_OR_EDITOR_RULE,
      createRule: RMG_ACTIVITY_CREATE_RULE,
      updateRule: RMG_ACTIVITY_UPDATE_DELETE_RULE,
      deleteRule: RMG_ACTIVITY_UPDATE_DELETE_RULE,
    },
  };
  let changed = false;
  for (const [name, rules] of Object.entries(wanted)) {
    const col = await pb.collections.getOne(name);
    const patch = {};
    for (const [key, value] of Object.entries(rules)) {
      if (col[key] !== value) patch[key] = value;
    }
    if (Object.keys(patch).length) {
      await pb.collections.update(col.id, patch);
      changed = true;
    }
  }
  return changed;
}
