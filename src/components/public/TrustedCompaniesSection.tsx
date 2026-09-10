import { useCarouselData, type ClientItem } from '@/components/carousel/hooks/useCarouselData';

const fallbackClients: ClientItem[] = [
  { id:'85c0571f-d193-4c09-a145-0c2ecb0790b3', name:'REI DO AÇO', logo_url:'https://nadtoitgkukzbghtbohm.supabase.co/storage/v1/object/public/carousel-logos/logos/1749661878558.png', order_index:0, active:true },
  { id:'7d62e047-ecde-4ff1-8eb8-64c457da92d4', name:'ATELIÊ JULIANA FELIX', logo_url:'https://nadtoitgkukzbghtbohm.supabase.co/storage/v1/object/public/carousel-logos/logos/1749662075919.png', order_index:1, active:true },
  { id:'ce3343c2-f415-4920-914d-122b8b3da9fd', name:'RECANTO PERFUMADO', logo_url:'https://nadtoitgkukzbghtbohm.supabase.co/storage/v1/object/public/carousel-logos/logos/1749662213840.png', order_index:2, active:true },
  { id:'8539dc43-a651-49f6-bb04-013644ce74d5', name:'EMERSON AUTO PEÇAS', logo_url:'https://nadtoitgkukzbghtbohm.supabase.co/storage/v1/object/public/carousel-logos/logos/1749662332608.png', order_index:3, active:true },
  { id:'139447bc-28f3-4a69-a27c-ba0a13712128', name:'FRIGORÍFICO SANTO ANTÔNIO', logo_url:'https://nadtoitgkukzbghtbohm.supabase.co/storage/v1/object/public/carousel-logos/logos/1749662565673.png', order_index:4, active:true },
  { id:'8efb56fa-b55b-4746-9766-492c457f2f0f', name:'PIZZARIA DOIS IRMÃOS', logo_url:'https://nadtoitgkukzbghtbohm.supabase.co/storage/v1/object/public/carousel-logos/logos/1749662848763.png', order_index:5, active:true },
  { id:'f7abf715-2e5c-4745-ac62-2b2ef4d97f73', name:'AJLA QUÍMICA', logo_url:'https://nadtoitgkukzbghtbohm.supabase.co/storage/v1/object/public/carousel-logos/logos/1749662919435.png', order_index:6, active:true },
  { id:'1333bdaf-217b-4c5e-a6a8-1cac76421d18', name:'SERTÃO GÁS', logo_url:'https://nadtoitgkukzbghtbohm.supabase.co/storage/v1/object/public/carousel-logos/logos/1749662966981.png', order_index:7, active:true },
  { id:'a7811042-abc1-4471-9e8c-c4dc9d245897', name:'TOP AÇAÍ - MAJOR ISIDORO', logo_url:'https://nadtoitgkukzbghtbohm.supabase.co/storage/v1/object/public/carousel-logos/logos/1749663193732.png', order_index:8, active:true },
  { id:'ccc20fa4-76b1-4416-974a-ac03951522e0', name:'CONSTRUAGRO', logo_url:'https://nadtoitgkukzbghtbohm.supabase.co/storage/v1/object/public/carousel-logos/logos/1749663294676.png', order_index:9, active:true },
  { id:'0a6b5843-fdaf-4146-80b6-547650a71688', name:'DRINKS LL', logo_url:'https://nadtoitgkukzbghtbohm.supabase.co/storage/v1/object/public/carousel-logos/logos/1749663329276.png', order_index:10, active:true },
  { id:'6dc1ea0c-7c85-450f-bcd0-94ef3cf19c85', name:'BELLA VIDA CLUBE', logo_url:'https://nadtoitgkukzbghtbohm.supabase.co/storage/v1/object/public/carousel-logos/logos/1749663542333.png', order_index:11, active:true },
  { id:'4fb508d6-9e1e-4572-88aa-f9f02c125090', name:'VANIO VARIEDADES', logo_url:'https://nadtoitgkukzbghtbohm.supabase.co/storage/v1/object/public/carousel-logos/logos/1749663585301.png', order_index:12, active:true },
  { id:'1e5867f0-bc2a-423a-9a92-8c77a11fed81', name:'CENTRAL FARMA', logo_url:'https://nadtoitgkukzbghtbohm.supabase.co/storage/v1/object/public/carousel-logos/logos/1749663623485.png', order_index:13, active:true },
  { id:'1b660c04-910f-4898-8209-e5f473cab7ac', name:'TL AGRÍCOLA', logo_url:'https://nadtoitgkukzbghtbohm.supabase.co/storage/v1/object/public/carousel-logos/logos/1749734493685.png', order_index:14, active:true },
  { id:'887c92c3-fb08-43b9-9737-2e98a96c9aa5', name:'O N CONSTRUÇÕES', logo_url:'https://nadtoitgkukzbghtbohm.supabase.co/storage/v1/object/public/carousel-logos/logos/1750184487859.png', order_index:15, active:true },
  { id:'76e09cd9-ab1c-4e44-a629-36ed606f78e0', name:'FISIOYDLANY PILATES', logo_url:'https://nadtoitgkukzbghtbohm.supabase.co/storage/v1/object/public/carousel-logos/logos/1750185233108.png', order_index:16, active:true },
];

const TrustedCompaniesSection = () => {
  const { clients, loading } = useCarouselData();
  const visibleClients = (clients.length ? clients : fallbackClients).slice(0, 18);
  const rowA = visibleClients.filter((_, index) => index % 2 === 0);
  const rowB = visibleClients.filter((_, index) => index % 2 !== 0);

  const renderClient = (client: ClientItem, clone = false) => (
    <div key={`${clone ? 'clone-' : ''}${client.id}`} className="public-client-logo" aria-hidden={clone || undefined} title={clone ? undefined : client.name}>
      <img src={client.logo_url} alt={clone ? '' : client.name} loading="eager" decoding="async" draggable={false} />
    </div>
  );

  return (
    <section id="empresas" className="public-trust preview-section" aria-labelledby="trust-title">
      <div className="public-trust-head">
        <span>EMPRESAS QUE CAMINHAM COM A WS</span>
        <h2 id="trust-title">NOSSOS CLIENTES</h2>
        <p>Negócios de diferentes segmentos que confiam sua rotina contábil à WS.</p>
      </div>
      <div className="public-logo-stage" aria-label="Empresas atendidas pela WS Gestão Contábil">
        {loading && clients.length === 0 ? <div className="public-logo-loading">{Array.from({ length: 10 }).map((_, index) => <span className="public-logo-skeleton" key={index} />)}</div> : <>
          <div className="public-logo-marquee public-logo-marquee-a"><div className="public-logo-track">{rowA.map((client) => renderClient(client))}{rowA.map((client) => renderClient(client, true))}</div></div>
          <div className="public-logo-marquee public-logo-marquee-b"><div className="public-logo-track">{rowB.map((client) => renderClient(client))}{rowB.map((client) => renderClient(client, true))}</div></div>
        </>}
      </div>
      <p className="public-trust-note">17 marcas reais em destaque · passe o mouse para pausar</p>
    </section>
  );
};

export default TrustedCompaniesSection;
