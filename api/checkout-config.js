function handler(req, res) {
  setJsonHeaders(res);

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.PAYPAL_CLIENT_ID) {
    return res.status(500).json({ error: 'PayPal checkout is not configured' });
  }

  return res.status(200).json({
    paypalClientId: process.env.PAYPAL_CLIENT_ID,
    currency: 'USD',
  });
}

function setJsonHeaders(res) {
  if (typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', 'application/json');
  }
}

module.exports = handler;
