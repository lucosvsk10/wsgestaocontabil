import { useCarouselData } from '@/components/carousel/hooks/useCarouselData';

const TrustedCompaniesSection = () => {
  const { clients, loading } = useCarouselData();
  const visibleClients = clients.slice(0, 12);

  if (!loading && visibleClients.length === 0) return null;

  return (
    <section id="empresas" className="public-trust preview-section" aria-labelledby="trust-title">
      <div className="public-section-heading">
        <span>RELAÇÕES QUE PERMANECEM</span>
        <h2 id="trust-title">EMPRESAS QUE<br />CONFIAM NA WS</h2>
        <p>Parcerias construídas com proximidade, precisão e continuidade.</p>
      </div>
      <div className="public-logo-strip" aria-label="Empresas atendidas pela WS Gestão Contábil">
        {loading
          ? Array.from({ length: 6 }).map((_, index) => <span className="public-logo-skeleton" key={index} />)
          : visibleClients.map((client) => (
              <a key={client.id} href={client.instagram_url || client.whatsapp_url || '#empresas'} target={client.instagram_url || client.whatsapp_url ? '_blank' : undefined} rel="noreferrer" className="public-client-logo" aria-label={client.name}>
                <img src={client.logo_url} alt={client.name} loading="lazy" />
              </a>
            ))}
      </div>
    </section>
  );
};

export default TrustedCompaniesSection;
