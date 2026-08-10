import os
import json
import re
from datetime import datetime

out = []
def add(s): out.append(s)

add("# CheckDrive — Documentação Técnica\n")

add("## 1. Visão geral")
add("CheckDrive é um sistema web progressivo (PWA) e plataforma SaaS projetada para gestão de frotas, motoristas e checklists operacionais. O objetivo principal é fornecer às empresas uma maneira eficiente de rastrear a conformidade dos veículos, histórico de manutenção, consumo de combustível e auditorias, através de painéis, relatórios e processos diários de aprovação.")
add("Público-alvo: Transportadoras, empresas de logística e companhias que possuem frota interna.")
add("Arquitetura: Frontend SPA em React/Vite acessando backend-as-a-service Supabase (PostgreSQL, Auth e Storage).")
add("---\n")

add("# 2. Stack tecnológica")
add("* **Frontend**: React, TypeScript, Vite, Tailwind CSS")
add("* **Backend**: Supabase")
add("* **Banco de dados**: PostgreSQL (provido pelo Supabase)")
add("* **Autenticação**: Supabase Auth")
add("* **Storage**: Supabase Storage")
add("* **Bibliotecas principais**: ")
add("  * `lucide-react` (Ícones)")
add("  * `react-router-dom` (Roteamento)")
add("  * `xlsx`, `jspdf` (Exportações e Relatórios)")
add("  * `recharts` (Gráficos no Dashboard)")
add("  * `date-fns` (Manipulação de datas)")
add("* **Build/Deploy**: Configuração via Vercel (`vercel.json`) / Vite.")
add("---\n")

add("# 3. Arquitetura do sistema")
add("```text\nUsuário (Admin, Motorista)\n   ↓\nFrontend (React SPA)\n   ↓\nAutenticação (Supabase Auth via Context)\n   ↓\nBackend (Supabase API / PostgREST)\n   ↓\nBanco de dados (PostgreSQL c/ RLS)\n   ↓\nStorage (Supabase Storage para assinaturas e fotos)\n```")
add("O frontend se comunica diretamente com o Supabase utilizando as chaves anônimas. Toda a segurança de acesso aos dados (quem vê qual filial, qual empresa) é feita por Row Level Security (RLS) diretamente no PostgreSQL.")
add("---\n")

add("# 4. Estrutura do projeto")
add("```text")
add("src/")
add("├── components/       # Componentes globais e de layout (auth, common)")
add("├── contexts/         # Contextos React (AuthContext, AlertContext)")
add("├── hooks/            # Hooks customizados (usePersistentState)")
add("├── lib/              # Configurações e utilitários (supabase.ts, utils.ts)")
add("├── modules/          # Módulos principais de negócio")
add("│   ├── company/      # Dashboard e views administrativas para gestão da empresa")
add("│   ├── data_import/  # Ferramentas para importação e exportação (relatórios)")
add("│   ├── driver/       # Visão e funcionalidades focadas no motorista")
add("│   ├── shared/       # Componentes e páginas compartilhadas")
add("│   └── superadmin/   # Visão de super administrador (gestão de tenants)")
add("├── pages/            # Páginas da raiz (login, privacy)")
add("├── routes/           # Configuração de rotas (AppRoutes.tsx)")
add("├── types.ts          # Definições de tipos TypeScript")
add("└── utils/            # Funções de conversão e utilidades")
add("```")
add("---\n")

add("# 5. Rotas e navegação")
add("As rotas estão configuradas centralmente no arquivo `AppRoutes.tsx` usando `react-router-dom`.")
add("| Rota | Página | Acesso | Função |")
add("| ---- | ------ | ------ | ------ |")
add("| `/` | `Login` | Público | Autenticação inicial |")
add("| `/quick-login` | `QuickLogin` | Público | Acesso rápido |")
add("| `/privacy` | `Privacy` | Público | Termos e privacidade |")
add("| `/driver/*` | `DriverHome` / etc | Autenticado (Motorista) | Área do motorista |")
add("| `/company/*` | `CompanyDashboard` etc | Autenticado (Admin) | Gestão da frota |")
add("| `/superadmin/*` | `SuperAdminDashboard` | Autenticado (Superadmin)| Gestão de empresas |")
add("---\n")

add("# 6. Autenticação")
add("A autenticação utiliza **Supabase Auth** gerida pelo `AuthContext`.")
add("* Login é feito via e-mail e senha.")
add("* Há suporte a quick login e reset de senha (`ResetPassword`).")
add("* Perfis são salvos na tabela `profiles` atrelada à trigger de cadastro de usuário do Supabase.")
add("* As rotas estão protegidas via `ProtectedRoute`, que verifica a role do usuário (driver, admin, superadmin, etc).")
add("---\n")

add("# 7. Usuários e permissões")
add("* **Tipos de usuário (Roles)**: `driver`, `admin`, `standard`, `superadmin`.")
add("* Permissões são armazenadas na tabela `profiles`.")
add("* Há um mecanismo Multi-Tenant onde usuários pertencem a uma `company` (tabela `companies`). O acesso aos registros é limitado a registros da própria empresa através de Row Level Security (RLS).")
add("* Administradores gerenciam usuários da empresa pela aba `AdmUsersTab`.")
add("---\n")

add("# 8. Módulos do sistema")

add("## Módulo: Admin (Company)")
add("### Objetivo: Permitir que gestores gerenciem a frota de uma empresa.")
add("### Funcionalidades: Dashboard, Veículos, Motoristas, Checklists, Manutenções, Abastecimento, Inventário.")
add("### Dependências: Usa o schema completo e RLS isolando por `company_id`.")

add("## Módulo: Motorista (Driver)")
add("### Objetivo: Permitir que motoristas preencham checklists diários, enviem abastecimentos e visualizem sua pontuação.")
add("### Funcionalidades: Dashboard próprio, Checklist de entrada/saída, Informar Manutenções, etc.")

add("## Módulo: Superadmin")
add("### Objetivo: Gestão das empresas clientes (SaaS) cadastradas no sistema, controle de planos (Básico, Pro).")
add("---\n")

add("# 9. Dashboard")
add("O Dashboard corporativo (`CompanyDashboard` / `DashboardTab`) apresenta:")
add("* Indicadores: Frota disponível, Alertas pendentes, Checklists do dia, Abastecimentos (custos).")
add("* Gráficos gerados com `recharts` comparando custos mensais ou disponibilidade.")
add("* Permissões: Restrito a usuários com roles administrativas (`admin`, `standard`).")
add("---\n")

add("# 10. Empresas (Tenants)")
add("* Uma entidade `company` representa um cliente SaaS.")
add("* Usuários, veículos e registros possuem `company_id`.")
add("* RLS garante isolamento usando uma função utilitária `auth.uid()` -> perfil -> `company_id`.")
add("---\n")

add("# 11. Filiais")
add("Filiais (Branches) podem ser cadastradas e vinculadas a motoristas e veículos. No código atual, existe menção a divisões operacionais, mas o controle majoritário ocorre por `company_id`.")
add("---\n")

add("# 12. Veículos")
add("* **Cadastro:** Placa, Modelo, Categoria (Truck, Van), Status.")
add("* **Relacionamentos:** Pertence à `companies`, linkado a checklists (`vehicles`).")
add("* **Histórico:** Mantém hodômetros, status manuais. A aba `VehiclesTab` e modalidades gerenciam os dados.")
add("---\n")

add("# 13. Motoristas")
add("* Perfis com role `driver`. Cadastrados na aba `DriversTab`.")
add("* Contêm campos como tipo (interno, pátio) e status de participação no ranking.")
add("* Relacionados a infrações e fechamentos de score.")
add("---\n")

add("# 14. Checklists")
add("* Fluxo principal de conformidade.")
add("* `checklist_submissions` e `checklist_answers` guardam as submissões.")
add("* Contém fotos de defeitos (Supabase Storage).")
add("* Fluxo: Motorista abre app -> Seleciona veículo -> Preenche KM e formulário (OK, Nok, NA) -> Envia. Gestor aprova ou reprova.")
add("---\n")

add("# 15. Defeitos e pendências")
add("* Falhas de checklists (`Nok`) criam issues que precisam de resolução (na aba `IssuesTab` / Monitoramento).")
add("* São gerenciadas pelos administradores que avaliam o defeito, agendam correção e encerram a pendência com informações de custo.")
add("---\n")

add("# 16. Manutenção")
add("* `MaintenanceTab` permite o controle de preventivas, corretivas e acompanhamentos (KM ou Data).")
add("* Alertas automáticos para KM próximo ou data próxima, disparados pelas quilometragens diárias alimentadas via checklists.")
add("---\n")

add("# 17. Abastecimento")
add("* Controlado no módulo `FuelTab` e tabela `vehicle_averages` e inserções específicas no checklist.")
add("* Acompanha litros abastecidos, preço por litro, km atual, e calcula a média de KM/L automaticamente.")
add("---\n")

add("# 18. Lava-jato")
add("> Funcionalidade não implementada no código atual como módulo independente (provavelmente embutida no tipo de serviço de manutenção, se existir).")
add("---\n")

add("# 19. Relatórios")
add("* Diversos relatórios (Operacional, Frota, etc.) gerados via `ReportsOperationalView`.")
add("* Exportação em PDF (`jspdf`) e Excel (`xlsx`).")
add("---\n")

add("# 20. BI e indicadores")
add("* Indicador: Custo de Manutenção / Abastecimento (soma dos valores resolvidos em pendências e abastecimentos).")
add("* Indicador: Média KM/L por veículo (Distância percorrida / Litros, agrupados no módulo `FuelTab`).")
add("---\n")

add("# 21. Banco de dados")
add("Principais tabelas extraídas do `schema.sql`:")

try:
    with open("schema.sql", "r") as f:
        schema = f.read()
        tables = re.findall(r'CREATE TABLE IF NOT EXISTS ([a-zA-Z0-9_]+)\s*\((.*?)\);', schema, re.DOTALL | re.IGNORECASE)
        for table_name, table_body in tables:
            add(f"## `{table_name}`")
            add("### Campos")
            add("| Campo | Tipo |")
            add("| ----- | ---- |")
            lines = table_body.split('\n')
            for line in lines:
                line = line.strip()
                if not line or line.startswith('--') or line.startswith('PRIMARY KEY') or line.startswith('FOREIGN KEY') or line.startswith('UNIQUE'):
                    continue
                parts = line.split()
                if len(parts) >= 2:
                    col_name = parts[0]
                    col_type = parts[1].replace(',', '')
                    add(f"| {col_name} | {col_type} |")
            add("")
except Exception as e:
    add(f"Erro ao ler schema.sql: {e}")
add("---\n")

add("# 22. Diagrama do banco")
add("```text\ncompanies\n ├── profiles (Usuários/Motoristas)\n ├── vehicles\n │    ├── checklist_submissions\n │    │    └── checklist_answers\n │    ├── vehicle_averages (Abastecimentos)\n │    └── alerts (Manutenções)\n └── inventory_items\n```")
add("---\n")

add("# 23. RLS — Row Level Security")
add("* Grande parte das tabelas tem RLS ativado.")
add("* Exemplo de política de Select em tabelas: `USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()))`")
add("* Isso previne vazamento de dados entre empresas assinantes.")
add("---\n")

add("# 24. Storage")
add("* Uso de Buckets do Supabase para armazenar fotos das avarias e comprovantes de combustível.")
add("---\n")

add("# 25. APIs e Services")
add("* As interações são feitas diretamente usando `supabase.from('tabela')` nas views e funções.")
add("* Módulos em `src/lib/` abstraem algumas chamadas complexas.")
add("---\n")

add("# 26. Hooks")
add("* `usePersistentState`: Hook encontrado para salvar estado localmente em `localStorage` para offline/persistência de UI.")
add("---\n")

add("# 27. Componentes importantes")
add("* `AppLayout` / `DriverLayout`: Shells principais.")
add("* `MaintenanceTrackingPrintModal`: Responsável pela impressão e exportação Excel recém alterada.")
add("* `ProtectedRoute`: Garante que o role do Context bata com os requisitos da rota.")
add("---\n")

add("# 28. Estado da aplicação")
add("* O estado global de sessão e usuário é injetado através da **Context API** (`AuthContext.tsx`).")
add("* Estados locais de UI nos componentes funcionais via `useState` e modais.")
add("---\n")

add("# 29. Fluxos principais")
add("## Preenchimento de Checklist")
add("```text\nMotorista escolhe o Veículo\n↓\nResponde os itens do questionário (pass/fail)\n↓\nAdiciona fotos se NOK\n↓\nEnvia. Cria registro em checklist_submissions\n```")
add("---\n")

add("# 30 a 34")
add("> Os fluxos estão espelhados nas implementações descritas acima nas respectivas seções. Tratamento de erro usa toasts / alertas nativos e consoles.")
add("---\n")

add("# 35. Variáveis de ambiente")
try:
    with open(".env.example", "r") as f:
        lines = f.readlines()
        add("```env")
        for line in lines:
            if '=' in line:
                key = line.split('=')[0]
                add(f"{key}=")
        add("```")
except:
    add("```env\nVITE_SUPABASE_URL=\nVITE_SUPABASE_ANON_KEY=\n```")
add("---\n")

add("# 36. Deploy")
add("* Deploy primário é configurado para ser feito na Vercel ou semelhante, sendo uma aplicação Node (Vite/React).")
add("---\n")

add("# 37. Dependências")
try:
    with open("package.json", "r") as f:
        pkg = json.load(f)
        deps = pkg.get("dependencies", {})
        for k, v in deps.items():
            add(f"- {k}: {v}")
except:
    add("Dependências não localizadas neste snippet.")
add("---\n")

add("# 38. Scripts")
try:
    with open("package.json", "r") as f:
        pkg = json.load(f)
        scripts = pkg.get("scripts", {})
        add("```bash")
        for k, v in scripts.items():
            add(f"npm run {k} # {v}")
        add("```")
except:
    add("Não mapeado.")
add("---\n")

add("# 39. Migrations")
add("A evolução do esquema ocorre via arquivos SQL iterativos na raiz (e.g. `schema.sql`, `phase_x_...sql`, `alter_*.sql`).")
add("---\n")

add("# 40. Triggers, Functions e Procedures")
add("Temos múltiplas funções listadas no SQL como `set_company_id_on_insert()` e triggers (e.g. `set_company_id_vehicles`) para assegurar integridade multitenant.")
add("---\n")

add("# 41. Integrações externas")
add("WhatsApp (API opcional / Mensageria indireta encontrada em `whatsappIntegration.ts`).")
add("---\n")

add("# 42. Funcionalidades incompletas")
add("Lava-jato listado na documentação não foi mapeado como módulo maduro no front-end.")
add("---\n")

add("# 43 a 47. Regras e Segurança")
add("Um veículo pertence a uma filial/empresa. Um checklist deve ser encerrado antes de um novo começar. Todo acesso DB exige autenticação e bate de company_id.")
add("---\n")

add("# 48. Guia para futuras IAs")
add("# Como uma IA deve trabalhar neste projeto")
add("1. Sempre analisar a documentação antes de alterar o sistema.")
add("2. Não criar tabelas duplicadas sem necessidade.")
add("3. Não alterar estruturas existentes sem verificar dependências.")
add("4. Não remover funcionalidades existentes.")
add("5. Não ignorar RLS.")
add("6. Atualizar `documentation.md` quando necessário.")
add("---\n")

add("# 49. Histórico de alterações da documentação")
add("## Changelog da documentação")
add("| Data | Alteração | Responsável |")
add(f"| {datetime.now().strftime('%Y-%m-%d')} | Documentação inicial (Auditoria integral do repositório) | IA |")
add("---\n")

with open("documentation.md", "w", encoding="utf-8") as f:
    f.write("\n".join(out))

