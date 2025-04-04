import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, LogOut, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
interface Document {
  id: string;
  name: string;
  file_url: string;
  uploaded_at: string;
  original_filename?: string;
  size?: number;
  type?: string;
}
const ClientDashboard = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    user,
    userData,
    getUserDocuments,
    isAdmin
  } = useAuth();

  // Redirecionar administradores para o painel de administração
  useEffect(() => {
    if (user && isAdmin) {
      navigate("/admin", {
        replace: true
      });
    }
  }, [user, isAdmin, navigate]);
  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user]);
  const loadDocuments = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const {
        data,
        error
      } = await getUserDocuments(user.id);
      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar documentos:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar seus documentos.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/login");
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado da sua conta."
      });
    } catch (error: any) {
      console.error("Erro ao fazer logout:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao tentar sair.",
        variant: "destructive"
      });
    }
  };
  if (isLoading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
      </div>;
  }
  return <div className="min-h-screen bg-gray-950 flex flex-col">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gold">oi
        </h1>
          <Button onClick={handleLogout} variant="outline" className="border-gold text-gold hover:bg-gold hover:text-navy flex items-center gap-2">
            <LogOut size={16} />
            Sair
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <Card className="bg-gray-900 border-gray-800 mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-white">Perfil</CardTitle>
                <CardDescription className="text-gray-400">
                  Suas informações pessoais
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Nome</p>
                    <p className="text-lg font-medium text-white">{userData?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="text-lg font-medium text-white">{user?.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="md:col-span-2">
            <Card className="bg-gray-900 border-gray-800 h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-white flex items-center">
                  <FileText className="mr-2 h-5 w-5 text-gold" />
                  Meus Documentos
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Documentos disponíveis em sua conta
                </CardDescription>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? <div className="text-center py-12 text-gray-500">
                    <FileText className="mx-auto h-12 w-12 mb-3 opacity-30" />
                    <p className="text-lg">Nenhum documento disponível</p>
                    <p className="text-sm mt-1">Os documentos compartilhados pelo administrador aparecerão aqui</p>
                  </div> : <div className="divide-y divide-gray-800">
                    {documents.map(doc => <div key={doc.id} className="py-4 flex items-center">
                        <div className="bg-gray-800 p-2 rounded mr-4">
                          <FileText className="h-8 w-8 text-gold" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-white">{doc.name}</p>
                          <p className="text-xs text-gray-400">
                            Enviado em {format(new Date(doc.uploaded_at), 'dd/MM/yyyy HH:mm')}
                          </p>
                        </div>
                        <div>
                          <Button variant="ghost" size="sm" className="text-gold hover:text-gold-light" asChild>
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </a>
                          </Button>
                        </div>
                      </div>)}
                  </div>}
              </CardContent>
              <CardFooter className="border-t border-gray-800 bg-gray-900/50 mt-auto">
                <p className="text-xs text-gray-500">
                  Total de documentos: {documents.length}
                </p>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>;
};
export default ClientDashboard;