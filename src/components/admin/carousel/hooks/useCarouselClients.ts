
import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

export interface ClientItem {
  id: string;
  name: string;
  logo_url: string;
  instagram_url?: string;
  whatsapp_url?: string;
  order_index: number;
  active: boolean;
}

export const useCarouselClients = () => {
  const { toast } = useToast();
  
  const [clients, setClients] = useState<ClientItem[]>(() => {
    const stored = localStorage.getItem('carousel_clients');
    return stored ? JSON.parse(stored) : [
      {
        id: "1",
        name: "Empresa Exemplo 1",
        logo_url: "/logo-padrao.png",
        instagram_url: "https://instagram.com/empresa1",
        whatsapp_url: "https://wa.me/5511999999999",
        order_index: 0,
        active: true
      },
      {
        id: "2", 
        name: "Empresa Exemplo 2",
        logo_url: "/logo-padrao.png",
        instagram_url: "https://instagram.com/empresa2",
        order_index: 1,
        active: true
      },
      {
        id: "3",
        name: "Empresa Exemplo 3", 
        logo_url: "/logo-padrao.png",
        whatsapp_url: "https://wa.me/5511888888888",
        order_index: 2,
        active: true
      }
    ];
  });

  const refreshClientsData = useCallback(() => {
    const stored = localStorage.getItem('carousel_clients');
    if (stored) {
      setClients(JSON.parse(stored));
    }
  }, []);

  const saveToLocalStorage = (clientsData: ClientItem[]) => {
    localStorage.setItem('carousel_clients', JSON.stringify(clientsData));
    setClients(clientsData);
    window.dispatchEvent(new Event('storage'));
  };

  const addClient = (clientData: Omit<ClientItem, 'id' | 'order_index' | 'active'>) => {
    if (!clientData.name) {
      toast({
        title: "Erro",
        description: "Nome da empresa é obrigatório",
        variant: "destructive"
      });
      return false;
    }

    const newClient: ClientItem = {
      id: Date.now().toString(),
      name: clientData.name,
      logo_url: clientData.logo_url || "/logo-padrao.png",
      instagram_url: clientData.instagram_url,
      whatsapp_url: clientData.whatsapp_url,
      order_index: clients.length,
      active: true
    };

    const updatedClients = [...clients, newClient];
    saveToLocalStorage(updatedClients);
    
    toast({
      title: "Sucesso",
      description: "Cliente adicionado ao carousel"
    });
    
    return true;
  };

  const updateClient = (clientId: string, clientData: Partial<ClientItem>) => {
    if (clientData.name === '') {
      toast({
        title: "Erro",
        description: "Nome da empresa é obrigatório",
        variant: "destructive"
      });
      return false;
    }

    const updatedClients = clients.map(client =>
      client.id === clientId
        ? { ...client, ...clientData }
        : client
    );

    saveToLocalStorage(updatedClients);
    
    toast({
      title: "Sucesso",
      description: "Cliente atualizado"
    });
    
    return true;
  };

  const deleteClient = (clientId: string) => {
    const updatedClients = clients.filter(client => client.id !== clientId);
    saveToLocalStorage(updatedClients);
    
    toast({
      title: "Sucesso",
      description: "Cliente removido do carousel"
    });
  };

  const toggleClientStatus = (clientId: string) => {
    const updatedClients = clients.map(client =>
      client.id === clientId ? { ...client, active: !client.active } : client
    );
    saveToLocalStorage(updatedClients);
  };

  const handleImageUpload = (url: string, clientId: string) => {
    const updatedClients = clients.map(client =>
      client.id === clientId ? { ...client, logo_url: url } : client
    );
    saveToLocalStorage(updatedClients);
    
    setTimeout(() => {
      refreshClientsData();
    }, 100);
  };

  const handleImageRemoval = (clientId: string) => {
    const updatedClients = clients.map(client =>
      client.id === clientId ? { ...client, logo_url: "/logo-padrao.png" } : client
    );
    saveToLocalStorage(updatedClients);
    
    setTimeout(() => {
      refreshClientsData();
    }, 100);
  };

  return {
    clients,
    addClient,
    updateClient,
    deleteClient,
    toggleClientStatus,
    handleImageUpload,
    handleImageRemoval,
    refreshClientsData
  };
};
