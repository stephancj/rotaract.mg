export type Club = {
  name: string;
  city: string;
  area: string;
  meeting: string;
  email: string;
  website: string;
  websiteLabel: string;
  verifiedAt: string;
};

// Point unique à mettre à jour par les référents de club et la coordination nationale.
export const clubs: Club[] = [
  { name: 'Rotaract Ankoay', city: 'Antananarivo', area: 'Tsimbazaza', meeting: 'Samedi · 14h00', email: 'rtcankoay.secretariat@gmail.com', website: 'https://rotaractankoay.wixsite.com/district9220', websiteLabel: 'Site du club', verifiedAt: 'À confirmer' },
  { name: 'Rotaract Ankorondrano', city: 'Antananarivo', area: 'Tamboho Waterfront', meeting: 'Dimanche · 15h00', email: 'rotaract.ankorondrano@gmail.com', website: '', websiteLabel: '', verifiedAt: 'À confirmer' },
  { name: 'Rotaract Faneva', city: 'Antananarivo', area: 'Hôtel Restaurant Glacier', meeting: 'Samedi · 13h00', email: 'fanevarotaract@gmail.com', website: '', websiteLabel: '', verifiedAt: 'À confirmer' },
  { name: 'Rotaract Amontana', city: 'Antananarivo', area: 'Ampasanisadoda', meeting: '2e et 4e vendredi · 18h30', email: 'contact@rotaractamontana.org', website: 'https://www.rotaractamontana.org/', websiteLabel: 'Site du club', verifiedAt: 'À confirmer' },
  { name: 'Rotaract Athénée Antsirabe', city: 'Antsirabe', area: 'Hôtel Royal Palace', meeting: 'Samedi · 14h00', email: 'rotaract.athenee@gmail.com', website: 'https://rotaractathenee.wordpress.com/', websiteLabel: 'Site du club', verifiedAt: 'À confirmer' },
  { name: 'Rotaract Hina', city: 'Antananarivo', area: 'Ambondrona', meeting: 'Samedi · 13h30', email: '', website: 'https://rotaryclubtsimbaroa.org/rotaract-hina/', websiteLabel: 'Actualités du club', verifiedAt: 'À confirmer' },
  { name: 'Rotaract Iarivo', city: 'Antananarivo', area: 'Antananarivo', meeting: 'À confirmer', email: '', website: 'https://www.facebook.com/RTCIarivo', websiteLabel: 'Page Facebook', verifiedAt: 'À confirmer' },
  { name: 'Rotaract Iloivato', city: 'Antananarivo', area: 'Phô Lounge · Ampasamadinika', meeting: '2e et 4e samedi · 19h00', email: '', website: '', websiteLabel: '', verifiedAt: 'À confirmer' },
  { name: 'Rotaract Mahajanga-Bombacaceae', city: 'Mahajanga', area: 'Orlando Services · Majunga Be', meeting: 'Samedi · 18h30', email: '', website: '', websiteLabel: '', verifiedAt: 'À confirmer' },
  { name: 'Rotaract Tsinjo', city: 'Antananarivo', area: 'Madagascar Underground · Antsahavola', meeting: 'Samedi · 13h00', email: 'rctsinjo@gmail.com', website: '', websiteLabel: '', verifiedAt: 'À confirmer' },
];
