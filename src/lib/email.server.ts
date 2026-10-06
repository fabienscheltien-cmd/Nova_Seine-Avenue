// Envoi d'e-mails transactionnels via l'API Resend (https://resend.com).
// Configuration (secrets serveur, jamais dans le code) :
//   RESEND_API_KEY — clé API Resend
//   EMAIL_FROM     — expéditeur vérifié, ex. "NOVA Serenity <no-reply@nova-serenity.fr>"
// Sans configuration, aucun e-mail n'est envoyé et l'interface propose d'écrire depuis la messagerie.

export function isEmailConfigured(): boolean {
  return !!process.env["RESEND_API_KEY"] && !!process.env["EMAIL_FROM"];
}

type Email = { to?: string[]; bcc?: string[]; subject: string; text: string; replyTo?: string | null };

const MAX_RECIPIENTS = 49;

/** Envoie un e-mail ; les longues listes en copie cachée sont découpées par lots. Renvoie le nombre de destinataires servis. */
export async function sendEmail(email: Email): Promise<number> {
  if (!isEmailConfigured()) return 0;
  const bccBatches: string[][] = [];
  const bcc = [...new Set(email.bcc ?? [])].filter(Boolean);
  for (let i = 0; i < bcc.length; i += MAX_RECIPIENTS) bccBatches.push(bcc.slice(i, i + MAX_RECIPIENTS));
  if (!bccBatches.length) bccBatches.push([]);

  let served = 0;
  for (const batch of bccBatches) {
    const to = email.to?.length ? email.to : [process.env["EMAIL_FROM"]!];
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env["RESEND_API_KEY"]}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env["EMAIL_FROM"],
        to,
        ...(batch.length ? { bcc: batch } : {}),
        subject: email.subject,
        text: email.text,
        ...(email.replyTo ? { reply_to: email.replyTo } : {}),
      }),
    });
    if (!res.ok) throw new Error(`Envoi de l'e-mail impossible (${res.status})`);
    served += (email.to?.length ?? 0) + batch.length;
  }
  return served;
}
