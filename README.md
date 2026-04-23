# 🧬 Lab Atlas — LAPOGE

**Lab Atlas** é uma plataforma web desenvolvida para o **Laboratório de Genética e Biodiversidade (LAPOGE)**, voltada ao gerenciamento de bancos de dados genômicos de doenças, com versionamento, backup automático, análises estatísticas e controle de acesso por papéis.

---

## ✨ Funcionalidades

### 📊 Dashboard
- Visão geral com cards de resumo (bancos cadastrados, versões, variáveis)
- Gráficos interativos de distribuição de dados

### 🗄️ Bancos de Dados de Doenças
- Cadastro de bancos por condição/doença
- Upload de arquivos (`.csv`, `.xlsx`, `.json`) com preview dos dados
- Listagem, edição e exclusão de bancos

### 🔄 Versionamento
- Criação automática de versões sequenciais (V1, V2, V3...)
- Botão **"Atualizar Banco"** para upload de novas versões
- Histórico completo de versões por banco

### 💾 Backup Automático
- Snapshot automático antes de cada nova versão
- Tabela `version_backups` com dados completos de cada versão
- Restauração de backups

### 🗃️ Destinos de Backup (Admin)
- Configuração de múltiplos destinos na aba **Backup** da administração:
  - **Lovable Cloud Storage** — armazenamento integrado
  - **Google Drive** — via Folder ID
  - **Download Manual** — exportação em JSON/XLSX
  - **Servidor Externo** — envio via webhook/API
  - **Servidor Universitário** — credenciais institucionais (usuário, senha, diretório remoto)
- Ativação/desativação individual de cada destino

### 📈 Estatísticas Descritivas
- Análise exploratória de variáveis dos bancos
- Tabelas de frequência, média, mediana, desvio padrão

### 🔗 Análise de Desequilíbrio de Ligação (LD)
- Heatmap de LD entre marcadores
- QQ Plot e Manhattan Plot

### 📋 Variáveis do Banco
- Cadastro de variáveis por banco (nome, tipo, categoria, descrição)
- Ordenação customizada

### 👥 Administração
- **Gerenciamento de Usuários**: aprovação/revogação de cadastros
- **Controle de Permissões**: papéis `admin`, `moderator`, `user`
- **Log de Atividades**: registro das últimas 50 ações no sistema
- **Configurações de Backup**: definição de destinos de armazenamento

### 🔐 Autenticação e Segurança
- Cadastro com aprovação obrigatória por administrador
- Login por e-mail e senha
- Recuperação de senha
- Tela de "Aprovação Pendente" para novos cadastros
- Row-Level Security (RLS) em todas as tabelas
- Função `has_role()` com `SECURITY DEFINER` para checagem segura de papéis

### ⚙️ Configurações do Perfil
- Edição de nome, instituição, laboratório, programa, orientador
- Nível acadêmico (graduação, mestrado, doutorado, pós-doc, pesquisador)

---

## 🛠️ Stack Tecnológica

| Camada       | Tecnologia                        |
|--------------|-----------------------------------|
| Frontend     | React 18, TypeScript, Vite        |
| UI           | Tailwind CSS, shadcn/ui, Recharts |
| Backend      | Lovable Cloud (Supabase)          |
| Banco        | PostgreSQL com RLS                |
| Auth         | Supabase Auth                     |
| Parsing      | SheetJS (xlsx)                    |
| Estado       | React Query, Context API          |
| Roteamento   | React Router v6                   |

---

## 📁 Estrutura do Projeto

```
src/
├── components/         # Componentes reutilizáveis
│   ├── ui/             # shadcn/ui components
│   ├── AppHeader.tsx
│   ├── AppSidebar.tsx
│   ├── BackupSettings.tsx
│   ├── DashboardCharts.tsx
│   ├── DatabaseVariables.tsx
│   ├── DatabaseVersions.tsx
│   ├── DescriptiveStats.tsx
│   ├── FilePreview.tsx
│   ├── LDHeatmap.tsx
│   ├── ManhattanPlot.tsx
│   ├── QQPlot.tsx
│   └── UpdateDatabaseDialog.tsx
├── contexts/           # AuthContext, VersionContext
├── hooks/              # useAdminCheck, use-mobile, use-toast
├── lib/                # Serviços e utilitários
│   ├── activityLog.ts
│   ├── backupExport.ts
│   ├── backupService.ts
│   ├── fileParser.ts
│   ├── ldAnalysis.ts
│   └── utils.ts
├── pages/              # Páginas da aplicação
│   ├── AdminPage.tsx
│   ├── Dashboard.tsx
│   ├── DatabasePage.tsx
│   ├── DescriptiveStatsPage.tsx
│   ├── DiseaseDatabases.tsx
│   ├── LDAnalysisPage.tsx
│   ├── LoginPage.tsx
│   ├── PendingApprovalPage.tsx
│   ├── ResetPasswordPage.tsx
│   ├── SettingsPage.tsx
│   └── VersionManager.tsx
└── integrations/supabase/  # Client e tipos (auto-gerados)
```

---

## 🗄️ Modelo de Dados

| Tabela              | Descrição                                      |
|---------------------|-------------------------------------------------|
| `profiles`          | Perfis de usuários (nome, instituição, lab...)  |
| `user_roles`        | Papéis (`admin`, `moderator`, `user`)           |
| `disease_databases` | Bancos de dados por doença                      |
| `database_versions` | Versões dos bancos com dados (JSONB)            |
| `database_variables`| Variáveis cadastradas por banco                 |
| `version_backups`   | Backups automáticos de versões                  |
| `backup_settings`   | Configurações de destinos de backup             |
| `activity_log`      | Registro de atividades do sistema               |

---

## 🚀 Como Usar

1. Acesse a aplicação e cadastre-se
2. Aguarde aprovação do administrador
3. Após aprovado, faça login e comece a gerenciar bancos de dados
4. Na seção **Bancos de Dados**, crie um novo banco e faça upload dos dados
5. Use **Atualizar Banco** para adicionar novas versões (backup automático incluso)
6. Explore análises em **Estatísticas Descritivas** e **Análise LD**

---

## 👤 Administrador Padrão

O e-mail `chaves.smo@gmail.com` é automaticamente aprovado e recebe o papel de **admin** ao se cadastrar.

---

## 👨‍💻 Autor

**Tiago Fernando Chaves**  
Contato: chaves.smo@gmail.com

---

## 📄 Licença

Projeto desenvolvido para uso interno do LAPOGE — Laboratório de Genética e Biodiversidade.  
Todos os direitos reservados © Tiago Fernando Chaves.
