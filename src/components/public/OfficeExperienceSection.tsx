import { useEffect, useRef } from 'react';
import { Building2, Clock3, MapPin, Phone, Play, Route } from 'lucide-react';

const locations = [
  {
    label: 'Sede',
    city: 'Palmeira dos Índios — AL',
    description: 'Sede da WS Gestão Contábil e uma das bases de atendimento presencial às empresas da região.',
    address: 'Av. Muniz Falcão, 391, Sala 12 — São Cristóvão',
    hours: 'Segunda a sexta, das 8h às 17h',
    phone: '(82) 99932-4884',
    mapHref: 'https://maps.app.goo.gl/nCabkeuY39TkrYv59',
    embed: 'https://www.google.com/maps?q=WS%20Gest%C3%A3o%20Cont%C3%A1bil%2C%20Av.%20Muniz%20Falc%C3%A3o%2C%20391%2C%20Palmeira%20dos%20%C3%8Dndios%2C%20AL&z=16&output=embed',
  },
  {
    label: 'Filial',
    city: 'Major Isidoro — AL',
    description: 'Unidade de atendimento da WS para acompanhar de perto empresas de Major Isidoro e região.',
    address: 'Loteamento Terra do Leite, 29, Quadra 1 — Centro',
    hours: 'Segunda a sexta, das 8h às 17h',
    phone: '(82) 99932-4884',
    mapHref: 'https://www.google.com/maps/place/WS+Gest%C3%A3o+Cont%C3%A1bil+-+Major+Izidoro/@-9.5364584,-36.9895467,17z/data=!4m5!3m4!1s0x70613612234834b:0xa437e6b9cead07b5!8m2!3d-9.5366347!4d-36.9929417',
    embed: 'https://www.google.com/maps?q=WS%20Gest%C3%A3o%20Cont%C3%A1bil%20-%20Major%20Izidoro&ll=-9.5366347,-36.9929417&z=17&output=embed',
  },
];

const OfficeExperienceSection = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    const startPlayback = () => {
      if (video.paused) void video.play().catch(() => undefined);
    };

    startPlayback();
    video.addEventListener('loadeddata', startPlayback);
    video.addEventListener('canplay', startPlayback);
    const retry = window.setTimeout(startPlayback, 350);
    const retryAgain = window.setTimeout(startPlayback, 1200);
    const handleVisibility = () => { if (document.visibilityState === 'visible') startPlayback(); };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearTimeout(retry);
      window.clearTimeout(retryAgain);
      video.removeEventListener('loadeddata', startPlayback);
      video.removeEventListener('canplay', startPlayback);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return (
    <section id="escritorio" className="public-office preview-section" aria-labelledby="office-title">
      <div className="public-office-intro">
        <div className="public-section-heading">
          <span>ESTRUTURA REAL, ATENDIMENTO PRÓXIMO</span>
          <h2 id="office-title">CONHEÇA A WS<br />POR DENTRO</h2>
          <p>Equipe, rotina e estrutura física para atender empresas de forma presencial e digital — com sede em Palmeira dos Índios e unidade em Major Isidoro.</p>
        </div>
        <div className="public-office-facts" aria-label="Sobre a estrutura da WS">
          <div><Building2 /><strong>2 unidades</strong><span>Palmeira dos Índios e Major Isidoro</span></div>
          <div><MapPin /><strong>Atendimento híbrido</strong><span>Presencial e digital</span></div>
        </div>
      </div>

      <div className="public-office-video-wrap">
        <video
          ref={videoRef}
          className="public-office-video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/assets/ws-escritorio-poster.webp"
          aria-label="Vídeo do escritório da WS Gestão Contábil"
          onCanPlay={(event) => void event.currentTarget.play().catch(() => undefined)}
        >
          <source src="/assets/ws-escritorio-tour-hq-web.mp4?v=2" type="video/mp4" />
        </video>
        <div className="public-office-video-caption"><span><Play /> VISITA RÁPIDA</span><strong>Veja de perto a estrutura da WS.</strong></div>
      </div>

      <div className="public-location-grid">
        {locations.map((location) => (
          <article className="public-location-card" key={location.label}>
            <div className="public-location-copy">
              <span>{location.label}</span>
              <h3>{location.city}</h3>
              <p>{location.description}</p>
              <div className="public-location-details">
                <div><MapPin /><span>{location.address}</span></div>
                <div><Clock3 /><span>{location.hours}</span></div>
                <div><Phone /><span>{location.phone}</span></div>
              </div>
              <a href={location.mapHref} target="_blank" rel="noreferrer">Ver local e traçar rota <Route /></a>
            </div>
            <div className="public-location-map">
              <iframe title={`Mapa da ${location.label} da WS em ${location.city}`} src={location.embed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default OfficeExperienceSection;
