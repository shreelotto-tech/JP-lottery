import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Set responsive viewport for the landing page
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

  return (
    <>
      <style>{`
        html, body, #root {
          min-width: 0 !important;
          width: 100% !important;
          overflow-x: hidden;
        }
        .land-root {
          min-height: 100dvh;
          background:
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0,0,0,0.015) 2px,
              rgba(0,0,0,0.015) 4px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 3px,
              rgba(0,0,0,0.01) 3px,
              rgba(0,0,0,0.01) 6px
            ),
            linear-gradient(135deg, #2a1a2e 0%, #1a1018 50%, #2a1a2e 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: Arial, sans-serif;
          padding: 24px;
        }
        .land-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
          text-align: center;
          width: 100%;
          max-width: 500px;
        }
        .land-logo-circle {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          background: #1e1020;
          border: 2px solid #3a2040;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
          color: #ff6b00;
          line-height: 1.2;
          text-align: center;
          margin-bottom: 24px;
        }
        .land-title {
          font-size: clamp(36px, 8vw, 56px);
          font-weight: 900;
          color: #ffd700;
          letter-spacing: 4px;
          margin: 0 0 12px 0;
          text-shadow: 0 0 24px rgba(255, 215, 0, 0.4);
        }
        .land-subtitle {
          font-size: clamp(14px, 3.5vw, 18px);
          font-weight: 800;
          color: #d8c8d8;
          letter-spacing: 3px;
          text-transform: uppercase;
          margin: 0 0 36px 0;
        }
        .land-divider {
          width: 60px;
          height: 3px;
          background: #3a2040;
          margin: 0 auto 36px;
        }
        .land-buttons {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 90vw;
          max-width: 360px;
        }
        .land-btn {
          width: 100%;
          height: 54px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 800;
          letter-spacing: 2.5px;
          cursor: pointer;
          font-family: Arial, sans-serif;
          transition: filter 0.15s, transform 0.1s;
          border: none;
          text-transform: uppercase;
        }
        .land-btn:hover { filter: brightness(1.15); }
        .land-btn:active { transform: scale(0.97); }
        .land-btn-login {
          background: #cc1111;
          border: 2px solid #9e0d0d;
          color: #fff;
        }
        .land-btn-result {
          background: transparent;
          border: 2px solid #ffd700;
          color: #ffd700;
        }
        .land-btn-result:hover {
          background: rgba(255, 215, 0, 0.08);
          filter: none;
        }
        .land-disclaimer {
          margin-top: 32px;
          font-size: 13px;
          color: #cc1111;
          font-weight: 800;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
      `}</style>

      <div className="land-root">
        <div className="land-center">
          <div className="land-logo-circle" style={{ overflow: 'hidden', padding: 0, border: 'none', background: 'transparent' }}>
            <img src="/logo.jpg" alt="Logo" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          </div>

          <h1 className="land-title">SHREE LOTTO</h1>
          <p className="land-subtitle">Play only for fun</p>
          <div className="land-divider" />

          <div className="land-buttons">
            <button
              className="land-btn land-btn-login"
              onClick={() => navigate('/login')}
            >
              Game Login
            </button>
            <button
              className="land-btn land-btn-result"
              onClick={() => navigate('/2d-result', { state: { activeTab: '2D' } })}
            >
              2D Result
            </button>
            <button
              className="land-btn land-btn-result"
              onClick={() => navigate('/2d-result', { state: { activeTab: '3D' } })}
            >
              3D Result
            </button>
          </div>

          <p className="land-disclaimer">Free Play for Fun Only</p>
        </div>
      </div>
    </>
  );
};
