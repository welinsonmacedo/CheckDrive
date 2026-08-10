# CheckDrive — Documentação Técnica

## 1. Visão geral
O CheckDrive é um sistema para gestão de frota e controle operacional, focado em checklists diários de veículos, controle de abastecimento, acompanhamento de manutenção preventiva/corretiva, gestão de motoristas, controle de inventário e gestão de empresas (multi-tenant).
Ele permite que motoristas registrem condições dos veículos via checklists (com fotos), enquanto administradores visualizam relatórios e gerenciam as ocorrências em um dashboard. O sistema funciona como um PWA e inclui um modelo SaaS multi-tenant.

---

# 2. Stack tecnológica
* **Frontend**: React (18+), TypeScript, Vite.
* **Backend / Banco de dados**: Supabase (PostgreSQL).
* **Autenticação**: Supabase Auth (E-mail/senha).
* **Storage**: Supabase Storage (Buckets para fotos e assinaturas).
* **Estilos**: Tailwind CSS, Lucide React (ícones).
* **Roteamento**: React Router DOM (com suporte a rotas protegidas e baseadas em Role).
* **Gráficos**: Recharts.
* **Exportação de arquivos**: `xlsx` (Excel), `jspdf` / `jspdf-autotable` (PDF).
* **Estado Local**: Hooks customizados, `AuthContext`.

---

# 3. Arquitetura do sistema
```text
Usuário (Motorista, Admin, Superadmin)
   ↓
Frontend (React PWA)
   ↓
Autenticação (Supabase Auth - JWT)
   ↓
Backend (PostgREST / Supabase API)
   ↓
Banco de dados (PostgreSQL com RLS - Row Level Security)
   ↓
Storage (Supabase Storage)
```
O frontend acessa diretamente o banco via chamadas na API do Supabase (`supabase-js`). A segurança é centralizada no banco utilizando Row Level Security (RLS) associado ao `auth.uid()` para filtrar acesso por Empresa (`company_id`).

---

# 4. Estrutura do projeto
```text
src/
├── components/       # Componentes globais de layout e Auth (Guards, Layouts).
├── contexts/         # Contextos Globais (AuthContext, AlertContext).
├── hooks/            # Hooks Utilitários (usePersistentState).
├── lib/              # Configurações do Supabase, utilitários globais, serviços.
├── modules/          # Módulos segmentados do sistema (Arquitetura modular).
│   ├── company/      # Dashboard Admin, gestão de frota, manutenção, inventário.
│   ├── data_import/  # Funcionalidades de importação/exportação e relatórios customizados.
│   ├── driver/       # Visão Mobile do motorista, checklists, painel de multas.
│   ├── shared/       # Telas públicas (Landing, Login, Privacy).
│   └── superadmin/   # Painel de gestão SaaS (Empresas, Planos, Auditoria Geral).
├── pages/            # Páginas estáticas / antigas (algumas migrando para modules).
├── routes/           # Orquestração principal de roteamento (`AppRoutes.tsx`).
├── types.ts          # Tipagens TypeScript globais.
└── utils/            # Utilitários gerais (formatadores, exportadores).
```

---

# 5. Rotas e navegação
| Rota | Página | Acesso | Função |
| ---- | ------ | ------ | ------ |
| `/` | Redirect | Público | Redireciona para `/login` |
| `/login` | `Login` | Público | Autenticação de usuário |
| `/quick-login` | `QuickLogin` | Público | Login simplificado |
| `/reset-password` | `ResetPassword` | Público | Recuperação de senha |
| `/privacy` | `Privacy` | Público | Política de privacidade |
| `/driver/*` | `DriverRoutes` | `driver` | Área do motorista (Home, Checklists, Perfil, Abastecimento) |
| `/admin/*` | `CompanyRoutes` | `admin`, `standard` | Gestão de Frota, Dashboard, Manutenção, Veículos |
| `/sa/*` | `SuperAdminRoutes` | `superadmin` | Gestão de Tenants, Empresas, Auditoria, Planos SaaS |
| `/relatorio-compartilhado/:id`| `SharedReportPage` | Público | View de relatórios externos compartilhados |

---

# 6. Autenticação
* Baseada no **Supabase Auth** (`email` e `password`).
* Sessão e estado do usuário persistidos e propagados via `<AuthProvider>` (`AuthContext`).
* Rotas protegidas por Guards (`DriverGuard`, `CompanyGuard`, `SuperAdminGuard`, `ProtectedRoute`), que validam a `role` presente na tabela `profiles`.
* Fluxo: Login via API Auth -> Retorna JWT -> `AuthContext` busca os dados adicionais em `profiles` -> Permite/Nega acesso ao layout correspondente.

---

# 7. Usuários e permissões
* **Tipos (`role`)**:
  * `superadmin`: Acesso total. Pode gerenciar empresas e planos SaaS.
  * `admin`: Gestor da frota da Empresa (`company_id`). Visualiza e gerencia tudo dentro do Tenant.
  * `standard`: Acesso gerencial limitado dentro do Tenant (conforme `visible_tabs`).
  * `driver`: Acesso estrito ao módulo mobile (checklists, abastecimentos próprios).
* **Permissões Refinadas**:
  * O campo `visible_tabs` em `profiles` define quais abas do menu Admin o usuário `standard` pode ver (ex: `['vehicles', 'maintenance']`).
* **RLS (Row Level Security)**: Usuários possuem `company_id`. Toda consulta no BD só retorna dados daquela empresa.

---

# 8. Módulos do sistema
## 8.1 Company (Admin)
* **Objetivo**: Gestão completa de frota da empresa.
* **Páginas / Abas**: Dashboard, Veículos, Motoristas, Checklists Diários, Abastecimento, Manutenção, Histórico, Inventário/Estoque, Rotas, Fechamento de Pontuação, Auditoria.
* **Permissões**: Role `admin` ou `standard`.
## 8.2 Driver (Motorista)
* **Objetivo**: Operação diária do motorista.
* **Páginas**: Iniciar Checklist, Ver Meus Veículos, Painel de Pontuação, Lançar Abastecimentos.
* **Permissões**: Role `driver`.
## 8.3 Data Import (Relatórios)
* **Objetivo**: Geração e exportação de dados analíticos.
* **Páginas**: Operacional, Custos de Frota, Auditorias Customizadas.
## 8.4 Superadmin
* **Objetivo**: SaaS Master Dashboard.
* **Páginas**: Empresas, Planos SaaS, Usuários Globais.

---

# 9. Dashboard
* **Componente**: `CompanyDashboard` (`DashboardTab.tsx`).
* **Cards Indicadores**: Total de Veículos, Veículos Disponíveis, Veículos em Manutenção, Checklists do Dia (Aprovados/Pendentes), Total Gasto no Mês (Abastecimento + Manutenção).
* **Gráficos**: Uso de `recharts` para plotar Custos e Disponibilidade.
* **Origem dos dados**: Tabelas `vehicles`, `alerts`, `checklist_submissions`, `vehicle_averages`.

---

# 10. Empresas
* Cadastradas no módulo Superadmin (tabela `companies`).
* Atributos: `id`, `name`, `cnpj`, `active`, `plan_id`, `max_users`, `max_vehicles`.
* O isolamento de dados é 100% dependente da chave `company_id` inserida automaticamente via triggers no banco de dados e controlada via RLS.

---

# 11. Filiais
* Encontrado como tabela subsidiária para organização espacial (`branches` / divisions).
* **Campos**: Nome, CNPJ e vínculo com `company_id`.
* Veículos e Motoristas podem ser vinculados a uma filial/rota.

---

# 12. Veículos
* **Objetivo**: Cadastro e monitoramento da frota.
* **Tabela**: `vehicles`.
* **Campos Principais**: Placa (`plate`), Modelo (`model`), Tipo (`type`), ID do Modal (`modality_id`), `active`, `requires_trailer`.
* **Fluxo**: Gestor cadastra veículo -> Motorista visualiza para fazer checklist.
* Mantém cache/estado de Hodômetro (KM atualizada no último checklist).

---

# 13. Motoristas
* Perfis com role `driver`. Armazenados na tabela `profiles`.
* **Campos**: CPF, Nome, Tipo de Motorista (`Interno/Pátio`, `Rota`), Score, `participates_in_ranking`.
* Vinculados indiretamente através de históricos de submissões de checklist.

---

# 14. Checklists
* **Mecanismo Core** do app (Tabelas `checklist_submissions` e `checklist_answers`).
* Motorista informa placa -> Hodômetro atual -> Responde itens (OK, NOK, N/A).
* Se NOK, exige foto e observação (Storage).
* O gestor vê no Admin, e se houver itens NOK, uma pendência (Issue) é gerada automaticamente no painel de Monitoramento.

---

# 15. Defeitos e pendências
* Gerados automaticamente a partir de itens NOK no Checklist.
* O Gestor acessa a aba de Ocorrências (Issues), define Status (Agendado, Resolvido), Responsável, Custo e Data de Resolução.
* Resoluções compõem as métricas financeiras da frota.

---

# 16. Manutenção
* **Aba**: `MaintenanceTab`.
* **Controle**: Preventivas (Acompanhamentos por KM ou Data) e Corretivas (Alertas/Ocorrências).
* Registros (`alerts`): Controlam o alerta de manutenção. Se for via KM, alerta dispara quando o Hodômetro atinge `last_km + interval_km`.
* Foi recém adicionada uma funcionalidade de Exportar acompanhamentos (Excel) com os status 'Atrasada', 'Próxima do Vencimento' e 'Em dia'.

---

# 17. Abastecimento
* **Aba**: `FuelTab` e tabela dedicada `vehicle_averages`.
* Controla litros abastecidos, preço/litro, distância e km atual.
* Calculo: `Média KM/L = Distância / Litros`.
* Registros são lançados pelo motorista no fechamento/abastecimento ou pelo gestor manualmente.

---

# 18. Lava-jato
> Não identificado como um módulo independente no código atual.

---

# 19. Relatórios
* Centralizados em `ReportsOperationalView` no módulo `data_import`.
* **Tipos**: Manutenções, Abastecimentos, Checklists, Cadastro de Veículos, Auditoria de Estoque.
* **Exportações**: Suporta `.xlsx` (via biblioteca `xlsx`) e `.pdf` (via `jspdf`).

---

# 20. BI e indicadores
* **Disponibilidade da frota**: `(Veículos Ativos - Veículos com status em manutenção) / Total * 100`.
* **Custos Mensais**: Soma do campo custo das manutenções + abastecimentos.
* **Indicador de Consumo Médio**: Soma das distâncias / Soma de litros no mês.

---

# 21. Banco de dados## `profiles`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| email | TEXT | |
| cpf | TEXT | |
| full_name | TEXT | |
| role | TEXT | |
| driver_type | TEXT | |
| participates_in_ranking | BOOLEAN | |
| active | BOOLEAN | |
| modality_ids | UUID[] | |
| visible_tabs | TEXT[] | |
| score_profile_id | UUID | |
| created_at | TIMESTAMP | |


## `vehicle_modalities`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| name | TEXT | |
| created_at | TIMESTAMP | |


## `vehicles`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| plate | TEXT | |
| model | TEXT | |
| type | TEXT | |
| modality_id | UUID | |
| requires_trailer | BOOLEAN | |
| active | BOOLEAN | |
| visible_tabs | TEXT[] | |
| manual_location | TEXT | |
| manual_status | TEXT | |
| last_status_update | TIMESTAMP | |
| created_at | TIMESTAMP | |


## `trailers`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| plate | TEXT | |
| active | BOOLEAN | |
| created_at | TIMESTAMP | |


## `routes`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| origin | TEXT | |
| destination | TEXT | |
| distance_km | NUMERIC | |
| stops | JSONB | |
| active | BOOLEAN | |
| created_at | TIMESTAMP | |


## `checklist_types`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| title | TEXT | |
| active | BOOLEAN | |
| created_at | TIMESTAMP | |


## `checklist_items`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| type_id | UUID | |
| title | TEXT | |
| is_trailer_item | BOOLEAN | |
| order_index | INTEGER | |
| input_type | TEXT | |
| appears_in_manual | BOOLEAN | |
| is_fuel_liters | BOOLEAN | |
| created_at | TIMESTAMP | |


## `checklist_submissions`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| driver_id | UUID | |
| vehicle_id | UUID | |
| trailer_id | UUID | |
| route_id | UUID | |
| type | TEXT | |
| odometer | INTEGER | |
| latitude | NUMERIC | |
| longitude | NUMERIC | |
| photos | JSONB | |
| receipt_photo_url | TEXT | |
| details | JSONB | |
| status | TEXT | |
| created_at | TIMESTAMP | |


## `driver_performance`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| driver_id | UUID | |
| score | INTEGER | |
| total_checklists | INTEGER | |
| updated_at | TIMESTAMP | |


## `checklist_issues`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| submission_id | UUID | |
| vehicle_id | UUID | |
| trailer_id | UUID | |
| driver_id | UUID | |
| item_title | TEXT | |
| description | TEXT | |
| photo_url | TEXT | |
| attachments | JSONB | |
| status | TEXT | |
| report_count | INTEGER | |
| resolution_notes | TEXT | |
| resolved_at | TIMESTAMP | |
| resolved_by | UUID | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |


## `app_settings`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | TEXT | |
| system_type | TEXT | |
| initial_value | NUMERIC | |
| penalty_value | NUMERIC | |
| penalty_start | NUMERIC | |
| penalty_end | NUMERIC | |
| penalty_fuel | NUMERIC | |
| penalty_yard | NUMERIC | |
| require_external_photos | BOOLEAN | |
| require_fuel_receipt_photo | BOOLEAN | |
| require_location | BOOLEAN | |
| closing_rule | TEXT | |
| closing_day | INTEGER | |
| updated_at | TIMESTAMP | |


## `vehicle_types`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| name | TEXT | |
| max_speed | NUMERIC | |
| ideal_consumption | NUMERIC | |
| active | BOOLEAN | |
| created_at | TIMESTAMP | |


## `vehicle_models`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| type_id | UUID | |
| name | TEXT | |
| active | BOOLEAN | |
| created_at | TIMESTAMP | |


## `schedules`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| driver_id | UUID | |
| vehicle_id | UUID | |
| trailer_id | UUID | |
| route_id | UUID | |
| start_at | TIMESTAMP | |
| end_at | TIMESTAMP | |
| start_checklist_id | UUID | |
| end_checklist_id | UUID | |
| fuel_checklist_id | UUID | |
| requires_fueling | BOOLEAN | |
| bait1_id | UUID | |
| bait2_id | UUID | |
| bait3_id | UUID | |
| penalty_applied | BOOLEAN | |
| created_at | TIMESTAMP | |


## `baits`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| name | TEXT | |
| active | BOOLEAN | |
| created_at | TIMESTAMP | |


## `audit_logs`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| driver_id | UUID | |
| type | TEXT | |
| amount | NUMERIC | |
| reason | TEXT | |
| created_at | TIMESTAMP | |


## `score_profiles`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| name | TEXT | |
| calculation_type | TEXT | |
| base_value | NUMERIC | |
| penalty_start | NUMERIC | |
| penalty_end | NUMERIC | |
| penalty_fuel | NUMERIC | |
| penalty_yard | NUMERIC | |
| apply_penalty_start | BOOLEAN | |
| apply_penalty_end | BOOLEAN | |
| apply_penalty_fuel | BOOLEAN | |
| apply_penalty_yard | BOOLEAN | |
| closing_rule | TEXT | |
| closing_value | TEXT | |
| created_at | TIMESTAMP | |


## `manual_penalties`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| name | TEXT | |
| points | NUMERIC | |
| active | BOOLEAN | |
| created_at | TIMESTAMP | |


## `score_closings`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| period_start | DATE | |
| period_end | DATE | |
| closed_at | TIMESTAMP | |
| closed_by | UUID | |


## `score_closing_items`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| closing_id | UUID | |
| driver_id | UUID | |
| score | INTEGER | |
| total_checklists | INTEGER | |


## `companies`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| name | TEXT | |
| document | TEXT | |
| active | BOOLEAN | |
| created_at | TIMESTAMP | |


## `saas_plans`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| name | TEXT | |
| description | TEXT | |
| max_users | INTEGER | |
| max_vehicles | INTEGER | |
| price | DECIMAL(10 | |
| active | BOOLEAN | |
| created_at | TIMESTAMP | |


## `vehicle_averages`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| company_id | UUID | |
| vehicle_id | UUID | |
| driver_id | UUID | |
| schedule_id | UUID | |
| fuel_submission_id | UUID | |
| start_date | TIMESTAMP | |
| end_date | TIMESTAMP | |
| start_odometer | INTEGER | |
| end_odometer | INTEGER | |
| distance | INTEGER | |
| liters | NUMERIC | |
| average | NUMERIC | |
| status | TEXT | |
| notes | TEXT | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |


## `inventory_suppliers`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| name | TEXT | |
| cnpj_cpf | TEXT | |
| contact_name | TEXT | |
| phone | TEXT | |
| email | TEXT | |
| created_at | TIMESTAMPTZ | |
| company_id | UUID | |


## `inventory_items`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| sku | TEXT | |
| name | TEXT | |
| category | TEXT | |
| brand | TEXT | |
| min_quantity | NUMERIC | |
| current_quantity | NUMERIC | |
| average_cost | NUMERIC | |
| created_at | TIMESTAMPTZ | |
| company_id | UUID | |


## `inventory_transactions`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| item_id | UUID | |
| supplier_id | UUID | |
| type | TEXT | |
| quantity | NUMERIC | |
| unit_price | NUMERIC | |
| total_price | NUMERIC | |
| nf_number | TEXT | |
| nf_key | TEXT | |
| date | TIMESTAMPTZ | |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | |
| created_by | UUID | |
| company_id | UUID | |



---

# 22. Diagrama do banco
```text
companies (tenant base)
 │
 ├── saas_plans
 ├── profiles (users)
 │
 ├── vehicles
 │    ├── checklist_submissions
 │    │    └── checklist_answers
 │    ├── vehicle_averages
 │    └── alerts (maintenance)
 │
 └── inventory_items
      └── inventory_transactions
```

---

# 23. RLS — Row Level Security
* A maioria das tabelas possui políticas restritivas (`FOR SELECT TO authenticated USING (true)` ou comparando o `company_id`).
* **Nova Segurança**: Triggers `set_company_id_on_insert()` automatizam a inserção da empresa correta em cada registro, mitigando erros onde inserts falhariam o RLS.
* Muitas políticas requerem validação pelo contexto do usuário logado (ex. `auth.uid()`).

---

# 24. Storage
* Buckets inferidos:
  * `checklist-photos`: Armazena evidências de checklists NOK.
  * `signatures`: Assinaturas digitais de motoristas.
  * `receipts`: Notas ou comprovantes de combustível.

---

# 25. APIs e Services
* As requisições são diretas pelo SDK `@supabase/supabase-js` em custom hooks ou funções (`src/lib/supabase.ts`).
* `src/lib/auditService.ts`: Serviço auxiliar para inserção de log de auditoria em `audit_logs`.

---

# 26. Hooks
* `usePersistentState` (`src/hooks/usePersistentState.ts`): Salva o state localmente em `localStorage` para navegação contínua entre sessões.
* `useAuth` (`src/modules/shared/contexts/AuthContext.ts`): Retorna as permissões do usuário logado e metadados (`user.company_id`, `user.role`).

---

# 27. Componentes importantes
* `AppLayout` / `DriverLayout`: Shell principal renderizando sidebar de navegação e Header.
* `ProtectedRoute`, `CompanyGuard`: Proteção de rota impedindo que Motoristas acessem views de Admin e vice-versa.
* `MaintenanceTrackingPrintModal`: Componente que realiza renderização customizada de janela pop-up (portal) para tabelas de acompanhamento de manutenção. Acabamos de adicionar recurso de exportação Excel para ele.

---

# 28. Estado da aplicação
* Global / Sessão: Context API (`AuthContext`, `AlertContext`).
* Fluxo / UI: `useState` e modais condicionados (`showModal && <Modal />`).
* Sem uso de Redux ou Zustand até o presente.

---

# 29. Fluxos principais
## Fluxo de Checklists (Motorista)
```text
Login
↓
Escolhe 'Checklist Saída' ou 'Chegada'
↓
Seleciona Placa do Veículo
↓
Atualiza KM
↓
Responde Itens de Inspeção (Limpeza, Óleo, Pneus...)
↓
Se NOK, obriga observação e foto
↓
Finaliza (Submission e Answers salvos no BD)
```

---

# 30 a 33. Fluxos Operacionais (Admin)
## Manutenção & Ocorrências
```text
Item do Checklist é apontado como NOK
↓
Surge Alerta no Monitoramento (IssuesTab)
↓
Admin avalia e define status (Em Analise -> Agendado -> Resolvido)
↓
Admin informa custo da peça/serviço e salva
↓
(Custo entra nos indicadores de BI e relatório de manutenção)
```

---

# 34. Tratamento de erros
* Erros de Auth: Capturados pelo AuthContext, geram redirecionamento (Redirect) para `/login`.
* Erros de Requisição (Supabase): Tratados em blocos `try/catch`, reportados com mensagens estilo `alert(...)` ou `console.error`.
* Erros de Validação: Avisos no front-end na hora de submeter o form.

---

# 35. Variáveis de ambiente
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

# 36. Deploy
* O deploy é comumente executado em Vercel ou host compatível com Vite SPA (SPA Fallback para roteamento ativado).
* Configuração em `vercel.json` (rewrites para `/index.html`).

---

# 37. Dependências
* `react` e `react-dom`
* `@supabase/supabase-js`
* `react-router-dom`
* `lucide-react` (Ícones)
* `recharts` (Gráficos)
* `xlsx`, `jspdf`, `jspdf-autotable` (Exportação e Relatórios)
* `date-fns` (Manipulação de horas/datas)
* `react-hook-form` (Alguns formulários avançados)

---

# 38. Scripts
```bash
npm run dev      # Roda o app localmente via vite
npm run build    # Compila a SPA para /dist
npm run preview  # Serve a pasta /dist para debug
```

---

# 39. Migrations
O versionamento do BD no Supabase (se existente) ou em scripts soltos na raiz (ex: `alter_multiempresa.sql`, `alter_saas_plans.sql`) define a evolução. Políticas e tabelas foram injetadas ativamente nesses scripts de setup.

---

# 40. Triggers, Functions e Procedures
* `set_company_id_on_insert()`: Associa novos registros ao Tenant de quem os criou automaticamente.
* **Restrições Multi-Tenant** foram aplicadas via esse trigger na maioria das tabelas operacionais (`vehicles`, `checklist_submissions`, `inventory_items`, etc).

---

# 41. Integrações externas
Nenhuma integração complexa (como gateways de pagamento) mapeada de forma madura, uso de APIs de serviço (ex. viacep, se hover), e possivelmente integração básica WhatsApp/Mensageria (arquivos como `whatsappIntegration.ts`).

---

# 42. Funcionalidades incompletas
* Lava-Jato não implementado no fluxo atual.
* Funcionalidades que citam pagamentos (Planos SaaS) parecem ser controles manuais em BD por enquanto, sem integração com Stripe ou Asaas ativa no front-end.

---

# 43 a 46. Problemas conhecidos, Regras e Dependências
## Dívidas / Problemas
* O componente `MaintenanceTab` está muito longo, contendo diversas modais renderizadas condicionalmente inline.
* **Recomendação**: Refatorar modais (ex: `MaintenanceTrackingPrintModal` separou logicamente parte da UI, mas ainda há lógica acoplada).
## Regras Core
* **Multi-tenant**: Todo registro pertence a uma `company_id`. Jamais ignore essa regra ao inserir/alterar.
* **Hodômetro Sequencial**: Ao aprovar/enviar um checklist ou abastecimento, o KM atual não pode ser inferior ao último registrado pelo veículo no banco.

---

# 47. Segurança
* Dados expostos via RLS restritivo apenas aos tokens autenticados que pertencem à empresa `company_id` vinculada.
* Nenhuma chave secreta foi detectada no código client-side.

---

# 48. Guia para futuras IAs
# Como uma IA deve trabalhar neste projeto
1. **Sempre analisar a documentação antes de alterar o sistema**: Use este arquivo (`documentation.md`) como norte.
2. **Não criar tabelas duplicadas sem necessidade**: Revise a seção de DB para reaproveitar estruturas.
3. **Não alterar estruturas existentes sem verificar dependências**: Ao mexer na tabela `vehicles`, lembre-se que ela afeta checklists, manutenções e abastecimentos.
4. **Não ignorar RLS**: Toda query backend ou script SQL deve considerar o Multi-Tenant e suas triggers.
5. **Não inventar campos ou IDs incompatíveis**: Se um modal recebe string e envia para UUID, adote o casting correto.
6. **Atualizar `documentation.md`** caso realize mudanças drásticas estruturais ou de RLS.
7. **Não expor secrets**: Jamais preencha valores reais em `env.example` ou referencie senhas.

---

# 49. Histórico de alterações da documentação
```markdown
## Changelog da documentação
| Data       | Alteração                             | Responsável |
| 2026-08-07 | Documentação técnica completa gerada. | IA          |
```