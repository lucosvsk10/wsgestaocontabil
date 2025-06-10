
import { Users } from "lucide-react";
import AddClientDialog from "./AddClientDialog";

interface CarouselHeaderProps {
  clientsCount: number;
  onAddClient: (clientData: {
    name: string;
    logo_url: string;
    instagram_url: string;
    whatsapp_url: string;
  }) => boolean;
}

const CarouselHeader = ({ clientsCount, onAddClient }: CarouselHeaderProps) => {
  return (
    <>
      {/* Header Section */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-[#efc349] mr-3" />
          <h1 className="text-4xl font-extralight text-[#020817] dark:text-[#efc349]">
            Gerenciar Carousel
          </h1>
        </div>
        <p className="text-lg text-gray-600 dark:text-white/70 font-extralight max-w-2xl mx-auto">
          Adicione, edite ou remova clientes do carousel da página inicial. Gerencie as logos, links sociais e status de exibição de cada empresa parceira.
        </p>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl text-[#020817] dark:text-[#efc349] mb-2 font-thin">
            Lista de Clientes
          </h2>
          <p className="text-gray-600 dark:text-white/70">
            {clientsCount} {clientsCount === 1 ? 'cliente cadastrado' : 'clientes cadastrados'}
          </p>
        </div>

        <AddClientDialog onAddClient={onAddClient} />
      </div>
    </>
  );
};

export default CarouselHeader;
