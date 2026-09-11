/**
 * Règles d'accès partagées pour les tables `rmg_*` du site rotaract.mg.
 *
 * Modèle : un compte dédié `rmg_users` (ex : admin@rotaract.mg, partagé par
 * les clubs) porte le drapeau `rmg_access = true`. Les règles testent CE
 * drapeau — et non un champ générique comme `role` — pour rester étanches
 * aux autres collections d'auth de la même base (ex : `users` d'Amontana,
 * qui n'a pas ce champ → `null = true` → refusé, fail-closed).
 * Non connecté → `null = true` → refusé également.
 */

export const RMG_URL = (process.env.PB_URL || 'https://rtc-amontana.pockethost.io').replace(/\/$/, '');

export const RMG_USERS_COLLECTION = 'rmg_users';

// Écriture + lecture des brouillons : uniquement le compte des clubs.
export const RMG_EDITOR_RULE = '@request.auth.rmg_access = true';
// Lecture publique : éléments actifs pour tous, tout pour le compte des clubs.
export const RMG_PUBLIC_OR_EDITOR_RULE = `active = true || ${RMG_EDITOR_RULE}`;

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
