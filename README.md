# Dirt-Cat-Records
Website

## Checkout Development

The checkout flow uses static pages plus Vercel Functions.

Required Vercel environment variables:

- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_ENV` set to `sandbox` or `live`

Local checks:

```bash
npm test
npm run check:js
```

Local Vercel runtime:

```bash
npm run dev
```
