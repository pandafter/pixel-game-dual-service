import { useEffect, useState, useRef } from 'react';
import GameView from './GameView';
import ControlView from './ControlView';
import detectDevice from './utils/detectDevice';
import './index.css';

export default function App() {
  const isMobile = detectDevice();

  const [userID, setUserID] = useState(localStorage.getItem('userID') || '');
  const [playerName, setPlayerName] = useState(localStorage.getItem('playerName') || '');

  const getValidColor = () => {
    const storedColor = localStorage.getItem('playerColor');
    if (storedColor && /^#[0-9A-Fa-f]{6}$/.test(storedColor)) {
      return storedColor;
    }
    return '#00ff99';
  };

  const [playerColor, setPlayerColor] = useState(getValidColor());

  // Generar un playerID solo si es móvil (y una sola vez)
  const [playerID] = useState(() => {
    if (isMobile) {
      return 'player-' + Math.random().toString(36).substr(2, 9);
    }
    return null;
  });

  const [submitted, setSubmitted] = useState(false);
  const [role, setRole] = useState(null);
  const ws = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userID.trim()) return;

    localStorage.setItem('userID', userID);

    if (isMobile) {
      localStorage.setItem('playerName', playerName);
      localStorage.setItem('playerColor', playerColor);
    } else {
      setPlayerName('');
      setPlayerColor('#00ff99');
    }

    setSubmitted(true);
  };

  useEffect(() => {
    if (!submitted) return;

    try {
      ws.current = new WebSocket('ws://192.168.1.14:3001');

      ws.current.onopen = () => {
        console.log('✅ WebSocket opened');
        ws.current.send(
          JSON.stringify({
            action: 'join',
            userID,
            playerID: isMobile ? playerID : undefined, // SOLO móviles lo mandan
            isMobile,
            playerName: isMobile ? playerName : '',
            playerColor: isMobile ? playerColor : '#00ff99',
          })
        );
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📩 Message from server:', data);

          if (data.action === 'role') {
            setRole(data.role.trim());
          }
        } catch (msgErr) {
          console.error('❌ Error parsing message:', msgErr);
        }
      };

      ws.current.onerror = (err) => {
        console.error('❌ WebSocket error:', err);
      };

      ws.current.onclose = () => {
        console.warn('🔌 WebSocket closed');
      };
    } catch (err) {
      console.error('❌ Error connecting WebSocket:', err);
    }

    return () => {
      ws.current?.close();
    };
  }, [submitted]);

  // UI del formulario de login
  if (!submitted) {
    return (
      <div className="login-container">
        <form onSubmit={handleSubmit} className="login-form">
          <h2>Enter your User ID</h2>
          <input
            type="text"
            value={userID}
            onChange={(e) => setUserID(e.target.value)}
            placeholder="Your user ID"
            required
          />
          {isMobile ? (
            <div style={{ marginTop: 12 }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: 6,
                  fontWeight: '600',
                  fontSize: 14,
                  color: '#00ff99',
                }}
              >
                Player name (optional)
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Player name (optional)"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: 16,
                  borderRadius: 6,
                  border: '1px solid #ccc',
                  boxSizing: 'border-box',
                  marginBottom: 16,
                }}
              />

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    justifyContent: 'center',
                    width: '100%',
                  }}
                >
                  <button
                    type="submit"
                    style={{
                      backgroundColor: '#00ff99',
                      color: '#000',
                      border: 'none',
                      fontFamily: "'PressStart2P', monospace",
                      fontSize: 14,
                      padding: '10px 20px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      borderRadius: 6,
                      flexShrink: 0,
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#00cc77')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#00ff99')}
                  >
                    Connect
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="submit"
              style={{
                backgroundColor: '#00ff99',
                color: '#000',
                border: 'none',
                fontFamily: "'PressStart2P', monospace",
                fontSize: 14,
                padding: '10px 20px',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                borderRadius: 6,
                flexShrink: 0,
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#00cc77')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#00ff99')}
            >
              Connect
            </button>
          )}
        </form>
      </div>
    );
  }

  // UI cuando ya tiene rol
  if (role === 'game') {
    return <GameView ws={ws.current} userID={userID} playerName={playerName} playerColor={playerColor} />;
  }

  if (role === 'control' && userID) {
    return <ControlView ws={ws.current} userID={userID} />;
  }

  return (
    <div className="loading">
      <p>Connecting...</p>
      {role && (
        <p>
          Detected role: <strong>{role}</strong>
        </p>
      )}
    </div>
  );
}
