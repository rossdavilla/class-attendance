import { useState, useEffect, useRef } from 'react';

export default function CheckIn() {
  const [code, setCode] = useState('');
  const [codeConfirmed, setCodeConfirmed] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [allNames, setAllNames] = useState([]);
  const [activeClass, setActiveClass] = useState('');
  const [rosterError, setRosterError] = useState('');
  const [status, setStatus] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);

  const handleCodeSubmit = async () => {
    if (!code.trim()) {
      setStatus('Please enter the session code.');
      return;
    }
    setRosterLoading(true);
    setRosterError('');
    try {
      const res = await fetch(`/api/roster?code=${code.trim().toUpperCase()}`);
      const data = await res.json();
      if (res.ok) {
        setAllNames(data.names);
        setActiveClass(data.activeClass);
        setCodeConfirmed(true);
        setStatus('');
      } else {
        setStatus(data.error || 'Invalid session code. Please check with your instructor.');
      }
    } catch {
      setStatus('Network error. Please try again.');
    }
    setRosterLoading(false);
  };

  const handleNameInput = (val) => {
    setNameInput(val);
    setSelectedName('');
    if (val.trim().length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const lower = val.toLowerCase();
    const matches = allNames.filter((n) => n.toLowerCase().includes(lower));
    setSuggestions(matches.slice(0, 6));
    setShowSuggestions(true);
  };

  const handleSelectName = (name) => {
    setSelectedName(name);
    setNameInput(name);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleSubmit = async () => {
    const finalName = selectedName || nameInput.trim();
    if (!finalName) {
      setStatus('Please enter your name.');
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
            body: JSON.stringify({ name: finalName, code: code.toUpperCase(), latitude, longitude }),
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
    const isFlagged = status.includes('meters away');
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ ...styles.successIcon, color: isFlagged ? '#d97706' : '#38a169' }}>
            {isFlagged ? '⚠' : '✓'}
          </div>
          <h1 style={styles.successTitle}>
            {isFlagged ? 'Checked In' : "You're checked in!"}
          </h1>
          <p style={styles.successMsg}>{status}</p>
        </div>
      </div>
    );
  }

  if (!codeConfirmed) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>Class Check-In</h1>
          <p style={styles.subtitle}>Enter the session code from your instructor to get started.</p>
          <input
            style={styles.input}
            type="text"
            placeholder="Session code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleCodeSubmit()}
            disabled={rosterLoading}
          />
          {status ? <p style={styles.errorMsg}>{status}</p> : null}
          <button
            style={{ ...styles.button, opacity: rosterLoading ? 0.6 : 1 }}
            onClick={handleCodeSubmit}
            disabled={rosterLoading}
          >
            {rosterLoading ? 'Checking code...' : 'Continue'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Class Check-In</h1>
        <p style={styles.subtitle}>{activeClass} — Enter your name to mark your attendance.</p>

        <div style={{ position: 'relative' }}>
          <input
            ref={inputRef}
            style={styles.input}
            type="text"
            placeholder="Start typing your last name..."
            value={nameInput}
            onChange={(e) => handleNameInput(e.target.value)}
            onFocus={() => nameInput && setShowSuggestions(suggestions.length > 0)}
            disabled={loading}
            autoComplete="off"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div style={styles.suggestionBox}>
              {suggestions.map((name, i) => (
                <div
                  key={i}
                  style={styles.suggestionItem}
                  onMouseDown={() => handleSelectName(name)}
                  onTouchStart={() => handleSelectName(name)}
                >
                  {name}
                </div>
              ))}
              <div style={styles.suggestionHint}>
                Not seeing your name? Keep typing to enter it manually.
              </div>
            </div>
          )}
        </div>

        {selectedName && (
          <p style={styles.selectedNote}>✓ Selected: <strong>{selectedName}</strong></p>
        )}

        {status ? <p style={styles.errorMsg}>{status}</p> : null}

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
    padding: '14px', fontSize: '16px', borderRadius: '8px',
    border: '1.5px solid #cbd5e0', width: '100%', boxSizing: 'border-box',
  },
  button: {
    padding: '14px', fontSize: '17px', fontWeight: '600',
    backgroundColor: '#3b82f6', color: '#fff', border: 'none',
    borderRadius: '8px', cursor: 'pointer', width: '100%',
  },
  errorMsg: { margin: 0, fontSize: '14px', color: '#e53e3e', fontWeight: '500' },
  selectedNote: { margin: 0, fontSize: '14px', color: '#276749' },
  note: { margin: 0, fontSize: '12px', color: '#718096', textAlign: 'center' },
  successIcon: { fontSize: '52px', textAlign: 'center' },
  successTitle: { margin: 0, fontSize: '26px', fontWeight: '700', color: '#1a202c', textAlign: 'center' },
  successMsg: { margin: 0, fontSize: '15px', color: '#4a5568', textAlign: 'center', lineHeight: '1.6' },
  suggestionBox: {
    position: 'absolute', top: '100%', left: 0, right: 0,
    backgroundColor: '#fff', border: '1.5px solid #cbd5e0',
    borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
    zIndex: 100, marginTop: '4px', overflow: 'hidden',
  },
  suggestionItem: {
    padding: '12px 14px', fontSize: '15px', color: '#2d3748',
    cursor: 'pointer', borderBottom: '1px solid #f0f4f8',
  },
  suggestionHint: {
    padding: '10px 14px', fontSize: '12px', color: '#718096',
    backgroundColor: '#f7fafc', fontStyle: 'italic',
  },
};
