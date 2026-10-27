/**
 * Cloudflare Pages Function — /api/contact
 *
 * Reçoit les messages du formulaire de contact et les envoie
 * par email via l'API Resend.
 *
 * Variables d'environnement requises (à configurer dans Cloudflare Dashboard) :
 *   - RESEND_API_KEY : Clé API Resend (https://resend.com)
 *   - CONTACT_EMAIL  : Adresse email de destination (ex: contact@cgt-sema.fr)
 *   - FROM_EMAIL     : Adresse email d'envoi vérifiée dans Resend (ex: noreply@cgt-sema.fr)
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS headers
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    const body = await request.json();
    const { name, email, message } = body;

    // Validation
    if (!message || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Le message est requis." }),
        { status: 400, headers }
      );
    }

    if (message.trim().length > 5000) {
      return new Response(
        JSON.stringify({ error: "Le message est trop long (max 5000 caractères)." }),
        { status: 400, headers }
      );
    }

    // Build email content
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #E2001A; padding: 24px 32px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 20px;">Nouveau message — CGT-SEMA</h1>
        </div>
        <div style="background: #1a1a1a; padding: 32px; border-radius: 0 0 8px 8px; color: #e0e0e0;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 8px 0; color: #888; width: 80px;">Nom</td>
              <td style="padding: 8px 0; color: #f0f0f0;">${name || "Non renseigné"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #888;">Email</td>
              <td style="padding: 8px 0; color: #f0f0f0;">${email || "Non renseigné"}</td>
            </tr>
          </table>
          <div style="background: #252525; border-left: 3px solid #E2001A; padding: 20px; border-radius: 4px;">
            <p style="margin: 0; white-space: pre-wrap; line-height: 1.7; color: #e0e0e0;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
          </div>
          <p style="margin-top: 24px; font-size: 12px; color: #666;">
            Ce message a été envoyé depuis le formulaire de contact du site CGT-SEMA.
          </p>
        </div>
      </div>
    `;

    // Send via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.FROM_EMAIL || "CGT-SEMA <noreply@cgt-sema.fr>",
        to: [env.CONTACT_EMAIL || "contact@cgt-sema.fr"],
        subject: `[CGT-SEMA] Nouveau message${name ? ` de ${name}` : ""}`,
        html: emailHtml,
        reply_to: email || undefined,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      console.error("Resend error:", JSON.stringify(errorData));
      return new Response(
        JSON.stringify({ error: "Erreur lors de l'envoi du message. Veuillez réessayer." }),
        { status: 500, headers }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Message envoyé avec succès." }),
      { status: 200, headers }
    );
  } catch (err) {
    console.error("Contact function error:", err);
    return new Response(
      JSON.stringify({ error: "Une erreur inattendue est survenue." }),
      { status: 500, headers }
    );
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
