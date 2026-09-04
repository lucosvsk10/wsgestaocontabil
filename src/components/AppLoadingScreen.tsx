type LoadingMode = 'light' | 'standard';

export default function AppLoadingScreen({ mode = 'standard' }: { mode?: LoadingMode }) {
  const source =
    mode === 'light' ? '/loading/ws-loading-light.gif' : '/loading/ws-loading-standard.gif';

  return (
    <div
      className={`fixed inset-0 z-[9999] overflow-hidden ${
        mode === 'light' ? 'bg-[#f5f0df]' : 'bg-[#031024]'
      }`}
      role="status"
      aria-live="polite"
      aria-label="Carregando o sistema"
    >
      <img
        src={source}
        alt=""
        aria-hidden="true"
        className="h-full w-full object-cover object-center"
        decoding="async"
        fetchPriority="high"
      />
      <span className="sr-only">Carregando o sistema...</span>
    </div>
  );
}
