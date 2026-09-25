import { Resend } from "resend";

// Instancie a l'appel (pas au chargement du module) : si RESEND_API_KEY manque,
// l'erreur remonte dans le try/catch de register() au lieu de crasher le serveur au boot.
export async function sendConfirmationEmail(toEmail, confirmUrl) {
  const resend = new Resend(process.env.RESEND_API_KEY);

  return resend.emails.send({
    from: "onboarding@resend.dev",
    to: toEmail,
    subject: "Confirme ton compte Dashboard",
    html: `<p>Clique pour confirmer ton compte :</p><p><a href="${confirmUrl}">${confirmUrl}</a></p>`,
  });
}
