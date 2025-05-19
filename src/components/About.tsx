import { useEffect, useRef } from 'react';
import { Check, Clock, Award, BarChart } from 'lucide-react';
const services = [{
  title: "Contabilidade Empresarial",
  description: "Registros contábeis de acordo com a legislação vigente e emissão de demonstrações financeiras.",
  icon: <BarChart className="w-10 h-10 text-gold" />
}, {
  title: "Consultoria Fiscal",
  description: "Análise e planejamento tributário para sua empresa otimizar custos e estar em conformidade com a legislação.",
  icon: <Award className="w-10 h-10 text-gold" />
}, {
  title: "Departamento Pessoal",
  description: "Gerenciamento de obrigações trabalhistas, folha de pagamento e processos de admissão e demissão.",
  icon: <Check className="w-10 h-10 text-gold" />
}, {
  title: "Assessoria Empresarial",
  description: "Suporte completo para abertura, alterações e encerramento de empresas junto aos órgãos competentes.",
  icon: <Clock className="w-10 h-10 text-gold" />
}];
const About = () => {
  const serviceRefs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, index * 100);
        }
      });
    }, {
      threshold: 0.1
    });
    serviceRefs.current.forEach(ref => {
      if (ref) observer.observe(ref);
    });
    return () => {
      serviceRefs.current.forEach(ref => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, []);
  return <>
      <section id="servicos" className="py-20 bg-orange-200 dark:bg-navy-dark">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl text-navy-light dark:text-gold mb-4 font-light md:text-4xl">Nossos Serviços</h2>
            <p className="text-navy dark:text-white/80 max-w-2xl mx-auto">
              Oferecemos soluções contábeis completas para sua empresa, com um atendimento personalizado e focado em resultados.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service, index) => <div key={index} ref={el => serviceRefs.current[index] = el} className="backdrop-blur-sm border border-gold/20 rounded-xl p-6 transition-all duration-500 fadein-on-scroll bg-transparent">
                <div className="mb-4">{service.icon}</div>
                <h3 className="text-xl font-semibold text-navy dark:text-white mb-3">{service.title}</h3>
                <p className="text-navy/70 dark:text-white/70">{service.description}</p>
              </div>)}
          </div>
        </div>
      </section>

      <section id="sobre" className="py-20 bg-orange-200 dark:bg-navy-dark">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="w-full md:w-1/2">
              <h2 className="text-3xl md:text-4xl text-navy-light dark:text-gold mb-6 font-light">Sobre Nós</h2>
              <div className="space-y-4 text-navy dark:text-white/80">
                <p>
                  A WS Gestão Contábil é uma empresa especializada em serviços contábeis, fiscais e empresariais, 
                  com mais de 15 anos de experiência no mercado.
                </p>
                <p>
                  Nossa equipe é formada por profissionais altamente qualificados, comprometidos em oferecer 
                  um atendimento personalizado e de excelência para cada cliente.
                </p>
                <p>
                  Nosso compromisso é proporcionar soluções contábeis eficientes e seguras, ajudando sua empresa 
                  a crescer de forma sustentável e em conformidade com a legislação.
                </p>
              </div>
            </div>
            
            <div className="w-full md:w-1/2 flex justify-center">
              <div className="relative max-w-md">
                <div className="aspect-w-16 aspect-h-9 rounded-xl overflow-hidden border-2 border-gold/30 shadow-lg">
                  <div className="w-full h-full bg-white/50 dark:bg-navy-dark flex items-center justify-center">
                    <div className="text-center p-8">
                      <h3 className="text-2xl font-bold text-navy-light dark:text-gold mb-4">Nossa Missão</h3>
                      <p className="text-navy dark:text-white/80">
                        Oferecer serviços contábeis de alta qualidade, contribuindo para o sucesso e crescimento 
                        de nossos clientes através de um atendimento personalizado e soluções eficientes.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>;
};
export default About;