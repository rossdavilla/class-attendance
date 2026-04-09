import { getSheet } from '../../lib/sheets';

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isPastCutoff(cutoffTime) {
  if (!cutoffTime) return false;
  const now = new Date();
  const pacificTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const [hours, minutes] = cutoffTime.split(':').map(Number);
  const cutoff = new Date(pacificTime);
  cutoff.setHours(hours, minutes, 0, 0);
  return pacificTime > cutoff;
}

async function getSheetWithRetry(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await getSheet();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, code, latitude, longitude } = req.body;

  if (!name || !code || latitude == null || longitude == null) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    const sheet = await getSheetWithRetry();

    const configRes = await sheet.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: 'Config!B1:G1',
    });

    const row = configRes.data.values?.[0] || [];
    const activeCode   = row[0] || '';
    const activeClass  = row[1] || '';
    const cutoffTime   = row[2] || '';
    const classLat     = parseFloat(row[3] || '0');
    const classLng     = parseFloat(row[4] || '0');
    const classRadius  = parseFloat(row[5] || '80');

    if (!activeCode || code.toUpperCase() !== activeCode.toUpperCase()) {
      return res.status(400).json({ error: 'Invalid or expired session code. Please check with your instructor.' });
    }

    const classSheets = {
      PSY157: 'PSY157-Attendance',
      PSY170: 'PSY170-Attendance',
      PSY175: 'PSY175-Attendance',
    };
    const targetSheet = classSheets[activeClass] || 'Sheet1';

    let distance = null;
    let locationVerified = false;

    if (classLat !== 0 && classLng !== 0) {
      distance = haversineDistance(latitude, longitude, classLat, classLng);
      locationVerified = distance <= classRadius;
    }

    const late = isPastCutoff(cutoffTime);

    let status;
    if (!locationVerified && late && (classLat !== 0 && classLng !== 0)) {
      status = 'LOCATION UNVERIFIED & LATE';
    } else if (!locationVerified && (classLat !== 0 && classLng !== 0)) {
      status = 'LOCATION UNVERIFIED';
    } else if (late) {
      status = 'LATE';
    } else {
      status = 'PRESENT';
    }

    const timestamp = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });

    await sheet.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: `${targetSheet}!A:G`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[timestamp, name, code.toUpperCase(), latitude, longitude, distance !== null ? Math.round(distance) : 'N/A', status]],
      },
    });

    const messages = {
      'PRESENT': 'Your attendance has been recorded successfully.',
      'LATE': 'Your attendance has been submitted too late for this class session.',
      'LOCATION UNVERIFIED': 'Your location could not be verified. Please see your instructor.',
      'LOCATION UNVERIFIED & LATE': 'Your location could not be verified. Please see your instructor. Your attendance has also been submitted too late for this class session.',
    };

    return res.status(200).json({ message: messages[status] });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not save your check-in. Please try again.' });
  }
}
