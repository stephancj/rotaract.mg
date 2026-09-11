export type CollectiveAction = {
  category: string;
  title: string;
  description: string;
  meta: string;
  href: string;
  image?: string;
  imageAlt?: string;
  featured?: boolean;
};

export type NetworkEvent = {
  cadence: string;
  title: string;
  scope: string;
  description: string;
  href: string;
};

// Contenu statique des encadrés « phares » de la page d'accueil.
// Volontairement en dur : les actions et événements PUBLIÉS PAR LES CLUBS
// vivent dans PocketBase (`rmg_actions`, `rmg_events`) et alimentent la
// section « Prochainement & dernières activités ». Voir `src/lib/pocketbase.ts`.
export const fallbackActions: CollectiveAction[] = [
  { category: 'Santé · Programme interclubs', title: 'Tolo-Tagnana', description: 'Une chaîne humaine mobilisée pour rendre des interventions chirurgicales accessibles gratuitement.', meta: '991 patients accompagnés', href: '/tolotagnana/', image: '/tolotagnana/bloc-operatoire.jpg', imageAlt: 'Équipe médicale et bénévoles pendant une mission Tolo-Tagnana', featured: true },
  { category: 'Santé · End Polio Now', title: 'Agir contre la polio', description: 'Vaccination, sensibilisation des familles et Urban Trail réunissent les clubs autour d’un même objectif : en finir avec la poliomyélite.', meta: 'Vaccination · Urban Trail', href: 'https://www.endpolio.org/fr' },
  { category: 'Leadership · District 9220', title: 'RYLA', description: 'Un séminaire commun pour renforcer le leadership, transmettre des compétences et créer des liens entre jeunes engagés du District.', meta: 'Rendez-vous annuel', href: 'https://gouverneurdistrict9220.org/' },
  { category: 'Environnement · Interclubs', title: 'Reboisement', description: 'Des journées communes pour planter des arbres, restaurer les paysages et sensibiliser les communautés à la protection de leur environnement.', meta: 'Mobilisation sur le terrain', href: 'https://www.rotaractamontana.org/actions' },
  { category: 'Environnement · Interclubs', title: 'World Cleanup Day', description: 'Des Rotaractiens réunis au Rova d’Ilafy pour agir ensemble en faveur de leur environnement.', meta: 'Amontana · Tsinjo', href: 'https://www.rotaractamontana.org/actions' },
];

export const fallbackEvents: NetworkEvent[] = [
  { cadence: 'Chaque année', title: 'RYLA', scope: 'District 9220', description: 'Le séminaire de leadership qui réunit de jeunes participants autour de la formation, de l’engagement et du réseau.', href: '' },
  { cadence: 'Chaque année', title: 'Urban Trail', scope: 'Madagascar · End Polio Now', description: 'Une marche sportive et solidaire qui rassemble les clubs et le public pour soutenir l’éradication de la poliomyélite.', href: 'https://newsmada.com/2026/06/08/urban-trail-8e-edition-deux-mille-foulees-pour-vaincre-la-poliomyelite/' },
  { cadence: 'Chaque année', title: 'Conférence Rotaract du District', scope: 'District 9220', description: 'Le grand rassemblement des clubs pour partager leur année, se former et vivre un temps fort de camaraderie.', href: '' },
  { cadence: 'Plusieurs fois par an', title: 'Rencontres interclubs', scope: 'Madagascar', description: 'Des formations, échanges et moments de camaraderie organisés ensemble par plusieurs clubs de la Grande Île.', href: '' },
  { cadence: 'Chaque année · Mars', title: 'Semaine mondiale du Rotaract', scope: 'Réseau international', description: 'Une semaine pour célébrer le mouvement, faire connaître ses projets et renforcer les liens entre Rotaract et Rotary.', href: '' },
];
