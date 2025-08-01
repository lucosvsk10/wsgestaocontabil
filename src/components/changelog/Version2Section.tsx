
const Version2Section = () => {
  return (
    <div className="mb-16">
      <h2 className="text-3xl font-bold text-[#020817] dark:text-[#efc349] mb-6 border-b-2 border-[#efc349] pb-2">
        LOG - V.2.0.0
      </h2>
      
      <h3 className="text-xl font-semibold text-[#020817] dark:text-white mb-4">
        Log de Alterações
      </h3>

      {/* Section 1 */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-[#020817] dark:text-[#efc349] mb-3">
          1. Identidade Visual e Tema
        </h4>
        
        <div className="space-y-4 text-gray-700 dark:text-gray-300">
          <div>
            <h5 className="font-medium text-[#020817] dark:text-white mb-2">
              Atualização das Cores e Tipografia:
            </h5>
            <div className="ml-4 space-y-2">
              <p>Modo claro padronizado com as cores:</p>
              <ul className="ml-4 space-y-1">
                <li>• Amarelo: #efc349</li>
                <li>• Preto Escuro: #222222</li>
                <li>• Cinza Claro: #d9d9d9</li>
              </ul>
              <p>Modo escuro revisado com fundo fixo #020817, bordas finas douradas, tipografia extraleve e textos em branco e gray-400.</p>
            </div>
          </div>

          <div>
            <h5 className="font-medium text-[#020817] dark:text-white mb-2">
              Ajuste de Responsividade:
            </h5>
            <p className="ml-4">
              Refinamento do layout responsivo no cliente, garantindo que os documentos, comunicados e demais seções reajam corretamente a diferentes tamanhos de tela.
            </p>
          </div>

          <div>
            <h5 className="font-medium text-[#020817] dark:text-white mb-2">
              Menu do Cliente:
            </h5>
            <p className="ml-4">
              Atualização do menu "Conta" para exibição mais sofisticada (com avatar, nome, opções de "Minha Área", "Configurações" e "Sair") com animações suaves e estilo condizente com o design WS.
            </p>
          </div>
        </div>
      </div>

      {/* Section 2 */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-[#020817] dark:text-[#efc349] mb-3">
          2. Funcionalidades Administrativas e de Usuário
        </h4>
        
        <div className="space-y-4 text-gray-700 dark:text-gray-300">
          <div>
            <h5 className="font-medium text-[#020817] dark:text-white mb-2">
              Simulações Financeiras:
            </h5>
            <div className="ml-4 space-y-2">
              <div>
                <p className="font-medium">IRPF:</p>
                <p className="ml-4">Sistema de simulações funcionando corretamente (salvamento, exibição e exclusão de dados).</p>
              </div>
              <div>
                <p className="font-medium">INSS e Pró-labore:</p>
                <p className="ml-4">Criação de duas novas tabelas no Supabase para armazenar simulações de INSS e Pró-labore, com políticas RLS específicas para cada uma.</p>
              </div>
            </div>
          </div>

          <div>
            <h5 className="font-medium text-[#020817] dark:text-white mb-2">
              Exibição no Admin:
            </h5>
            <p className="ml-4">
              Ajuste para que a aba /admin/simulations exiba todas as simulações (das três calculadoras) sem restrição – permitindo que administradores visualizem, editem ou excluam registros.
            </p>
          </div>

          <div>
            <h5 className="font-medium text-[#020817] dark:text-white mb-2">
              Dados da Empresa:
            </h5>
            <p className="ml-4">
              Integração com a Receita Federal (usando APIs como BrasilAPI ou ReceitaWS) para auto-preenchimento dos campos na aba /admin/company-data.
            </p>
            <p className="ml-4">
              Os dados são exibidos em modo somente leitura para o cliente, com os campos estratégicos restritos apenas para administradores.
            </p>
          </div>

          <div>
            <h5 className="font-medium text-[#020817] dark:text-white mb-2">
              Cadastro de Usuários:
            </h5>
            <p className="ml-4">
              Correção dos erros de criação e exclusão de usuários (mensagens de sucesso foram exibidas, mas os registros não eram efetivamente modificados).
            </p>
            <p className="ml-4">
              Ajuste no armazenamento do display_name para garantir que o nome dos clientes seja gravado e exibido corretamente.
            </p>
          </div>
        </div>
      </div>

      {/* Section 3 */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-[#020817] dark:text-[#efc349] mb-3">
          3. Documentos e Expiração
        </h4>
        
        <div className="space-y-4 text-gray-700 dark:text-gray-300">
          <div>
            <h5 className="font-medium text-[#020817] dark:text-white mb-2">
              Visualização dos Documentos:
            </h5>
            <p className="ml-4">
              Ajuste nos cards de documentos para evitar estouro de layout: aplicação de classes CSS como break-words e melhoria no espaçamento e responsividade.
            </p>
            <p className="ml-4">
              Implementação de estilos que garantem que o texto não ultrapasse os limites do card, com opção de exibir "VER MAIS" para longas descrições.
            </p>
          </div>

          <div>
            <h5 className="font-medium text-[#020817] dark:text-white mb-2">
              Expiração de Documentos:
            </h5>
            <p className="ml-4">
              Implementação de lógica para que, após a data de expiração, o documento apareça para o cliente com opacidade reduzida e o botão "Baixar" substituído por "Expirado".
            </p>
            <p className="ml-4">
              Para o administrador, os documentos continuam acessíveis normalmente.
            </p>
            <p className="ml-4">
              Agendamento (através de Edge Functions ou triggers) para exclusão automática dos documentos 7 dias após a expiração.
            </p>
          </div>
        </div>
      </div>

      {/* Section 4 */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-[#020817] dark:text-[#efc349] mb-3">
          4. Carrossel de Clientes
        </h4>
        
        <div className="space-y-4 text-gray-700 dark:text-gray-300">
          <div>
            <h5 className="font-medium text-[#020817] dark:text-white mb-2">
              Upload e Gerenciamento de Logos:
            </h5>
            <p className="ml-4">Criação de um sistema de upload de logos na aba /admin/carousel que:</p>
            <ul className="ml-8 space-y-1">
              <li>• Gera nomes únicos (usando UUIDs ou timestamps) para evitar sobrescrita de arquivos.</li>
              <li>• Salva as logos no Supabase Storage e armazena a URL pública no banco de dados.</li>
            </ul>
          </div>

          <div>
            <h5 className="font-medium text-[#020817] dark:text-white mb-2">
              Interface do Carrossel no Admin:
            </h5>
            <p className="ml-4">Reformulação completa para que o carrossel exiba apenas registros reais (sem dummy data tipo "empresa1") e permita:</p>
            <ul className="ml-8 space-y-1">
              <li>• Visualização das logos enviadas, com botões para editar ou deletar.</li>
              <li>• Seleção de logos e cadastro dos blocos que irão ser exibidos na página principal.</li>
              <li>• Manutenção do design atual do carrossel na página principal (sem alterações visuais fora da área administrativa).</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Section 5 */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-[#020817] dark:text-[#efc349] mb-3">
          5. Outras Melhorias e Correções Gerais
        </h4>
        
        <div className="space-y-4 text-gray-700 dark:text-gray-300">
          <div>
            <h5 className="font-medium text-[#020817] dark:text-white mb-2">
              Zoom e Modo Escuro por Padrão:
            </h5>
            <p className="ml-4">
              Implementação de ajustes para que o site seja exibido com "zoom" simulado em 80% por meio de CSS (transform: scale(0.8) ou configuração similar) – sem afetar a usabilidade.
            </p>
            <p className="ml-4">
              Forçar o modo escuro como padrão no primeiro acesso, com suporte para a troca via UI e armazenamento de preferência em localStorage.
            </p>
          </div>

          <div>
            <h5 className="font-medium text-[#020817] dark:text-white mb-2">
              Correção de Notificações:
            </h5>
            <p className="ml-4">
              Ajustes no sistema de notificações para que os clientes recebam avisos sobre novos documentos de maneira consistente.
            </p>
          </div>

          <div>
            <h5 className="font-medium text-[#020817] dark:text-white mb-2">
              Geral:
            </h5>
            <p className="ml-4">
              Vários ajustes finos de responsividade, margens e espaçamentos em diferentes seções (ex.: Agenda, Documentos, Menu do Cliente) para manter a consistência do design.
            </p>
          </div>
        </div>
      </div>

      <p className="text-gray-700 dark:text-gray-300 font-medium">
        Essas foram as principais alterações e otimizações feitas na atualização 2.0.0
      </p>
    </div>
  );
};

export default Version2Section;
