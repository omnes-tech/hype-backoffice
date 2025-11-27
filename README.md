# Hype App

## 🖥️ Visão Geral

O Hype App Backoffice é uma aplicação web moderna desenvolvida com React e Vite, oferecendo uma interface administrativa completa e responsiva.

## 🛠️ Tecnologias Principais

### Core

- **React** - Biblioteca principal para construção de interfaces de usuário
- **Vite** - Build tool e dev server de nova geração
- **TypeScript** - Linguagem tipada utilizada em todo o projeto

### Navegação

- **TanStack Router** - Sistema de roteamento type-safe com code splitting automático

### Estilização

- **Tailwind CSS** - Framework CSS utility-first
- **Next Themes** - Gerenciamento de temas (dark/light mode)

### Gerenciamento de Estado

- **TanStack React Query** - Gerenciamento de estado assíncrono, cache e sincronização com servidor
- **React Context API** - Estado global para autenticação e workspace

### Formulários e Validação

- **React Hook Form** - Biblioteca performática para gerenciamento de formulários
- **Zod** - Validação de schemas com TypeScript

### Componentes UI

- **Radix UI** - Componentes primitivos acessíveis e não estilizados
- **Lucide React** - Biblioteca de ícones moderna
- **Sonner** - Sistema de notificações toast

## 📦 Plataformas Suportadas

- ✅ Web (Chrome, Firefox, Safari, Edge)
- ✅ Desktop (via navegadores modernos)

## 📝 Comandos Principais

```bash
npm run dev      # Inicia o servidor de desenvolvimento
npm run build    # Gera build de produção
npm run preview  # Preview do build de produção
```

## 🏗️ Arquitetura

- **File-based routing** - Rotas baseadas na estrutura de pastas
- **Component-driven** - Desenvolvimento baseado em componentes reutilizáveis
- **TypeScript strict mode** - Tipagem rigorosa em todo o projeto
- **Path aliases** - Importações simplificadas usando `@/` para acessar `src/`
