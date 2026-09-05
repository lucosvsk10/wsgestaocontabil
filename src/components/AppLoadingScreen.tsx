type LoadingMode = 'light' | 'standard';

const LIGHT_LOGO = '/lovable-uploads/f7fdf0cf-f16c-4df7-a92c-964aadea9539.png';
const STANDARD_LOGO = '/lovable-uploads/fecb5c37-c321-44e3-89ca-58de7e59e59d.png';

function WsLoaderMark() {
  const paths = [
    'M20 43 C35 28, 54 21, 79 24',
    'M19 49 C38 35, 59 30, 84 33',
    'M22 55 C43 43, 64 40, 88 42',
    'M28 61 C50 52, 70 50, 91 50',
    'M36 67 C56 61, 75 59, 92 58',
    'M46 72 C63 69, 79 66, 92 65',
  ];

  return (
    <svg
      viewBox="0 0 112 94"
      className="ws-app-loader-mark"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="ws-loader-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7b3ff2" />
          <stop offset="44%" stopColor="#b14ff1" />
          <stop offset="72%" stopColor="#ef5f8f" />
          <stop offset="100%" stopColor="#f39a38" />
        </linearGradient>
        <filter id="ws-loader-soft-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g className="ws-app-loader-mark-inner" filter="url(#ws-loader-soft-glow)">
        {paths.map((d, index) => (
          <path
            key={d}
            d={d}
            fill="none"
            stroke="url(#ws-loader-gradient)"
            strokeWidth={index < 2 ? 4.4 : 4}
            strokeLinecap="round"
            className="ws-app-loader-stroke"
            style={{ animationDelay: `${index * 90}ms` }}
          />
        ))}
      </g>
    </svg>
  );
}

export default function AppLoadingScreen({ mode = 'standard' }: { mode?: LoadingMode }) {
  const light = mode === 'light';
  const logo = light ? LIGHT_LOGO : STANDARD_LOGO;

  return (
    <div
      className={`ws-app-loading-screen ${light ? 'is-light' : 'is-standard'}`}
      role="status"
      aria-live="polite"
      aria-label="Carregando o sistema"
    >
      <style>{`
        .ws-app-loading-screen {
          position: fixed;
          inset: 0;
          z-index: 9999;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          isolation: isolate;
          color: #f6f7f9;
          background-color: #020918;
          background-image:
            linear-gradient(rgba(18, 31, 52, .76) 1px, transparent 1px),
            linear-gradient(90deg, rgba(18, 31, 52, .76) 1px, transparent 1px);
          background-size: 82px 82px;
          animation: ws-app-loading-fade-in .18s ease-out both;
        }

        .ws-app-loading-screen.is-light {
          color: #161a22;
          background-color: #f3ecd9;
          background-image:
            linear-gradient(rgba(184, 189, 190, .50) 1px, transparent 1px),
            linear-gradient(90deg, rgba(184, 189, 190, .50) 1px, transparent 1px);
        }

        .ws-app-loading-screen::before {
          content: '';
          position: absolute;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          background: radial-gradient(circle at 50% 45%, rgba(39, 57, 88, .10), transparent 42%);
        }

        .ws-app-loading-screen.is-light::before {
          background: radial-gradient(circle at 50% 44%, rgba(255,255,255,.32), transparent 42%);
        }

        .ws-app-loading-composition {
          width: min(92vw, 520px);
          display: flex;
          flex-direction: column;
          align-items: center;
          transform: translateY(-2vh);
        }

        .ws-app-loading-logo {
          display: block;
          width: clamp(150px, 14vw, 205px);
          height: auto;
          max-height: 72px;
          object-fit: contain;
          object-position: center;
          user-select: none;
          pointer-events: none;
        }

        .ws-app-loading-indicator {
          margin-top: clamp(78px, 11vh, 122px);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 7px;
        }

        .ws-app-loader-mark {
          display: block;
          width: clamp(48px, 4.8vw, 62px);
          height: auto;
          overflow: visible;
          transform-origin: 50% 55%;
          animation: ws-app-loader-drift 1.95s cubic-bezier(.4,0,.2,1) infinite;
        }

        .ws-app-loader-mark-inner {
          transform-origin: 56px 49px;
          animation: ws-app-loader-turn 1.35s cubic-bezier(.55,.08,.35,.95) infinite;
        }

        .ws-app-loader-stroke {
          stroke-dasharray: 82 26;
          stroke-dashoffset: 0;
          animation: ws-app-loader-flow 1.35s ease-in-out infinite;
        }

        .ws-app-loading-label {
          margin: 0;
          font-family: inherit;
          font-size: 10px;
          font-weight: 500;
          line-height: 1;
          letter-spacing: .055em;
          text-transform: uppercase;
          opacity: .88;
        }

        .ws-app-loading-dots::after {
          content: '...';
          display: inline-block;
          width: 1.25em;
          overflow: hidden;
          vertical-align: bottom;
          animation: ws-app-loading-dots 1.25s steps(4, end) infinite;
        }

        @keyframes ws-app-loading-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes ws-app-loader-turn {
          0% { transform: rotate(-10deg) scale(.98); }
          50% { transform: rotate(16deg) scale(1.03); }
          100% { transform: rotate(-10deg) scale(.98); }
        }

        @keyframes ws-app-loader-drift {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }

        @keyframes ws-app-loader-flow {
          0% { stroke-dashoffset: 38; opacity: .42; }
          48% { opacity: 1; }
          100% { stroke-dashoffset: -70; opacity: .52; }
        }

        @keyframes ws-app-loading-dots {
          0% { width: 0; }
          100% { width: 1.25em; }
        }

        @media (max-width: 720px) {
          .ws-app-loading-screen {
            background-size: 52px 52px;
          }

          .ws-app-loading-composition {
            transform: translateY(-4vh);
          }

          .ws-app-loading-logo {
            width: 148px;
            max-height: 58px;
          }

          .ws-app-loading-indicator {
            margin-top: 72px;
          }

          .ws-app-loader-mark {
            width: 48px;
          }

          .ws-app-loading-label {
            font-size: 9px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ws-app-loading-screen,
          .ws-app-loader-mark,
          .ws-app-loader-mark-inner,
          .ws-app-loader-stroke,
          .ws-app-loading-dots::after {
            animation-duration: .001ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>

      <div className="ws-app-loading-composition">
        <img
          src={logo}
          alt="WS Gestão Contábil"
          className="ws-app-loading-logo"
          draggable={false}
          decoding="async"
          fetchPriority="high"
        />

        <div className="ws-app-loading-indicator" aria-hidden="true">
          <WsLoaderMark />
          <p className="ws-app-loading-label">
            Carregando<span className="ws-app-loading-dots" />
          </p>
        </div>
      </div>

      <span className="sr-only">Carregando o sistema...</span>
    </div>
  );
}
