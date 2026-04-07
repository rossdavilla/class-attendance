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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, code, latitude, longitude } = req.body;

  if (!name || !code || latitude == null || longitude == null) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    const sheet = await getSheet();

    // Get active code from Google Sheet
    const configRes = await sheet.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: 'Config!B1',
    });

    const activeCode = configRes.data.values?.[0]?.[0] || '';
    if (!activeCode || code.toUpperCase() !== activeCode.toUpperCase()) {
      return res.status(400).json({ error: 'Invalid or expired session code. Please check with your instructor.' });
    }

    const classLat = parseFloat(process.env.CLASS_LAT || '0');
    const classLng = parseFloat(process.env.CLASS_LNG || '0');
    const classRadius = parseFloat(process.env.CLASS_RADIUS || '50');

    let distance = null;
    let status = 'NO_LOCATION_SET';

    if (classLat !== 0 && classLng !== 0) {
      distance = haversineDistance(latitude, longitude, classLat, classLng);
      status = distance <= classRadius ? 'PRESENT' : 'FLAGGED';
    }

    const timestamp = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });

    await sheet.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: 'Sheet1!A:G',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[timestamp, name, code.toUpperCase(), latitude, longitude, distance !== null ? Math.round(distance) : 'N/A', status]],
      },
    });

    return res.status(200).json({
      message: status === 'PRESENT'
        ? 'Check-in successful! You are marked as present.'
        : status === 'FLAGGED'
        ? `You're checked in, but you are ${Math.round(distance).toLocaleString()} meters away from the correct location. If you are present in class, please show this message to your professor.`
        : 'Check-in recorded.',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not save your check-in. Please try again.' });
  }
}
