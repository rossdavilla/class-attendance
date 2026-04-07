export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { password } = req.body;
  if (password !== process.env.DASHBOARD_PASSWORD) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }

  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  process.env.ACTIVE_SESSION_CODE = code;

  return res.status(200).json({ code });
}
