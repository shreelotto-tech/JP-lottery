import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

export const LoginPage: React.FC = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Set responsive viewport for the login page
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
      viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }
    return () => {
      // Revert to 1280px for the game terminal so it scales down on phones
      if (viewportMeta) {
        viewportMeta.setAttribute('content', 'width=1280');
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Map userId to a pseudo-email for Supabase Auth
    const email = `${userId}@internal.app`;
    const { error: authError } = await signIn(email, password);

    if (authError) {
      setError(authError);
      setLoading(false);
    }
    // On success, the AuthContext triggers onAuthStateChange,
    // which updates `user`, causing App.tsx to redirect to "/"
  };

  return (
    <>
      <style>{`
        html, body, #root {
          min-width: 0 !important;
          width: 100% !important;
          overflow-x: hidden;
        }
        .lp-root {
          min-height: 100dvh;
          background:
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0, 0, 0, 0.015) 2px,
              rgba(0, 0, 0, 0.015) 4px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 3px,
              rgba(0, 0, 0, 0.01) 3px,
              rgba(0, 0, 0, 0.01) 6px
            ),
            linear-gradient(135deg, #ccc8c0 0%, #c0b8b0 50%, #c8c4bc 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          font-family: Arial, sans-serif;
          flex-direction: column;
        }
        .lp-card {
          width: 92vw;
          max-width: 420px;
          background: #d0c8c0;
          border: 2px solid #8c847c;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.2);
        }
        .lp-top {
          background: #2a1a2e;
          padding: 28px 20px 20px;
          text-align: center;
          border-bottom: 2px solid #1a1018;
        }
        .lp-logo-circle {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: #1e1020;
          border: 2px solid #3a2040;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          font-size: 10px;
          font-weight: 800;
          color: #ff6b00;
          line-height: 1.1;
          text-align: center;
        }
        .lp-title {
          font-size: 24px;
          font-weight: 800;
          color: #ffd700;
          letter-spacing: 2px;
          margin: 0;
        }
        .lp-subtitle {
          color: #d8c8d8;
          font-size: 13px;
          margin-top: 8px;
          letter-spacing: 1px;
          text-transform: uppercase;
          font-weight: 700;
        }
        .lp-form {
          padding: 24px 20px 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .lp-input-group { position: relative; }
        .lp-toggle-pw {
          position: absolute;
          right: 16px;
          top: 32px;
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 20px;
          opacity: 0.5;
          padding: 0;
          line-height: 1;
        }
        .lp-toggle-pw:hover { opacity: 0.8; }
        .lp-label {
          display: block;
          font-size: 13px;
          color: #4a4a4a;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
          font-weight: 700;
        }
        .lp-input {
          width: 100%;
          height: 48px;
          background: #fff;
          border: 2px solid #7777bb;
          border-radius: 6px;
          padding: 0 16px;
          font-size: 16px;
          color: #1a1a1a;
          font-family: Arial, sans-serif;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .lp-input:focus {
          border-color: #3333cc;
          box-shadow: 0 0 3px rgba(50, 50, 200, 0.25);
        }
        .lp-input::placeholder { color: #666; }
        .lp-btn {
          width: 100%;
          height: 50px;
          background: #cc1111;
          border: 2px solid #9e0d0d;
          border-radius: 6px;
          color: #fff;
          font-size: 16px;
          font-weight: 800;
          letter-spacing: 1px;
          cursor: pointer;
          font-family: inherit;
          transition: filter 0.15s;
          margin-top: 8px;
        }
        .lp-btn:hover { filter: brightness(1.12); }
        .lp-btn:active { transform: scale(0.97); }
        .lp-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .lp-error {
          color: #cc1111;
          font-size: 13px;
          font-weight: 700;
          text-align: center;
          padding: 0 24px;
        }
        .lp-disclaimer {
          text-align: center;
          padding: 0 24px 20px;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: #cc1111;
        }
        
        .lp-back-container {
          width: 92vw;
          max-width: 420px;
          display: flex;
          justify-content: center;
          margin-top: 20px;
        }
        .lp-back-btn {
          width: 100%;
          height: 56px;
          border-radius: 8px;
          background: linear-gradient(135deg, #7b0033, #d6004b);
          border: none;
          color: #fff;
          font-size: 18px;
          font-weight: 800;
          letter-spacing: 1.5px;
          cursor: pointer;
          font-family: inherit;
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.4);
          transition: all 0.2s;
        }
        .lp-back-btn:hover {
          filter: brightness(1.15);
          box-shadow: 0 0 25px rgba(255, 255, 255, 0.6);
        }
        .lp-back-btn:active {
          transform: scale(0.97);
        }
      `}</style>

      <div className="lp-root terminal-theme-bg">
        <div>
          <div className="lp-card terminal-card">
            <div className="lp-top">
              <div className="lp-logo-circle" style={{ overflow: 'hidden', padding: 0, border: 'none', background: 'transparent' }}>
                <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              </div>
              <h1 className="lp-title" style={{ fontWeight: 900 }}>J.P</h1>
              <p className="lp-subtitle">Login Panel</p>
            </div>

            <form className="lp-form" onSubmit={handleSubmit}>
              <div className="lp-input-group">
                <label className="lp-label">User ID</label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="lp-input"
                  placeholder="Enter your user ID"
                  required
                />
              </div>
              <div className="lp-input-group">
                <label className="lp-label">Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="lp-input"
                  placeholder="Enter your password"
                  required
                  style={{ paddingRight: '46px' }}
                />
                <button
                  type="button"
                  className="lp-toggle-pw"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {error && <div className="lp-error">{error}</div>}
              <button type="submit" disabled={loading} className="lp-btn terminal-btn-red">
                {loading ? 'AUTHENTICATING...' : 'LOGIN'}
              </button>
            </form>

            <div className="lp-disclaimer">
              Free Play for Fun Only
            </div>
          </div>

          <div className="lp-back-container">
            <button className="lp-back-btn" onClick={() => navigate('/')}>
              GO BACK
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
