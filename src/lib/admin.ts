import PocketBase from 'pocketbase';
import { PB_URL } from './pocketbase';

export const RMG_USERS_COLLECTION = 'rmg_users';

let instance: PocketBase | null = null;

/**
 * Client PocketBase partagé pour le portail admin de rotaract.mg.
 * Authentification = compte partagé des clubs (`rmg_users`), persistée
 * localement (localStorage du navigateur).
 * Utilisé uniquement côté client (scripts des pages `/admin/*`).
 */
export function getAdminPb(): PocketBase {
  if (!instance) instance = new PocketBase(PB_URL);
  return instance;
}

function redirectToLogin(): void {
  if (typeof window !== 'undefined') window.location.replace('/admin/login/');
}

/**
 * Vérifie la session du compte des clubs et retourne l'e-mail connecté.
 * Les anciennes sessions superuser sont invalidées (compte dédié désormais).
 * Redirige vers `/admin/login/` si la session est absente ou expirée.
 */
export async function ensureAdminSession(): Promise<string> {
  const pb = getAdminPb();
  const model = pb.authStore.model as { collectionName?: string } | null;
  if (!pb.authStore.isValid || model?.collectionName !== RMG_USERS_COLLECTION) {
    pb.authStore.clear();
    redirectToLogin();
    throw new Error('Non connecté');
  }
  try {
    const auth = (await pb.collection(RMG_USERS_COLLECTION).authRefresh()) as unknown as {
      record: { email: string };
    };
    return auth.record.email;
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
