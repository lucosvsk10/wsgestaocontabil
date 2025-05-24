
import { useEffect, useRef, useState } from 'react';
import { Calculator, FileText, TrendingUp, Users, Building, Shield } from 'lucide-react';
import NewsCarousel from './NewsCarousel';
import { Button } from '@/components/ui/button';
import { sampleNews } from './accountingData';
import { NewsItem } from './types';

const AccountingSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [newsData, setNewsData] = useState<NewsItem[]>(sampleNews);
  const [isNewsLoading, setIsNewsLoading] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('opacity-100');
          entry.target.classList.remove('opacity-0', 'translate-y-10');
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  const refreshNews = () => {
    setIsNewsLoading(true);
    // Simulate API call delay
    setTimeout(() => {
      setNewsData([...sampleNews]);
      setIsNewsLoading(false);
    }, 1000);
  };

  const features = [
    {
      icon: <Calculator className="w-8 h-8 text-[#efc349]" />,
      title: "Planejamento Tributário",
      description: "Otimização fiscal personalizada para sua empresa"
    },
    {
      icon: <FileText className="w-8 h-8 text-[#efc349]" />,
      title: "Escrituração Contábil",
      description: "Registros precisos e conformes com a legislação"
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-[#efc349]" />,
      title: "Relatórios Gerenciais",
      description: "Análises detalhadas para tomada de decisão"
    },
    {
      icon: <Users className="w-8 h-8 text-[#efc349]" />,
      title: "Departamento Pessoal",
      description: "Gestão completa de recursos humanos"
    },
    {
      icon: <Building className="w-8 h-8 text-[#efc349]" />,
      title: "Abertura de Empresas",
      description: "Suporte completo para formalização"
    },
    {
      icon: <Shield className="w-8 h-8 text-[#efc349]" />,
      title: "Conformidade Legal",
      description: "Mantemos sua empresa sempre em dia"
    }
  ];

  return (
    <section id="contabil" className="py-20 bg-[#FFF1DE] dark:bg-deepNavy">
      <div className="container mx-auto px-6">
        <div 
          ref={sectionRef}
          className="transition-all duration-700 transform opacity-0 translate-y-10"
        >
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl text-[#020817] dark:text-gold mb-4 font-light">
              Mundo Contábil
            </h2>
            <p className="text-[#6b7280] dark:text-white/80 max-w-3xl mx-auto">
              Explore nosso universo de soluções contábeis especializadas, 
              desenvolvidas para impulsionar o crescimento sustentável do seu negócio.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-white dark:bg-deepNavy/60 border border-[#e6e6e6] dark:border-gold/30 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-[#020817] dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-[#6b7280] dark:text-white/70">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Call to Action */}
          <div className="bg-white dark:bg-deepNavy/60 border border-[#e6e6e6] dark:border-gold/30 rounded-xl p-8 text-center shadow-sm">
            <h3 className="text-2xl font-bold text-[#020817] dark:text-gold mb-4">
              Pronto para transformar sua gestão contábil?
            </h3>
            <p className="text-[#6b7280] dark:text-white/80 mb-6 max-w-2xl mx-auto">
              Entre em contato conosco e descubra como podemos ajudar sua empresa 
              a alcançar novos patamares de eficiência e conformidade.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                className="bg-[#020817] text-white hover:bg-[#0f172a] dark:bg-gold dark:text-deepNavy dark:hover:bg-gold/90"
                onClick={() => window.open('https://wa.me/5582999324884', '_blank')}
              >
                Fale Conosco
              </Button>
              <Button 
                variant="outline"
                className="border-[#e6e6e6] text-[#020817] hover:bg-gray-50 dark:border-gold/30 dark:text-gold dark:hover:bg-gold/10"
                onClick={() => window.open('https://g.co/kgs/d2UwXh3', '_blank')}
              >
                Saiba Mais
              </Button>
            </div>
          </div>

          {/* News Carousel */}
          <div className="mt-16">
            <NewsCarousel 
              newsData={newsData}
              isNewsLoading={isNewsLoading}
              refreshNews={refreshNews}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default AccountingSection;
