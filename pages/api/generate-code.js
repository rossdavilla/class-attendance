import { getSheet } from '../../lib/sheets';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { password, activeClass } = req.body;
  if (password !== process.env.DASHBOARD_PASSWORD) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }

  if (!activeClass) {
    return res.status(400).json({ error: 'Please select a class before generating a code.' });
  }

  const code = String(Math.floor(Math.random() * 10000)).padStart(4, '0');

  try {
    const sheet = await getSheet();
    await sheet.spreadsheets.values.update({
      spreadsheetId: process.env.SHEET_ID,
      range: 'Config!B1:C1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[code, activeClass]] },
    });
    return res.status(200).json({ code });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not save session code.' });
  }
}
