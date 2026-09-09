import { Building2, MapPin, Play, Route } from 'lucide-react';

const locations = [
  {
    label: 'Sede',
    city: 'Major Isidoro — AL',
    description: 'Atendimento presencial e operação central da WS Gestão Contábil.',
    mapHref: 'https://maps.app.goo.gl/cthtEGbJGqGBTVVo9',
    embed: 'https://www.google.com/maps?q=WS%20Gest%C3%A3o%20Cont%C3%A1bil%20Major%20Isidoro%20AL&output=embed',
  },
  {
    label: 'Filial',
    city: 'Palmeira dos Índios — AL',
    description: 'Uma segunda base para aproximar o atendimento das empresas da região.',
    mapHref: 'https://maps.app.goo.gl/nCabkeuY39TkrYv59',
    embed: 'https://www.google.com/maps?q=WS%20Gest%C3%A3o%20Cont%C3%A1bil%20Palmeira%20dos%20%C3%8Dndios%20AL&output=embed',
  },
];

const OfficeExperienceSection = () => (
  <section id="escritorio" className="public-office preview-section" aria-labelledby="office-title">
    <div className="public-office-intro">
      <div className="public-section-heading">
        <span>ESTRUTURA REAL, ATENDIMENTO PRÓXIMO</span>
        <h2 id="office-title">CONHEÇA A WS<br />POR DENTRO</h2>
        <p>Depois dos serviços e softwares, vale mostrar o que existe por trás deles: equipe, rotina e uma estrutura física preparada para atender empresas de forma presencial e digital.</p>
      </div>
      <div className="public-office-facts" aria-label="Sobre a estrutura da WS">
        <div><Building2 /><strong>2 unidades</strong><span>Sede e filial em Alagoas</span></div>
        <div><MapPin /><strong>Atendimento híbrido</strong><span>Presencial e digital</span></div>
      </div>
    </div>

    <div className="public-office-video-wrap">
      <video className="public-office-video" src="/assets/ws-escritorio-tour.mp4" poster="/assets/ws-escritorio-poster.jpg" controls playsInline preload="metadata" aria-label="Vídeo do escritório da WS Gestão Contábil" />
      <div className="public-office-video-caption"><span><Play /> VISITA RÁPIDA</span><strong>Um pouco do nosso escritório.</strong></div>
    </div>

    <div className="public-location-grid">
      {locations.map((location) => (
        <article className="public-location-card" key={location.label}>
          <div className="public-location-copy">
            <span>{location.label}</span>
            <h3>{location.city}</h3>
            <p>{location.description}</p>
            <a href={location.mapHref} target="_blank" rel="noreferrer">Traçar rota <Route /></a>
          </div>
          <div className="public-location-map">
            <iframe title={`Mapa da ${location.label} da WS em ${location.city}`} src={location.embed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
          </div>
        </article>
      ))}
    </div>
  </section>
);

export default OfficeExperienceSection;
