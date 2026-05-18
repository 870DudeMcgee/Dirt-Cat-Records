# Dirt-Cat-Records
Website

## Checkout Development

The checkout flow uses static pages plus Vercel Functions.

Required Vercel environment variables:

- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_ENV` set to `sandbox` or `live`
- `PAYPAL_WEBHOOK_ID`

Safety caveat: `PAYPAL_CLIENT_SECRET` must never be committed, exposed to browser/static JavaScript, or stored in client-visible environment variables. Keep it only in server-side Vercel environment variables.

Local checks:

```bash
npm test
npm run check:js
```

Local Vercel runtime:

```bash
npx vercel dev
```

Do not wrap `vercel dev` inside the `dev` npm script. Vercel treats a `dev` script as the project development command, which causes a recursive startup loop if that script also runs `vercel dev`.
