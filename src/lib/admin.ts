import PocketBase from 'pocketbase';
import { PB_URL } from './pocketbase';

export const RMG_USERS_COLLECTION = 'rmg_users';

let instance: PocketBase | null = null;

/**
 * Client PocketBase partagé pour le portail admin de rotaract.mg.
 * Authentification = compte du club (`rmg_users`, un par club + un national),
 * persistée localement (localStorage du navigateur).
 * Utilisé uniquement côté client (scripts des pages `/admin/*`).
 */
export function getAdminPb(): PocketBase {
  if (!instance) {
    instance = new PocketBase(PB_URL);
    // Désactive l'annulation auto du SDK : le tableau de bord charge
    // plusieurs listes en parallèle, parfois vers la même collection
    // (ex : clubs + sélecteur des formulaires) — sinon la seconde
    // requête annule la première (erreur statut 0).
    instance.autoCancellation(false);
  }
  return instance;
}

function redirectToLogin(): void {
  if (typeof window !== 'undefined') window.location.replace('/admin/login/');
}

export type AdminSession = {
  id: string;
  email: string;
  name: string;
  /** Id du club rattaché, ou '' pour la coordination nationale (accès complet). */
  clubId: string;
  clubName: string;
  isNational: boolean;
};

/**
 * Vérifie la session du compte et retourne son périmètre.
 * - national (`club` vide) : gère tous les clubs, actions et événements.
 * - admin de club (`club` = id) : ne gère que sa fiche club et les
 *   actions/événements qui mentionnent son club (seul ou en multi-clubs).
 * Redirige vers `/admin/login/` si la session est absente ou expirée.
 */
export async function ensureAdminSession(): Promise<AdminSession> {
  const pb = getAdminPb();
  const model = pb.authStore.model as { collectionName?: string } | null;
  if (!pb.authStore.isValid || model?.collectionName !== RMG_USERS_COLLECTION) {
    pb.authStore.clear();
    redirectToLogin();
    throw new Error('Non connecté');
  }
  try {
    const auth = (await pb
      .collection(RMG_USERS_COLLECTION)
      .authRefresh({ expand: 'club' })) as unknown as {
      record: { id: string; email: string; name?: string; club?: string; expand?: { club?: { id?: string; name?: string } } };
    };
    const expanded = auth.record.expand?.club;
    const clubId = String(auth.record.club ?? expanded?.id ?? '');
    const clubName = String(expanded?.name ?? '');
    return { id: auth.record.id, email: auth.record.email, name: String(auth.record.name ?? ''), clubId, clubName, isNational: !clubId };
  } catch {
    pb.authStore.clear();
    redirectToLogin();
    throw new Error('Session expirée');
  }
}

/** Déconnexion + retour vers la page de connexion. */
export function adminLogout(): void {
  getAdminPb().authStore.clear();
  redirectToLogin();
}
