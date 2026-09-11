import { clubs as fallbackClubs, type Club } from '../data/clubs';

// Même PocketBase que rtc-amontana-landing, avec préfixe `rmg_` pour
// isoler les tables du site national rotaract.mg.
// Ex : `rmg_clubs` au lieu de `clubs`.
export const PB_URL =
  import.meta.env.PUBLIC_PB_URL?.replace(/\/$/, '') ||
  'https://rtc-amontana.pockethost.io';

export const RMG_CLUBS_COLLECTION = 'rmg_clubs';
export const RMG_ACTIONS_COLLECTION = 'rmg_actions';
export const RMG_EVENTS_COLLECTION = 'rmg_events';

type PbListResponse<T> = {
  items: T[];
  totalItems: number;
};

export type PbClubRecord = Record<string, unknown> & {
  id: string;
  slug: string;
  name: string;
  city?: string;
  area?: string;
  meeting?: string;
  email?: string;
  phone?: string;
  website?: string;
  websiteLabel?: string;
  facebook?: string;
  instagram?: string;
  description?: string;
  president?: string;
  meeting_address?: string;
  active?: boolean;
  verifiedAt?: string;
  verified_at?: string;
};

/** Tri alphabétique français (utilisé partout, y compris en repli local). */
export function sortClubsAz<T extends { name: string }>(clubs: T[]): T[] {
  return [...clubs].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

/** Normalise un enregistrement PocketBase vers le type `Club` utilisé par les pages. */
export function normalizePbClub(record: PbClubRecord): Club {
  return {
    slug: record.slug,
    name: String(record.name ?? ''),
    city: String(record.city ?? ''),
    area: String(record.area ?? ''),
    meeting: String(record.meeting ?? 'À confirmer'),
    email: String(record.email ?? ''),
    phone: String(record.phone ?? ''),
    website: String(record.website ?? ''),
    websiteLabel: String(record.websiteLabel ?? record.website_label ?? ''),
    facebook: String(record.facebook ?? ''),
    instagram: String(record.instagram ?? ''),
    description: String(record.description ?? ''),
    president: String(record.president ?? ''),
    meeting_address: String(record.meeting_address ?? ''),
    verifiedAt: String(record.verifiedAt ?? record.verified_at ?? 'À confirmer'),
  };
}

async function fetchWithTimeout(url: string, ms = 6000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Liste dynamique des clubs depuis PocketBase (`rmg_clubs`).
 * Fallback automatique sur `src/data/clubs.ts` si la base est
 * injoignable (build offline, collection pas encore créée…).
 */
export async function getClubs(): Promise<Club[]> {
  try {
    const params = new URLSearchParams({
      perPage: '200',
      sort: 'name',
      // Seuls les clubs actifs sont exposés publiquement.
      filter: 'active = true',
    });
    const res = await fetchWithTimeout(
      `${PB_URL}/api/collections/${RMG_CLUBS_COLLECTION}/records?${params}`
    );
    if (!res.ok) throw new Error(`PocketBase: ${res.status}`);
    const body = (await res.json()) as PbListResponse<PbClubRecord>;
    if (!Array.isArray(body.items) || body.items.length === 0) return sortClubsAz(fallbackClubs);
    return sortClubsAz(body.items.map(normalizePbClub));
  } catch {
    return sortClubsAz(fallbackClubs);
  }
}

/** Détail d'un club par son slug. Retourne `null` si introuvable. */
export async function getClubBySlug(slug: string): Promise<Club | null> {
  const decoded = decodeURIComponent(slug);
  try {
    const filter = `slug = "${decoded.replace(/"/g, '')}" && active = true`;
    const params = new URLSearchParams({ perPage: '1', filter });
    const res = await fetchWithTimeout(
      `${PB_URL}/api/collections/${RMG_CLUBS_COLLECTION}/records?${params}`
    );
    if (!res.ok) throw new Error(`PocketBase: ${res.status}`);
    const body = (await res.json()) as PbListResponse<PbClubRecord>;
    if (body.items?.length) return normalizePbClub(body.items[0]);
  } catch {
    // Fallback local ci-dessous.
  }
  return fallbackClubs.find((c) => c.slug === decoded) ?? null;
}

export type ClubActivity = {
  id: string;
  kind: 'action' | 'event';
  title: string;
  description: string;
  /** Date ISO (AAAA-MM-JJ) ou '' si à confirmer. */
  date: string;
  lieu: string;
  href: string;
  image: string;
  imageAlt: string;
  /** Nom du club, ou '' pour une activité interclubs / commune. */
  clubName: string;
  /** Tous les clubs concernés (vide = interclubs). */
  clubNames: string[];
  clubSlug: string;
};

type PbActivityRecord = Record<string, unknown> & {
  id: string;
  title?: string;
  description?: string;
  date?: string;
  lieu?: string;
  href?: string;
  image?: string;
  image_alt?: string;
  expand?: { club?: { name?: string; slug?: string } | Array<{ name?: string; slug?: string }> };
};

function normalizeActivity(kind: ClubActivity['kind']) {
  return (record: PbActivityRecord): ClubActivity => {
    const expanded = record.expand?.club;
    const clubs = (Array.isArray(expanded) ? expanded : expanded ? [expanded] : [])
      .map((c) => ({ name: String(c?.name ?? ''), slug: String(c?.slug ?? '') }))
      .filter((c) => c.name);
    const names = clubs.map((c) => c.name);
    return {
      id: String(record.id),
      kind,
      title: String(record.title ?? ''),
      description: String(record.description ?? ''),
      date: String(record.date ?? '').slice(0, 10),
      lieu: String(record.lieu ?? ''),
      href: String(record.href ?? ''),
      image: String(record.image ?? ''),
      imageAlt: String(record.image_alt ?? ''),
      clubNames: names,
      clubName: names.join(' · '),
      clubSlug: clubs[0]?.slug ?? '',
    };
  };
}

async function getActivityRecords(
  collection: string,
  kind: ClubActivity['kind']
): Promise<ClubActivity[]> {
  try {
    const params = new URLSearchParams({
      perPage: '100',
      filter: 'active = true',
      expand: 'club',
    });
    const res = await fetchWithTimeout(
      `${PB_URL}/api/collections/${collection}/records?${params}`
    );
    if (!res.ok) throw new Error(`PocketBase: ${res.status}`);
    const body = (await res.json()) as PbListResponse<PbActivityRecord>;
    if (!Array.isArray(body.items)) return [];
    return body.items.map(normalizeActivity(kind));
  } catch {
    return [];
  }
}

const byDateAsc = (a: ClubActivity, b: ClubActivity) => {
  if (!a.date) return 1;
  if (!b.date) return -1;
  return a.date.localeCompare(b.date);
};

const byDateDesc = (a: ClubActivity, b: ClubActivity) => {
  if (!a.date) return 1;
  if (!b.date) return -1;
  return b.date.localeCompare(a.date);
};

/**
 * Événements des clubs à venir (date >= aujourd'hui, non datés en dernier).
 * Vide si aucun contenu publié — la section affiche alors un état vide.
 */
export async function getUpcomingEvents(limit = 4): Promise<ClubActivity[]> {
  const today = new Date().toISOString().slice(0, 10);
  const events = await getActivityRecords(RMG_EVENTS_COLLECTION, 'event');
  return events
    .filter((e) => !e.date || e.date >= today)
    .sort(byDateAsc)
    .slice(0, limit);
}

/**
 * Dernières activités : actions des clubs (récentes d'abord) + événements
 * déjà passés. Vide si aucun contenu publié.
 */
export async function getLatestActivities(limit = 6): Promise<ClubActivity[]> {
  const today = new Date().toISOString().slice(0, 10);
  const [actions, events] = await Promise.all([
    getActivityRecords(RMG_ACTIONS_COLLECTION, 'action'),
    getActivityRecords(RMG_EVENTS_COLLECTION, 'event'),
  ]);
  const pastEvents = events.filter((e) => e.date && e.date < today);
  return [...actions, ...pastEvents].sort(byDateDesc).slice(0, limit);
}
