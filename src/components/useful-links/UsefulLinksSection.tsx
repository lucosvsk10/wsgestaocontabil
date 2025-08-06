import React from "react";
import { motion } from "framer-motion";
import { ExternalLink, FileText, Shield, Scale, Building2, CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface UsefulLink {
  id: number;
  title: string;
  description: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

const usefulLinks: UsefulLink[] = [
  {
    id: 1,
    title: "Receita Federal",
    description: "Certidão Negativa de Débitos - Pessoa Jurídica",
    url: "https://solucoes.receita.fazenda.gov.br/Servicos/certidaointernet/PJ/Emitir",
    icon: FileText
  },
  {
    id: 2,
    title: "SEFAZ Alagoas",
    description: "Certidão Negativa de Débitos Estaduais",
    url: "https://contribuinte.sefaz.al.gov.br/certidao/#/emitircertidao",
    icon: Shield
  },
  {
    id: 3,
    title: "TST",
    description: "Certidão Negativa de Débitos Trabalhistas",
    url: "https://cndt-certidao.tst.jus.br/inicio.faces",
    icon: Scale
  },
  {
    id: 4,
    title: "CAIXA",
    description: "Consulta CRF - Certificado de Regularidade do FGTS",
    url: "https://consulta-crf.caixa.gov.br/consultacrf/pages/consultaEmpregador.jsf",
    icon: Building2
  },
  {
    id: 5,
    title: "TJ Alagoas",
    description: "Tribunal de Justiça - Sistema de Cadastro",
    url: "https://www2.tjal.jus.br/sco/abrirCadastro.do",
    icon: CreditCard
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      staggerChildren: 0.1 
    } 
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.5
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      duration: 0.6 
    }
  }
};

const UsefulLinksSection = React.memo(() => {
  return (
    <section className="relative w-full py-24 bg-[#FFF1DE] dark:bg-[#020817]" id="links-uteis">
      <div className="container mx-auto px-4">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={containerVariants}
          className="text-center mb-16"
        >
          <motion.div variants={itemVariants} className="mb-8">
            <span className="inline-block px-4 py-2 bg-[#efc349]/10 border border-[#efc349]/20 rounded-full text-[#efc349] text-sm font-extralight mb-4">
              Acesso Rápido
            </span>
            <h2 className="text-4xl lg:text-5xl font-extralight text-[#020817] dark:text-white mb-6 leading-tight">
              Links <span className="text-[#efc349]">Úteis</span>
            </h2>
            <p className="text-[#020817]/70 dark:text-white/70 font-extralight max-w-3xl mx-auto leading-relaxed text-lg">
              Acesse diretamente os principais órgãos para emissão de certidões e consultas empresariais
            </p>
          </motion.div>
        </motion.div>

        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto"
        >
          {usefulLinks.map((link) => {
            const IconComponent = link.icon;
            return (
              <motion.div key={link.id} variants={cardVariants}>
                <Card className="group h-full border-[#efc349]/20 bg-white/50 dark:bg-[#0b1320]/50 backdrop-blur-sm hover:border-[#efc349]/60 hover:bg-white/80 dark:hover:bg-[#0b1320]/80 transition-all duration-500 hover:shadow-lg hover:shadow-[#efc349]/10 cursor-pointer">
                  <CardContent className="p-6 h-full flex flex-col">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="p-3 bg-[#efc349]/10 rounded-lg group-hover:bg-[#efc349]/20 transition-colors duration-300">
                        <IconComponent className="h-6 w-6 text-[#efc349]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-extralight text-[#020817] dark:text-white mb-2 group-hover:text-[#efc349] transition-colors duration-300">
                          {link.title}
                        </h3>
                        <p className="text-sm text-[#020817]/70 dark:text-white/70 font-extralight leading-relaxed">
                          {link.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-auto pt-4">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-[#efc349] hover:text-[#efc349]/80 font-extralight text-sm transition-all duration-300 group-hover:gap-3"
                      >
                        Acessar Site
                        <ExternalLink className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
});

UsefulLinksSection.displayName = "UsefulLinksSection";

export default UsefulLinksSection;