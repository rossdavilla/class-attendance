import { useState } from 'react';

export default function CheckIn() {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !code.trim()) {
      setStatus('Please enter both your name and the session code.');
      return;
    }
    setLoading(true);
    setStatus('Getting your location...');

    if (!navigator.geolocation) {
      setStatus('Your browser does not support location access. Please try on your phone.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setStatus('Submitting your check-in...');
        try {
          const res = await fetch('/api/checkin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, code, latitude, longitude }),
          });
          const data = await res.json();
          if (res.ok) {
            setSubmitted(true);
            setStatus(data.message);
          } else {
            setStatus(data.error || 'Something went wrong. Please try again.');
          }
        } catch {
          setStatus('Network error. Please check your connection and try again.');
        }
        setLoading(false);
      },
      (error) => {
        if (error.code === 1) {
          setStatus('Location access was denied. Please allow location access and try again.');
        } else {
          setStatus('Could not get your location. Please make sure location is enabled.');
        }
        setLoading(false);
      },
      { timeout: 10000, maximumAge: 0 }
    );
  };

  if (submitted) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.successIcon}>✓</div>
          <h1 style={styles.successTitle}>You're checked in!</h1>
          <p style={styles.successMsg}>{status}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Class Check-In</h1>
        <p style={styles.subtitle}>Enter your details below to mark your attendance.</p>
        <input
          style={styles.input}
          type="text"
          placeholder="Your full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
        />
        <input
          style={styles.input}
          type="text"
          placeholder="Session code (from your instructor)"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          disabled={loading}
        />
        {status ? <p style={styles.statusMsg}>{status}</p> : null}
        <button
          style={{ ...styles.button, opacity: loading ? 0.6 : 1 }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Please wait...' : 'Check In'}
        </button>
        <p style={styles.note}>
          This app will request your location to verify you are in the classroom.
          Your location is only used for attendance verification.
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', backgroundColor: '#f0f4f8', padding: '20px',
    fontFamily: 'sans-serif',
  },
  card: {
    backgroundColor: '#fff', borderRadius: '16px', padding: '40px 32px',
    maxWidth: '420px', width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
    display: 'flex', flexDirection: 'column', gap: '16px',
  },
  title: { margin: 0, fontSize: '26px', fontWeight: '700', color: '#1a202c' },
  subtitle: { margin: 0, fontSize: '15px', color: '#4a5568' },
  input: {
    padding: '12px 14px', fontSize: '16px', borderRadius: '8px',
    border: '1.5px solid #cbd5e0', outline: 'none', width: '100%',
    boxSizing: 'border-box',
  },
  button: {
    padding: '14px', fontSize: '17px', fontWeight: '600',
    backgroundColor: '#3b82f6', color: '#fff', border: 'none',
    borderRadius: '8px', cursor: 'pointer', width: '100%',
  },
  statusMsg: { margin: 0, fontSize: '14px', color: '#e53e3e', fontWeight: '500' },
  note: { margin: 0, fontSize: '12px', color: '#718096', textAlign: 'center' },
  successIcon: {
    fontSize: '52px', color: '#38a169', textAlign: 'center',
  },
  successTitle: { margin: 0, fontSize: '26px', fontWeight: '700', color: '#1a202c', textAlign: 'center' },
  successMsg: { margin: 0, fontSize: '15px', color: '#4a5568', textAlign: 'center' },
};
