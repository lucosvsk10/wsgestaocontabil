import { ArrowUpRight } from 'lucide-react';
import { useCarouselData } from '@/components/carousel/hooks/useCarouselData';

const TrustedCompaniesSection = () => {
  const { clients, loading } = useCarouselData();
  const visibleClients = clients.slice(0, 16);
  const rowA = visibleClients.filter((_, index) => index % 2 === 0);
  const rowB = visibleClients.filter((_, index) => index % 2 !== 0);

  if (!loading && visibleClients.length === 0) return null;

  const renderClient = (client: (typeof visibleClients)[number], clone = false) => (
    <a
      key={`${clone ? 'clone-' : ''}${client.id}`}
      href={client.instagram_url || client.whatsapp_url || '#empresas'}
      target={client.instagram_url || client.whatsapp_url ? '_blank' : undefined}
      rel="noreferrer"
      className="public-client-logo"
      aria-label={clone ? undefined : client.name}
      aria-hidden={clone || undefined}
      tabIndex={clone ? -1 : undefined}
    >
      <img src={client.logo_url} alt={clone ? '' : client.name} loading="lazy" />
    </a>
  );

  return (
    <section id="empresas" className="public-trust preview-section" aria-labelledby="trust-title">
      <div className="public-trust-copy">
        <div className="public-section-heading">
          <span>EMPRESAS REAIS. RELAÇÕES QUE PERMANECEM.</span>
          <h2 id="trust-title">QUEM CONFIA<br />NA WS</h2>
          <p>Uma carteira formada por empresas de segmentos diferentes, apresentadas com o mesmo cuidado visual — sem transformar a confiança dos clientes em uma faixa genérica de logos.</p>
        </div>
        <a className="public-trust-link" href="https://www.instagram.com/wscontabil.co/" target="_blank" rel="noreferrer">Conhecer a WS de perto <ArrowUpRight /></a>
      </div>

      <div className="public-logo-stage" aria-label="Empresas atendidas pela WS Gestão Contábil">
        <span className="public-logo-stage-label">CLIENTES WS</span>
        {loading ? (
          <div className="public-logo-loading">{Array.from({ length: 8 }).map((_, index) => <span className="public-logo-skeleton" key={index} />)}</div>
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
        <div className="public-logo-stage-foot"><strong>{visibleClients.length || '—'}</strong><span>marcas em destaque nesta seleção</span></div>
      </div>
    </section>
  );
};

export default TrustedCompaniesSection;
