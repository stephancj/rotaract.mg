/**
 * Active l'envoi d'e-mails du PocketBase partagé via Brevo (SMTP) et pointe
 * le template de réinitialisation vers la page universelle
 * `https://rotaract.mg/admin/nouveau-mot-de-passe/` (qui accepte les jetons
 * `rmg_users`, `users` et superusers — voir `src/pages/admin/nouveau-mot-de-passe.astro`).
 *
 * ⚠️ Base partagée avec rtc-amontana-landing : le SMTP, l'expéditeur et le
 * template de reset sont GLOBAUX. La page de reset universelle couvre les
 * trois cas, donc le changement reste compatible avec Amontana.
 *
 * Idempotent (réapplicable sans risque).
 * Lancer avec :
 *   PB_ADMIN_EMAIL="…" PB_ADMIN_PASSWORD="…" \
 *   BREVO_SMTP_USER="…" BREVO_SMTP_KEY="…" \
 *   RMG_SENDER_EMAIL="…" [RMG_SENDER_NAME="…"] \
 *   node scripts/setup-rmg-mail.mjs
 * Variables :
 *   BREVO_SMTP_USER / BREVO_SMTP_KEY  identifiants SMTP Brevo
 *     (https://app.brevo.com/settings/keys/api-keys → clé SMTP ;
 *      login = l'e-mail du compte Brevo). Requis.
 *   RMG_SENDER_EMAIL  adresse d'expédition (doit être un expéditeur validé
 *     dans Brevo : https://app.brevo.com/senders). Requis.
 *   RMG_SENDER_NAME   nom d'expédition (défaut : « Rotaract Madagascar »).
 *   RMG_RESET_ACTION_URL  URL du template (défaut : page universelle rotaract.mg).
 */
import PocketBase from 'pocketbase';
import { RMG_URL } from './rmg-common.mjs';

const EMAIL = process.env.PB_ADMIN_EMAIL;
const PASSWORD = process.env.PB_ADMIN_PASSWORD;
const SMTP_USER = process.env.BREVO_SMTP_USER;
const SMTP_KEY = process.env.BREVO_SMTP_KEY;
const SENDER_EMAIL = process.env.RMG_SENDER_EMAIL;
const SENDER_NAME = process.env.RMG_SENDER_NAME || 'Rotaract Madagascar';
const RESET_ACTION_URL =
  process.env.RMG_RESET_ACTION_URL || 'https://rotaract.mg/admin/nouveau-mot-de-passe/?token={TOKEN}';

if (!EMAIL || !PASSWORD) {
  console.error('PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD requis');
  process.exit(1);
}
if (!SMTP_USER || !SMTP_KEY || !SENDER_EMAIL) {
  console.error('BREVO_SMTP_USER / BREVO_SMTP_KEY / RMG_SENDER_EMAIL requis');
  console.error('(clé SMTP : https://app.brevo.com/settings/keys/api-keys ; expéditeurs : https://app.brevo.com/senders)');
  process.exit(1);
}

const RESET_SUBJECT = 'Réinitialisez votre mot de passe ({APP_NAME})';
const RESET_BODY = `<p>Bonjour,</p>
<p>Vous avez demandé à réinitialiser votre mot de passe.</p>
<p>
  <a class="btn" href="{ACTION_URL}" target="_blank" rel="noopener">Choisir un nouveau mot de passe</a>
</p>
<p><i>Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</i></p>
<p>
  Merci,<br/>
  L'équipe {APP_NAME}
</p>`;

const pb = new PocketBase(RMG_URL);
await pb.admins.authWithPassword(EMAIL, PASSWORD);

const before = await pb.settings.getAll();
console.log(`· SMTP avant : enabled=${before.smtp?.enabled} host=${before.smtp?.host}`);
console.log(`· expéditeur avant : ${before.meta?.senderName} <${before.meta?.senderAddress}>`);
console.log(`· template reset avant : ${before.meta?.resetPasswordTemplate?.actionUrl}`);

await pb.settings.update({
  smtp: {
    enabled: true,
    host: 'smtp-relay.brevo.com',
    port: 587,
    username: SMTP_USER,
    password: SMTP_KEY,
    authMethod: 'PLAIN',
    tls: false, // port 587 = STARTTLS négocié (tls:true = SMTPS direct, port 465)
    localName: '',
  },
  meta: {
    senderName: SENDER_NAME,
    senderAddress: SENDER_EMAIL,
    resetPasswordTemplate: {
      subject: RESET_SUBJECT,
      body: RESET_BODY,
      actionUrl: RESET_ACTION_URL,
    },
  },
});

const after = await pb.settings.getAll();
const failures = [];
const ok = (label, cond) => {
  console.log(`${cond ? '✓' : '✗'} ${label}`);
  if (!cond) failures.push(label);
};
ok('SMTP activé (smtp-relay.brevo.com:587)', after.smtp?.enabled === true && after.smtp?.host === 'smtp-relay.brevo.com');
ok(`expéditeur = ${SENDER_NAME} <${SENDER_EMAIL}>`, after.meta?.senderAddress === SENDER_EMAIL);
ok(`template reset → ${RESET_ACTION_URL}`, after.meta?.resetPasswordTemplate?.actionUrl === RESET_ACTION_URL);

if (failures.length) {
  console.error(`ÉCHEC (${failures.length}) : ${failures.join(' ; ')}`);
  process.exit(1);
}
console.log('Terminé : envoi via Brevo actif. Testez avec « Mot de passe oublié ? » sur /admin/login/.');
