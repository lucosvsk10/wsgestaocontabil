type LoadingMode = 'light' | 'standard';

const LIGHT_LOGO = '/lovable-uploads/f7fdf0cf-f16c-4df7-a92c-964aadea9539.png';
const STANDARD_LOGO = '/lovable-uploads/fecb5c37-c321-44e3-89ca-58de7e59e59d.png';

const loaderPaths = [
  'M17 35 C28 22 47 18 70 24 C82 27 89 35 91 44',
  'M16 42 C30 29 50 27 72 32 C83 35 90 42 91 50',
  'M19 49 C35 38 54 36 74 40 C84 42 90 49 90 56',
  'M24 56 C41 47 59 45 76 48 C84 50 89 56 88 62',
  'M31 63 C47 57 63 55 77 57 C84 58 87 62 85 67',
  'M40 69 C54 65 67 64 77 65 C82 66 84 69 81 73',
];

function WsLoaderMark() {
  return (
    <svg
      viewBox="0 0 108 92"
      className="ws-app-loader-mark"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="ws-loader-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7047ff" />
          <stop offset="38%" stopColor="#a84cf1" />
          <stop offset="68%" stopColor="#e25a9d" />
          <stop offset="100%" stopColor="#ef9a38" />
        </linearGradient>
        <filter id="ws-loader-glow" x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="0.9" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g className="ws-app-loader-mark-inner" filter="url(#ws-loader-glow)">
        {loaderPaths.map((d, index) => (
          <path
            key={d}
            d={d}
            fill="none"
            stroke="url(#ws-loader-gradient)"
            strokeWidth={4.4 - index * 0.12}
            strokeLinecap="round"
            className="ws-app-loader-stroke"
            style={{ animationDelay: `${index * 75}ms` }}
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
      aria-label="Carregando WS Gestão Contábil"
    >
      <style>{`
        .ws-app-loading-screen {
          position: fixed;
          inset: 0;
          z-index: 9999;
          overflow: hidden;
          isolation: isolate;
          color: #f7f8fa;
          background-color: #020918;
          background-image:
            linear-gradient(rgba(17, 30, 51, .78) 1px, transparent 1px),
            linear-gradient(90deg, rgba(17, 30, 51, .78) 1px, transparent 1px);
          background-size: 82px 82px;
          animation: ws-app-loading-fade-in .16s ease-out both;
        }

        .ws-app-loading-screen.is-light {
          color: #15191f;
          background-color: #f3ecd9;
          background-image:
            linear-gradient(rgba(190, 194, 192, .53) 1px, transparent 1px),
            linear-gradient(90deg, rgba(190, 194, 192, .53) 1px, transparent 1px);
        }

        .ws-app-loading-screen::before {
          content: '';
          position: absolute;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          background: radial-gradient(circle at 50% 42%, rgba(55, 76, 112, .07), transparent 38%);
        }

        .ws-app-loading-screen.is-light::before {
          background: radial-gradient(circle at 50% 40%, rgba(255, 255, 255, .26), transparent 38%);
        }

        .ws-app-loading-logo-wrap {
          position: absolute;
          top: 29.5%;
          left: 50%;
          width: min(86vw, 280px);
          transform: translate(-50%, -50%);
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .ws-app-loading-logo {
          display: block;
          width: clamp(154px, 13vw, 205px);
          height: auto;
          max-height: 68px;
          object-fit: contain;
          object-position: center;
          user-select: none;
          pointer-events: none;
        }

        .ws-app-loading-indicator {
          position: absolute;
          top: 52.5%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 7px;
          min-width: 120px;
        }

        .ws-app-loader-mark {
          display: block;
          width: clamp(52px, 4.7vw, 68px);
          height: auto;
          overflow: visible;
          transform-origin: 50% 55%;
          animation: ws-app-loader-float 1.85s cubic-bezier(.4,0,.2,1) infinite;
        }

        .ws-app-loader-mark-inner {
          transform-origin: 54px 48px;
          animation: ws-app-loader-sway 1.32s cubic-bezier(.55,.08,.35,.95) infinite;
        }

        .ws-app-loader-stroke {
          stroke-dasharray: 78 24;
          stroke-dashoffset: 30;
          animation: ws-app-loader-flow 1.32s ease-in-out infinite;
        }

        .ws-app-loading-label {
          margin: 0;
          font-family: inherit;
          font-size: 10px;
          font-weight: 500;
          line-height: 1;
          letter-spacing: .045em;
          text-transform: uppercase;
          white-space: nowrap;
          opacity: .9;
        }

        .ws-app-loading-dots::after {
          content: '...';
          display: inline-block;
          width: 1.2em;
          overflow: hidden;
          vertical-align: bottom;
          animation: ws-app-loading-dots 1.2s steps(4, end) infinite;
        }

        @keyframes ws-app-loading-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes ws-app-loader-sway {
          0% { transform: rotate(-7deg) scale(.98); }
          50% { transform: rotate(13deg) scale(1.025); }
          100% { transform: rotate(-7deg) scale(.98); }
        }

        @keyframes ws-app-loader-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }

        @keyframes ws-app-loader-flow {
          0% { stroke-dashoffset: 34; opacity: .42; }
          45% { opacity: 1; }
          100% { stroke-dashoffset: -66; opacity: .56; }
        }

        @keyframes ws-app-loading-dots {
          0% { width: 0; }
          100% { width: 1.2em; }
        }

        @media (max-width: 720px) {
          .ws-app-loading-screen {
            background-size: 52px 52px;
          }

          .ws-app-loading-logo-wrap {
            top: 31%;
          }

          .ws-app-loading-logo {
            width: 148px;
            max-height: 56px;
          }

          .ws-app-loading-indicator {
            top: 53.5%;
            gap: 6px;
          }

          .ws-app-loader-mark {
            width: 50px;
          }

          .ws-app-loading-label {
            font-size: 9px;
          }
        }

        @media (max-height: 620px) {
          .ws-app-loading-logo-wrap { top: 27%; }
          .ws-app-loading-indicator { top: 55%; }
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

      <div className="ws-app-loading-logo-wrap">
        <img
          src={logo}
          alt="WS Gestão Contábil"
          className="ws-app-loading-logo"
          draggable={false}
          decoding="async"
          fetchPriority="high"
        />
      </div>

      <div className="ws-app-loading-indicator" aria-hidden="true">
        <WsLoaderMark />
        <p className="ws-app-loading-label">
          Carregando<span className="ws-app-loading-dots" />
        </p>
      </div>

      <span className="sr-only">Carregando o sistema...</span>
    </div>
  );
}
