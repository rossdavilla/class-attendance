import { useState, useEffect, useCallback } from 'react';

const LOCATIONS = [
  { name: 'Select a classroom...', lat: '', lng: '' },
  { name: 'KL (Kolligian Library)', lat: '37.3662058749318', lng: '-120.42472753429566' },
  { name: 'COB2', lat: '37.36716946259973', lng: '-120.4246523673314' },
  { name: 'SSB (Social Sciences Building)', lat: '37.36768958791874', lng: '-120.42259253749232' },
];

const CLASSES = ['Select a class...', 'PSY157', 'PSY170', 'PSY175'];

export default function Dashboard() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [sessionCode, setSessionCode] = useState('');
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [classLat, setClassLat] = useState('');
  const [classLng, setClassLng] = useState('');
  const [radius, setRadius] = useState('80');
  const [selectedLocation, setSelectedLocation] = useState(0);
  const [selectedClass, setSelectedClass] = useState(0);
  const [cutoffTime, setCutoffTime] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);

  const handleLocationSelect = (index) => {
    setSelectedLocation(index);
    setClassLat(LOCATIONS[index].lat);
    setClassLng(LOCATIONS[index].lng);
  };

  const fetchCheckins = useCallback(async () => {
    if (!sessionCode) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/checkins?code=${sessionCode}&password=${password}&lat=${classLat}&lng=${classLng}&radius=${radius}`);
      const data = await res.json();
      if (res.ok) {
        setCheckins(data.checkins);
        setLastRefresh(new Date().toLocaleTimeString());
      }
    } catch {}
    setLoading(false);
  }, [sessionCode, password, classLat, classLng, radius]);

  useEffect(() => {
    if (!authed || !sessionCode) return;
    fetchCheckins();
    const interval = setInterval(fetchCheckins, 15000);
    return () => clearInterval(interval);
  }, [authed, sessionCode, fetchCheckins]);

  const generateCode = async () => {
    if (!classLat) { alert('Please select a classroom location first.'); return; }
    if (selectedClass === 0) { alert('Please select a class first.'); return; }
    setGenLoading(true);
    const res = await fetch('/api/generate-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password,
        activeClass: CLASSES[selectedClass],
        cutoffTime,
        classLat,
        classLng,
        classRadius: radius,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setSessionCode(data.code);
      setCheckins([]);
    } else {
      alert(data.error || 'Failed to generate code');
    }
    setGenLoading(false);
  };

  if (!authed) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>Instructor Login</h1>
          <input
            style={styles.input}
            type="password"
            placeholder="Dashboard password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setAuthed(true)}
          />
          <button style={styles.button} onClick={() => setAuthed(true)}>
            Enter Dashboard
          </button>
        </div>
      </div>
    );
  }

  const present = checkins.filter((c) => c.status === 'PRESENT').length;
  const late = checkins.filter((c) => c.status === 'LATE' || c.status === 'LOCATION UNVERIFIED & LATE').length;
  const unverified = checkins.filter((c) => c.status === 'LOCATION UNVERIFIED' || c.status === 'LOCATION UNVERIFIED & LATE').length;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>Attendance Dashboard</h1>
        {lastRefresh && <span style={styles.refreshNote}>Auto-refreshes every 15s · Last updated: {lastRefresh}</span>}
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Session Setup</h2>

        <label style={styles.label}>Class</label>
        <select
          style={styles.select}
          value={selectedClass}
          onChange={(e) => setSelectedClass(Number(e.target.value))}
        >
          {CLASSES.map((c, i) => <option key={i} value={i}>{c}</option>)}
        </select>

        <label style={styles.label}>Classroom Building</label>
        <select
          style={styles.select}
          value={selectedLocation}
          onChange={(e) => handleLocationSelect(Number(e.target.value))}
        >
          {LOCATIONS.map((loc, i) => <option key={i} value={i}>{loc.name}</option>)}
        </select>

        {classLat && classLng && (
          <p style={styles.coordDisplay}>
            Coordinates: {parseFloat(classLat).toFixed(5)}, {parseFloat(classLng).toFixed(5)}
          </p>
        )}

        <div style={styles.radiusRow}>
          <label style={styles.radiusLabel}>Verification radius (meters):</label>
          <input
            style={styles.radiusInput}
            type="number"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
          />
        </div>

        <div style={styles.radiusRow}>
          <label style={styles.radiusLabel}>Attendance cutoff time:</label>
          <input
            style={styles.radiusInput}
            type="time"
            value={cutoffTime}
            onChange={(e) => setCutoffTime(e.target.value)}
          />
        </div>
        {cutoffTime && (
          <p style={styles.coordDisplay}>Students checking in after {cutoffTime} will be marked Late.</p>
        )}
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Session Code</h2>
        <button style={styles.button} onClick={generateCode} disabled={genLoading}>
          {genLoading ? 'Generating...' : 'Generate New Session Code'}
        </button>
        {sessionCode && (
          <div style={styles.codeBox}>
            <span style={styles.codeLabel}>Today's code:</span>
            <span style={styles.code}>{sessionCode}</span>
          </div>
        )}
      </div>

      {sessionCode && (
        <div style={styles.section}>
          <div style={styles.statsRow}>
            <div style={{ ...styles.statCard, borderColor: '#38a169' }}>
              <div style={styles.statNum}>{present}</div>
              <div style={styles.statLabel}>Present</div>
            </div>
            <div style={{ ...styles.statCard, borderColor: '#d97706' }}>
              <div style={styles.statNum}>{late}</div>
              <div style={styles.statLabel}>Late</div>
            </div>
            <div style={{ ...styles.statCard, borderColor: '#e53e3e' }}>
              <div style={styles.statNum}>{unverified}</div>
              <div style={styles.statLabel}>Unverified</div>
            </div>
            <div style={{ ...styles.statCard, borderColor: '#3b82f6' }}>
              <div style={styles.statNum}>{checkins.length}</div>
              <div style={styles.statLabel}>Total</div>
            </div>
          </div>

          <button
            style={{ ...styles.button, backgroundColor: '#6b7280', marginBottom: '16px' }}
            onClick={fetchCheckins}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Now'}
          </button>

          <table style={styles.table}>
            <thead>
              <tr>
                {['Name', 'Time', 'Distance', 'Status'].map((h) => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {checkins.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: '#718096' }}>
                    No check-ins yet
                  </td>
                </tr>
              ) : (
                checkins.map((c, i) => (
                  <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#f7fafc' : '#fff' }}>
                    <td style={styles.td}>{c.name}</td>
                    <td style={styles.td}>{c.timestamp}</td>
                    <td style={styles.td}>{c.distance !== null ? `${Math.round(c.distance)}m` : 'N/A'}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        backgroundColor:
                          c.status === 'PRESENT' ? '#c6f6d5' :
                          c.status === 'LATE' ? '#fefcbf' :
                          c.status === 'LOCATION UNVERIFIED' ? '#fed7d7' :
                          c.status === 'LOCATION UNVERIFIED & LATE' ? '#fed7d7' : '#e2e8f0',
                        color:
                          c.status === 'PRESENT' ? '#276749' :
                          c.status === 'LATE' ? '#b7791f' :
                          c.status === 'LOCATION UNVERIFIED' ? '#9b2c2c' :
                          c.status === 'LOCATION UNVERIFIED & LATE' ? '#9b2c2c' : '#4a5568',
                      }}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f4f8', fontFamily: 'sans-serif' },
  page: { minHeight: '100vh', backgroundColor: '#f0f4f8', padding: '32px 24px', fontFamily: 'sans-serif', maxWidth: '860px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '8px' },
  headerTitle: { margin: 0, fontSize: '28px', fontWeight: '700', color: '#1a202c' },
  refreshNote: { fontSize: '13px', color: '#718096' },
  card: { backgroundColor: '#fff', borderRadius: '16px', padding: '40px 32px', maxWidth: '400px', width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', display: 'flex', flexDirection: 'column', gap: '16px' },
  title: { margin: 0, fontSize: '24px', fontWeight: '700', color: '#1a202c' },
  section: { backgroundColor: '#fff', borderRadius: '12px', padding: '24px', marginBottom: '20px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' },
  sectionTitle: { margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#2d3748' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#4a5568', marginBottom: '6px', marginTop: '12px' },
  select: { width: '100%', padding: '12px 14px', fontSize: '15px', borderRadius: '8px', border: '1.5px solid #cbd5e0', backgroundColor: '#fff', boxSizing: 'border-box' },
  coordDisplay: { margin: '8px 0 0 0', fontSize: '13px', color: '#4a5568', fontFamily: 'monospace' },
  radiusRow: { display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' },
  radiusLabel: { fontSize: '14px', color: '#4a5568' },
  radiusInput: { padding: '8px 12px', fontSize: '14px', borderRadius: '8px', border: '1.5px solid #cbd5e0', width: '120px' },
  input: { padding: '12px 14px', fontSize: '16px', borderRadius: '8px', border: '1.5px solid #cbd5e0', width: '100%', boxSizing: 'border-box' },
  button: { padding: '12px 20px', fontSize: '15px', fontWeight: '600', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', width: '100%' },
  codeBox: { display: 'flex', alignItems: 'center', gap: '14px', backgroundColor: '#ebf8ff', borderRadius: '10px', padding: '16px 20px', marginTop: '14px' },
  codeLabel: { fontSize: '14px', color: '#2b6cb0', fontWeight: '500' },
  code: { fontSize: '36px', fontWeight: '800', color: '#2b6cb0', letterSpacing: '6px' },
  statsRow: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' },
  statCard: { flex: 1, minWidth: '80px', backgroundColor: '#fff', border: '2px solid', borderRadius: '10px', padding: '16px', textAlign: 'center' },
  statNum: { fontSize: '32px', fontWeight: '700', color: '#1a202c' },
  statLabel: { fontSize: '13px', color: '#718096', marginTop: '4px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: { textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #e2e8f0', color: '#4a5568', fontWeight: '600' },
  td: { padding: '10px 12px', borderBottom: '1px solid #e2e8f0', color: '#2d3748' },
  badge: { padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600' },
};
