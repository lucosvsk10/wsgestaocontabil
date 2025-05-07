
# WS Gestão Contábil

Sistema de gerenciamento contábil com foco no upload, download e gerenciamento de documentos pelos usuários.

## 🚀 Funcionalidades

- **Gerenciamento de Documentos:** Upload, download e visualização de documentos
- **Autenticação Segura:** Login, registro e autenticação de dois fatores
- **Área Administrativa:** Gerenciamento de usuários e documentos
- **Interface Responsiva:** Compatível com dispositivos móveis e desktop
- **Suporte a Temas:** Modo claro e escuro integrados

## 🛠️ Tecnologias

- **Frontend:** React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Supabase (Autenticação, Banco de Dados, Storage e Edge Functions)
- **Ferramentas de Qualidade:** ESLint, Prettier, Vitest

## 📋 Pré-requisitos

- Node.js (v18+)
- npm ou yarn
- Conta no Supabase

## 🏁 Como Rodar o Projeto

### Instalação Local

```bash
# Clonar o repositório
git clone https://github.com/seu-usuario/ws-gestao-contabil.git

# Entrar na pasta do projeto
cd ws-gestao-contabil

# Instalar dependências
npm install

# Iniciar o servidor de desenvolvimento
npm run dev
```

### Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Compila o projeto para produção
- `npm run lint` - Executa verificação de linting
- `npm run test` - Executa os testes automatizados
- `npm run preview` - Exibe a versão de produção localmente

## 📚 Arquitetura do Projeto

O projeto segue uma arquitetura modular:

- `src/components/` - Componentes React reutilizáveis
- `src/contexts/` - Contextos React para gerenciamento de estado global
- `src/hooks/` - Hooks personalizados para lógica reutilizável
- `src/lib/` - Configurações e clientes de bibliotecas externas
- `src/pages/` - Páginas da aplicação
- `src/utils/` - Utilitários e funções auxiliares
  - `auth/` - Utilitários de autenticação
  - `documents/` - Utilitários de gerenciamento de documentos

## 🔒 Segurança

- **Supabase RLS:** Políticas de segurança por linha para proteção de dados
- **Autenticação MFA:** Suporte a autenticação de dois fatores
- **Verificação de Senhas:** Proteção contra senhas vazadas
- **Controle de Acesso:** Permissões baseadas em papéis de usuário

## 📝 Licença

Este projeto está licenciado sob a Licença MIT - consulte o arquivo LICENSE para detalhes.

## 👥 Contribuição

1. Faça um fork do projeto
2. Crie sua branch de feature (`git checkout -b feature/nova-funcionalidade`)
3. Faça commit das alterações (`git commit -m 'feat: Adicionei nova funcionalidade'`)
4. Faça push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request
