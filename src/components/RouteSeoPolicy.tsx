import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_URL = 'https://www.wsgestaocontabil.com';
const publicMetadata: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Contabilidade em Major Isidoro e Palmeira dos Índios | WS',
    description: 'Contabilidade para empresas em Major Isidoro, Palmeira dos Índios e região. Abertura de empresa, gestão fiscal, folha e planejamento tributário.',
  },
  '/guias': {
    title: 'Guias para abrir e administrar uma empresa | WS Gestão Contábil',
    description: 'Guias práticos sobre abertura de empresa, custos, fluxo de caixa e organização financeira para empreendedores e gestores.',
  },
};

const isPrivateOrUtilityRoute = (pathname: string) => (
  pathname === '/login'
  || pathname === '/dashboard'
  || pathname === '/changelog'
  || pathname === '/simulador-irpf'
  || pathname === '/calculadora-inss'
  || pathname === '/simulador-prolabore'
  || pathname === '/home-preview'
  || pathname.startsWith('/home-preview/')
  || pathname === '/nova-home'
  || pathname.startsWith('/admin')
  || pathname.startsWith('/app')
  || pathname.startsWith('/client')
  || pathname.startsWith('/checkout')
  || pathname.startsWith('/enquete/')
  || pathname.startsWith('/enquete-numerica/')
  || pathname.startsWith('/formulario/')
);

const upsertMeta = (name: string) => {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.name = name;
    document.head.appendChild(element);
  }
  return element;
};

const upsertCanonical = () => {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.rel = 'canonical';
    document.head.appendChild(element);
  }
  return element;
};

const RouteSeoPolicy = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const privateRoute = isPrivateOrUtilityRoute(pathname);
    upsertMeta('robots').content = privateRoute
      ? 'noindex, nofollow, noarchive'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

    if (privateRoute) {
      document.head.querySelector('link[rel="canonical"]')?.remove();
      return;
    }

    const normalizedPath = pathname === '/' ? '/' : pathname.replace(/\/$/, '');
    upsertCanonical().href = `${SITE_URL}${normalizedPath}`;
    const metadata = publicMetadata[normalizedPath];
    if (metadata) {
      document.title = metadata.title;
      upsertMeta('description').content = metadata.description;
    }
  }, [pathname]);

  return null;
};

export default RouteSeoPolicy;
