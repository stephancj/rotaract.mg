export type Club = {
  slug: string;
  name: string;
  city: string;
  area: string;
  meeting: string;
  email: string;
  phone?: string;
  website: string;
  websiteLabel: string;
  facebook?: string;
  instagram?: string;
  description?: string;
  president?: string;
  meeting_address?: string;
  verifiedAt: string;
};

export function slugifyClubName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Point unique à mettre à jour par les référents de club et la coordination nationale.
// Source de secours locale : la source primaire est la collection PocketBase `rmg_clubs`
// (même base que rtc-amontana-landing, préfixe `rmg_`). Voir `src/lib/pocketbase.ts`.
export const clubs: Club[] = [
  { slug: 'rotaract-ankoay', name: 'Rotaract Ankoay', city: 'Antananarivo', area: 'Tsimbazaza', meeting: 'Samedi · 14h00', email: 'rtcankoay.secretariat@gmail.com', website: 'https://rotaractankoay.wixsite.com/district9220', websiteLabel: 'Site du club', verifiedAt: 'À confirmer' },
  { slug: 'rotaract-ankorondrano', name: 'Rotaract Ankorondrano', city: 'Antananarivo', area: 'Tamboho Waterfront', meeting: 'Dimanche · 15h00', email: 'rotaract.ankorondrano@gmail.com', website: '', websiteLabel: '', verifiedAt: 'À confirmer' },
  { slug: 'rotaract-faneva', name: 'Rotaract Faneva', city: 'Antananarivo', area: 'Hôtel Restaurant Glacier', meeting: 'Samedi · 13h00', email: 'fanevarotaract@gmail.com', website: '', websiteLabel: '', verifiedAt: 'À confirmer' },
  { slug: 'rotaract-amontana', name: 'Rotaract Amontana', city: 'Antananarivo', area: 'Ampasanisadoda', meeting: '2e et 4e vendredi · 18h30', email: 'contact@rotaractamontana.org', website: 'https://www.rotaractamontana.org/', websiteLabel: 'Site du club', verifiedAt: 'À confirmer' },
  { slug: 'rotaract-athenee-antsirabe', name: 'Rotaract Athénée Antsirabe', city: 'Antsirabe', area: 'Hôtel Royal Palace', meeting: 'Samedi · 14h00', email: 'rotaract.athenee@gmail.com', website: 'https://rotaractathenee.wordpress.com/', websiteLabel: 'Site du club', verifiedAt: 'À confirmer' },
  { slug: 'rotaract-hina', name: 'Rotaract Hina', city: 'Antananarivo', area: 'Ambondrona', meeting: 'Samedi · 13h30', email: '', website: 'https://rotaryclubtsimbaroa.org/rotaract-hina/', websiteLabel: 'Actualités du club', verifiedAt: 'À confirmer' },
  { slug: 'rotaract-iarivo', name: 'Rotaract Iarivo', city: 'Antananarivo', area: 'Antananarivo', meeting: 'À confirmer', email: '', website: 'https://www.facebook.com/RTCIarivo', websiteLabel: 'Page Facebook', verifiedAt: 'À confirmer' },
  { slug: 'rotaract-iloivato', name: 'Rotaract Iloivato', city: 'Antananarivo', area: 'Phô Lounge · Ampasamadinika', meeting: '2e et 4e samedi · 19h00', email: '', website: '', websiteLabel: '', verifiedAt: 'À confirmer' },
  { slug: 'rotaract-mahajanga-bombacaceae', name: 'Rotaract Mahajanga-Bombacaceae', city: 'Mahajanga', area: 'Orlando Services · Majunga Be', meeting: 'Samedi · 18h30', email: '', website: '', websiteLabel: '', verifiedAt: 'À confirmer' },
  { slug: 'rotaract-tsinjo', name: 'Rotaract Tsinjo', city: 'Antananarivo', area: 'Madagascar Underground · Antsahavola', meeting: 'Samedi · 13h00', email: 'rctsinjo@gmail.com', website: '', websiteLabel: '', verifiedAt: 'À confirmer' },
];
