import { useEffect, useRef } from 'react';
import { Building2, MapPin, Play, Route } from 'lucide-react';

const locations = [
  {
    label: 'Sede',
    city: 'Palmeira dos Índios — AL',
    description: 'Sede da WS Gestão Contábil e uma das bases de atendimento presencial às empresas da região.',
    mapHref: 'https://maps.app.goo.gl/nCabkeuY39TkrYv59',
    embed: 'https://www.google.com/maps?q=Av.%20Muniz%20Falc%C3%A3o%2C%20391%2C%20Sala%2012%2C%20S%C3%A3o%20Crist%C3%B3v%C3%A3o%2C%20Palmeira%20dos%20%C3%8Dndios%2C%20AL&output=embed',
  },
  {
    label: 'Filial',
    city: 'Major Isidoro — AL',
    description: 'Unidade de atendimento da WS para acompanhar de perto empresas de Major Isidoro e região.',
    mapHref: 'https://maps.app.goo.gl/cthtEGbJGqGBTVVo9',
    embed: 'https://www.google.com/maps?q=Loteamento%20Terra%20do%20Leite%2C%2029%2C%20Centro%2C%20Major%20Isidoro%2C%20AL&output=embed',
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
};

export default OfficeExperienceSection;
