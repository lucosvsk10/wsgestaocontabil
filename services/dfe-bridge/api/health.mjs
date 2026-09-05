export default function handler(_req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.status(200).json({ ok: true, service: 'ws-dfe-bridge' });
}
