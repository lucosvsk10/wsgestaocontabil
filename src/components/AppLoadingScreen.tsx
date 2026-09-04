type LoadingMode = 'light' | 'standard';

export default function AppLoadingScreen({ mode = 'standard' }: { mode?: LoadingMode }) {
  const source =
    mode === 'light' ? '/loading/ws-loading-light.gif' : '/loading/ws-loading-standard.gif';
  const light = mode === 'light';

  return (
    <div
      className={`fixed inset-0 z-[9999] grid place-items-center overflow-hidden ${
        light ? 'bg-[#f1ebd9]' : 'bg-[#000617]'
      }`}
      style={{
        backgroundImage: light
          ? 'linear-gradient(rgba(210, 207, 197, .58) 1px, transparent 1px), linear-gradient(90deg, rgba(210, 207, 197, .58) 1px, transparent 1px)'
          : 'linear-gradient(rgba(8, 18, 36, .86) 1px, transparent 1px), linear-gradient(90deg, rgba(8, 18, 36, .86) 1px, transparent 1px)',
        backgroundSize: 'clamp(32px, 5.16vh, 64px) clamp(32px, 5.16vh, 64px)',
      }}
      role="status"
      aria-live="polite"
      aria-label="Carregando o sistema"
    >
      <img
        src={source}
        alt=""
        aria-hidden="true"
        className="h-[clamp(360px,58vh,720px)] w-auto max-w-none object-contain object-center"
        decoding="async"
        fetchPriority="high"
      />
      <span className="sr-only">Carregando o sistema...</span>
    </div>
  );
}
