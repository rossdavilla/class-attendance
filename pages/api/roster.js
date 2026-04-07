import { getSheet } from '../../lib/sheets';

export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) return res.status(400).json({ error: 'No session code provided.' });

  try {
    const sheet = await getSheet();

    const configRes = await sheet.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: 'Config!B1:C1',
    });

    const activeCode = configRes.data.values?.[0]?.[0] || '';
    const activeClass = configRes.data.values?.[0]?.[1] || '';

    if (!activeCode || code.toUpperCase() !== activeCode.toUpperCase()) {
      return res.status(400).json({ error: 'Invalid or expired session code.' });
    }

    const classColumns = { PSY157: 'A', PSY170: 'B', PSY175: 'C' };
    const col = classColumns[activeClass];

    if (!col) return res.status(400).json({ error: 'No roster found for this class.' });

    const rosterRes = await sheet.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: `Rosters!${col}2:${col}200`,
    });

    const names = (rosterRes.data.values || [])
      .map((row) => row[0])
      .filter(Boolean)
      .sort();

    return res.status(200).json({ names, activeClass });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load roster.' });
  }
}
