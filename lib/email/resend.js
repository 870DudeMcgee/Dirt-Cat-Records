const RESEND_EMAILS_URL = 'https://api.resend.com/emails';

function getResendConfig(env = process.env) {
  const config = {
    apiKey: env.RESEND_API_KEY,
    from: env.RESEND_FROM_EMAIL,
    replyTo: env.RESEND_REPLY_TO_EMAIL || env.ADMIN_EMAIL,
  };
  if (!config.apiKey || !config.from || !config.replyTo) throw new Error('Resend is not configured.');
  return config;
}

async function sendStudioEmail(message, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const config = getResendConfig(options.env || process.env);
  const email = buildEmail(message.emailType, message.data || {});
  const response = await fetchImpl(RESEND_EMAILS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.from,
      to: [message.to],
      reply_to: config.replyTo,
      subject: email.subject,
      text: email.text,
    }),
  });
  const body = await readJson(response);
  if (!response.ok) throw new Error(`Resend email failed: ${body.message || response.status}`);
  return body;
}

function buildEmail(type, data) {
  const templates = {
    free_review_received: {
      subject: 'Your free mix review is started',
      text: `Thanks${nameSuffix(data.customerName)}. Use your portal link to send files and check status:\n\n${data.portalUrl}`,
    },
    upload_instructions: {
      subject: 'Send your project files to Dirt Cat Records',
      text: `Use this Drive upload folder when possible:\n\n${data.uploadFolderUrl || 'Upload folder coming soon.'}\n\nYou can also submit Dropbox, Google Drive, or WeTransfer links from your portal:\n\n${data.portalUrl}`,
    },
    quote_sent: {
      subject: 'Your Dirt Cat Records quote is ready',
      text: `Your custom quote is ready here:\n\n${data.quoteUrl}\n\nQuote total: ${data.totalLabel}`,
    },
    payment_received: {
      subject: 'Payment received',
      text: `Payment received. Your project portal is here:\n\n${data.portalUrl}`,
    },
    files_received: {
      subject: 'Project files received',
      text: 'Your files/links were received. Josh will review them and update your project status.',
    },
    finals_ready_balance_due: {
      subject: 'Your finals are ready - balance due',
      text: `Your finals are ready. Please pay the remaining balance to unlock delivery:\n\n${data.balanceUrl}`,
    },
    final_delivery_unlocked: {
      subject: 'Your final files are ready',
      text: `Your final files are ready here:\n\n${data.finalDeliveryUrl}\n\nYou can approve or request your included revision from the portal:\n\n${data.portalUrl}`,
    },
    admin_notification: {
      subject: data.subject || 'Dirt Cat Records needs attention',
      text: data.text || 'Open the admin dashboard for details.',
    },
  };
  const email = templates[type];
  if (!email) throw new Error(`Unknown email type: ${type}`);
  return email;
}

function nameSuffix(name) {
  return name ? `, ${name}` : '';
}

async function readJson(response) {
  try {
    return await response.json();
  } catch (_error) {
    return {};
  }
}

module.exports = {
  buildEmail,
  getResendConfig,
  sendStudioEmail,
};
