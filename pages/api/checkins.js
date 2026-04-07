import { getSheet } from '../../lib/sheets';

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default async function handler(req, res) {
  const { code, password, lat, lng, radius } = req.query;

  if (password !== process.env.DASHBOARD_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const sheet = await getSheet();
    const response = await sheet.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: 'Sheet1!A:G',
    });

    const rows = response.data.values || [];
    const dataRows = rows.slice(1);

    const classLat = parseFloat(lat || '0');
    const classLng = parseFloat(lng || '0');
    const classRadius = parseFloat(radius || '50');

    const filtered = dataRows
      .filter((row) => row[2] && row[2].toUpperCase() === code.toUpperCase())
      .map((row) => {
        const studentLat = parseFloat(row[3]);
        const studentLng = parseFloat(row[4]);
        let distance = null;
        let status = row[6] || 'UNKNOWN';

        if (classLat !== 0 && classLng !== 0 && !isNaN(studentLat) && !isNaN(studentLng)) {
          distance = haversineDistance(studentLat, studentLng, classLat, classLng);
          status = distance <= classRadius ? 'PRESENT' : 'FLAGGED';
        }

        return {
          timestamp: row[0],
          name: row[1],
          distance,
          status,
        };
      });

    return res.status(200).json({ checkins: filtered });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load check-ins.' });
  }
}
