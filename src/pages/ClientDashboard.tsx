
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Upload, File, FileX, Send, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

// Mock authentication - In a real app, use a proper auth system
const isAuthenticated = () => {
  return localStorage.getItem("clientAuth") === "true";
};

const logout = () => {
  localStorage.removeItem("clientAuth");
  window.location.href = "/";
};

const ClientDashboard = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  // If not authenticated, redirect to home
  if (!isAuthenticated()) {
    return <Navigate to="/" />;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileArray = Array.from(e.target.files);
      setFiles((prevFiles) => [...prevFiles, ...fileArray]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    setIsUploading(true);
    // Simulate upload
    setTimeout(() => {
      toast({
        title: "Documentos enviados com sucesso!",
        description: "Seu contador será notificado sobre os novos documentos.",
      });
      setFiles([]);
      setIsUploading(false);
    }, 2000);
  };

  const handleMessageSend = () => {
    if (message.trim()) {
      toast({
        title: "Mensagem enviada",
        description: "Seu contador responderá em breve.",
      });
      setMessage("");
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="bg-[#37353d] py-4 shadow-md">
        <div className="container mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <img
              src="/lovable-uploads/fecb5c37-c321-44e3-89ca-58de7e59e59d.png"
              alt="WS Gestão Contábil Logo"
              className="h-8 w-auto"
            />
            <h1 className="text-xl font-semibold text-gold">Área do Cliente</h1>
          </div>
          <Button
            variant="ghost"
            className="text-gold hover:text-gold-light flex items-center gap-2"
            onClick={logout}
          >
            <LogOut size={18} /> Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="md:col-span-2 bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-gold flex items-center gap-2">
                <Upload size={20} /> Upload de Documentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-gold transition-colors">
                  <Input
                    type="file"
                    multiple
                    className="hidden"
                    id="file-upload"
                    onChange={handleFileChange}
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center justify-center"
                  >
                    <Upload className="h-12 w-12 text-gray-500 mb-2" />
                    <p className="text-sm text-gray-400">
                      Clique para selecionar ou arraste seus arquivos aqui
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF, JPG, PNG (max. 10MB)
                    </p>
                  </label>
                </div>
              </div>

              {files.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Arquivos selecionados:</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-gray-800 p-3 rounded-md"
                      >
                        <div className="flex items-center">
                          <File className="h-5 w-5 text-blue-400 mr-2" />
                          <span className="text-sm truncate max-w-[200px]">
                            {file.name}
                          </span>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-gray-400 hover:text-red-400"
                        >
                          <FileX size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                className="bg-gold hover:bg-gold-light text-navy w-full"
                disabled={files.length === 0 || isUploading}
                onClick={handleUpload}
              >
                {isUploading ? "Enviando..." : "Enviar Documentos"}
              </Button>
            </CardFooter>
          </Card>

          <div className="space-y-6">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-gold">Mensagem para o Contador</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Digite sua mensagem..."
                  className="bg-gray-800 border-gray-700"
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full border-gold text-gold hover:bg-gold hover:text-navy"
                  onClick={handleMessageSend}
                >
                  <Send size={16} className="mr-2" /> Enviar Mensagem
                </Button>
              </CardFooter>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-gold">Links Úteis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <a
                  href="https://www.gov.br/receitafederal/pt-br"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline block"
                >
                  Receita Federal
                </a>
                <a
                  href="https://www.gov.br/empresas-e-negocios/pt-br/empreendedor"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline block"
                >
                  Portal do Empreendedor
                </a>
                <a
                  href="https://www.gov.br/pt-br/servicos/solicitar-simplificacao-da-legislacao"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline block"
                >
                  Simples Nacional
                </a>
              </CardContent>
            </Card>

            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full bg-gold hover:bg-gold-light text-navy">
                  Solicitar Novo Serviço
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 text-gray-100 border-gray-800">
                <DialogHeader>
                  <DialogTitle className="text-gold">Solicitar Novo Serviço</DialogTitle>
                  <DialogDescription>
                    Descreva o serviço que você precisa. Entraremos em contato em breve.
                  </DialogDescription>
                </DialogHeader>
                <Textarea
                  placeholder="Descreva o serviço desejado..."
                  className="bg-gray-800 border-gray-700"
                />
                <DialogFooter>
                  <Button
                    type="submit"
                    className="bg-gold hover:bg-gold-light text-navy"
                    onClick={() => {
                      toast({
                        title: "Solicitação enviada",
                        description: "Entraremos em contato em breve.",
                      });
                    }}
                  >
                    Enviar Solicitação
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ClientDashboard;
