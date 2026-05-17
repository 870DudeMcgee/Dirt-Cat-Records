const { sendJson } = require('../../lib/http/json');

module.exports = function publicConfigHandler(_req, res) {
  return sendJson(res, 200, {
    supabaseUrl: process.env.SUPABASE_URL,
    supabasePublicKey: process.env.SUPABASE_PUBLIC_KEY,
  });
};
