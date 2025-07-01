import React from 'react';
import { Helmet } from 'react-helmet-async';

interface FiscalSEOProps {
  title: string;
  description: string;
  keywords?: string;
}

export const FiscalSEO: React.FC<FiscalSEOProps> = ({ title, description, keywords }) => {
  return (
    <Helmet>
      <title>{title} | WS Gestão Contábil</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta property="og:title" content={`${title} | WS Gestão Contábil`} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={`${title} | WS Gestão Contábil`} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
};