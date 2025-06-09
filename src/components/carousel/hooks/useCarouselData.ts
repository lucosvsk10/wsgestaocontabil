
import { useState, useEffect } from "react";
import { ClientItem } from "../types";

export const useCarouselData = () => {
  const [clients, setClients] = useState<ClientItem[]>([]);

  useEffect(() => {
    // Carregar clientes do localStorage
    const loadClients = () => {
      const stored = localStorage.getItem('carousel_clients');
      if (stored) {
        const allClients = JSON.parse(stored);
        const activeClients = allClients.filter((client: ClientItem) => client.active);
        setClients(activeClients);
      } else {
        // Dados padrão se não houver no localStorage
        setClients([{
          id: "1",
          name: "Empresa Exemplo 1",
          logo_url: "/lovable-uploads/cb878201-552e-4728-a814-1554857917b4.png",
          instagram_url: "https://instagram.com/empresa1",
          whatsapp_url: "https://wa.me/5511999999999",
          order_index: 0,
          active: true
        }, {
          id: "2",
          name: "Empresa Exemplo 2",
          logo_url: "/lovable-uploads/cb878201-552e-4728-a814-1554857917b4.png",
          instagram_url: "https://instagram.com/empresa2",
          order_index: 1,
          active: true
        }, {
          id: "3",
          name: "Empresa Exemplo 3",
          logo_url: "/lovable-uploads/cb878201-552e-4728-a814-1554857917b4.png",
          whatsapp_url: "https://wa.me/5511888888888",
          order_index: 2,
          active: true
        }, {
          id: "4",
          name: "Empresa Exemplo 4",
          logo_url: "/lovable-uploads/cb878201-552e-4728-a814-1554857917b4.png",
          instagram_url: "https://instagram.com/empresa4",
          whatsapp_url: "https://wa.me/5511777777777",
          order_index: 3,
          active: true
        }, {
          id: "5",
          name: "Empresa Exemplo 5",
          logo_url: "/lovable-uploads/cb878201-552e-4728-a814-1554857917b4.png",
          order_index: 4,
          active: true
        }, {
          id: "6",
          name: "Empresa Exemplo 6",
          logo_url: "/lovable-uploads/cb878201-552e-4728-a814-1554857917b4.png",
          instagram_url: "https://instagram.com/empresa6",
          order_index: 5,
          active: true
        }]);
      }
    };

    loadClients();

    // Listener para mudanças no localStorage
    const handleStorageChange = () => {
      loadClients();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return { clients };
};
