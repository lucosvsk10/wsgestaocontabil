import { useCarouselData } from '@/components/carousel/hooks/useCarouselData';

const TrustedCompaniesSection = () => {
  const { clients, loading } = useCarouselData();
  const visibleClients = clients.slice(0, 18);
  const rowA = visibleClients.filter((_, index) => index % 2 === 0);
  const rowB = visibleClients.filter((_, index) => index % 2 !== 0);

  if (!loading && visibleClients.length === 0) return null;

  const renderClient = (client: (typeof visibleClients)[number], clone = false) => (
    <div
      key={`${clone ? 'clone-' : ''}${client.id}`}
      className="public-client-logo"
      aria-hidden={clone || undefined}
      title={clone ? undefined : client.name}
    >
      <img src={client.logo_url} alt={clone ? '' : client.name} loading="lazy" decoding="async" />
    </div>
  );

  return (
    <section id="empresas" className="public-trust preview-section" aria-labelledby="trust-title">
      <div className="public-trust-head">
        <span>EMPRESAS QUE CAMINHAM COM A WS</span>
        <h2 id="trust-title">NOSSOS CLIENTES</h2>
        <p>Empresas de diferentes segmentos que confiam sua rotina contábil à WS.</p>
      </div>

      <div className="public-logo-stage" aria-label="Empresas atendidas pela WS Gestão Contábil">
        {loading ? (
          <div className="public-logo-loading">{Array.from({ length: 10 }).map((_, index) => <span className="public-logo-skeleton" key={index} />)}</div>
        ) : (
          <>
            <div className="public-logo-marquee public-logo-marquee-a">
              <div className="public-logo-track">{rowA.map((client) => renderClient(client))}{rowA.map((client) => renderClient(client, true))}</div>
            </div>
            <div className="public-logo-marquee public-logo-marquee-b">
              <div className="public-logo-track">{rowB.map((client) => renderClient(client))}{rowB.map((client) => renderClient(client, true))}</div>
            </div>
          </>
        )}
      </div>
      <p className="public-trust-note">Marcas reais da carteira WS · passe o mouse para pausar</p>
    </section>
  );
};

export default TrustedCompaniesSection;
