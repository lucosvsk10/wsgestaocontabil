type LoadingMode = 'light' | 'standard';

const LIGHT_LOGO = '/lovable-uploads/f7fdf0cf-f16c-4df7-a92c-964aadea9539.png';
const STANDARD_LOGO = '/lovable-uploads/fecb5c37-c321-44e3-89ca-58de7e59e59d.png';
const LIGHT_LOADER = '/loading/ws-loading-light.gif';
const STANDARD_LOADER = '/loading/ws-loading-standard.gif';

function OriginalLoaderAnimation({ light }: { light: boolean }) {
  return (
    <span className="ws-app-loader-crop" aria-hidden="true">
      <img
        src={light ? LIGHT_LOADER : STANDARD_LOADER}
        alt=""
        className="ws-app-loader-source"
        draggable={false}
        loading="eager"
        fetchPriority="high"
        decoding="sync"
      />
    </span>
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
          gap: 0;
          min-width: 120px;
        }

        .ws-app-loader-crop {
          position: relative;
          display: grid;
          place-items: center;
          width: 112px;
          height: 77px;
          overflow: hidden;
          isolation: isolate;
          -webkit-mask-image: radial-gradient(ellipse at center, #000 64%, rgba(0,0,0,.97) 76%, transparent 100%);
          mask-image: radial-gradient(ellipse at center, #000 64%, rgba(0,0,0,.97) 76%, transparent 100%);
        }

        .ws-app-loader-source {
          position: static;
          display: block;
          width: 112px;
          height: auto;
          max-width: none;
          pointer-events: none;
          user-select: none;
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
          margin-top: 18px;
        }

        @keyframes ws-app-loading-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
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
            gap: 0;
          }

          .ws-app-loader-crop {
            width: 96px;
            height: 66px;
          }

          .ws-app-loader-source {
            width: 96px;
          }

          .ws-app-loading-label {
            font-size: 9px;
            margin-top: 15px;
          }
        }

        @media (max-height: 620px) {
          .ws-app-loading-logo-wrap { top: 27%; }
          .ws-app-loading-indicator { top: 55%; }
        }

        @media (prefers-reduced-motion: reduce) {
          .ws-app-loading-screen {
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

      <div className="ws-app-loading-indicator">
        <OriginalLoaderAnimation light={light} />
        <p className="ws-app-loading-label">Carregando...</p>
      </div>

      <span className="sr-only">Carregando o sistema...</span>
    </div>
  );
}
