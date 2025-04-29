
import React from 'react';

interface ErrorStateProps {
  error: string;
}

const ErrorState = ({ error }: ErrorStateProps) => {
  return (
    <section id="noticias" className="py-8 md:py-16 bg-navy-light">
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="text-2xl md:text-3xl font-anton text-navy-light dark:text-gold text-center mb-8">
          {error}
        </h2>
      </div>
    </section>
  );
};

export default ErrorState;
