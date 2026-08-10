import json
import os
from datetime import datetime

out = []
def add(s): out.append(s)

add("\n---\n")
add("# 22. Diagrama do banco")
add("```text\ncompanies (tenant base)\n │\n ├── saas_plans\n ├── profiles (users)\n │\n ├── vehicles\n │    ├── checklist_submissions\n │    │    └── checklist_answers\n │    ├── vehicle_averages\n │    └── alerts (maintenance)\n │\n └── inventory_items\n      └── inventory_transactions\n```")
add("\n---\n")

add("# 23. RLS — Row Level Security")
add("* A maioria das tabelas possui políticas restritivas (`FOR SELECT TO authenticated USING (true)` ou comparando o `company_id`).")
add("* **Nova Segurança**: Triggers `set_company_id_on_insert()` automatizam a inserção da empresa correta em cada registro, mitigando erros onde inserts falhariam o RLS.")
add("* Muitas políticas requerem validação pelo contexto do usuário logado (ex. `auth.uid()`).")
add("\n---\n")

add("# 24. Storage")
add("* Buckets inferidos:")
add("  * `checklist-photos`: Armazena evidências de checklists NOK.")
add("  * `signatures`: Assinaturas digitais de motoristas.")
add("  * `receipts`: Notas ou comprovantes de combustível.")
add("\n---\n")

add("# 25. APIs e Services")
add("* As requisições são diretas pelo SDK `@supabase/supabase-js` em custom hooks ou funções (`src/lib/supabase.ts`).")
add("* `src/lib/auditService.ts`: Serviço auxiliar para inserção de log de auditoria em `audit_logs`.")
add("\n---\n")

add("# 26. Hooks")
add("* `usePersistentState` (`src/hooks/usePersistentState.ts`): Salva o state localmente em `localStorage` para navegação contínua entre sessões.")
add("* `useAuth` (`src/modules/shared/contexts/AuthContext.ts`): Retorna as permissões do usuário logado e metadados (`user.company_id`, `user.role`).")
add("\n---\n")

add("# 27. Componentes importantes")
add("* `AppLayout` / `DriverLayout`: Shell principal renderizando sidebar de navegação e Header.")
add("* `ProtectedRoute`, `CompanyGuard`: Proteção de rota impedindo que Motoristas acessem views de Admin e vice-versa.")
add("* `MaintenanceTrackingPrintModal`: Componente que realiza renderização customizada de janela pop-up (portal) para tabelas de acompanhamento de manutenção. Acabamos de adicionar recurso de exportação Excel para ele.")
add("\n---\n")

add("# 28. Estado da aplicação")
add("* Global / Sessão: Context API (`AuthContext`, `AlertContext`).")
add("* Fluxo / UI: `useState` e modais condicionados (`showModal && <Modal />`).")
add("* Sem uso de Redux ou Zustand até o presente.")
add("\n---\n")

add("# 29. Fluxos principais")
add("## Fluxo de Checklists (Motorista)")
add("```text\nLogin\n↓\nEscolhe 'Checklist Saída' ou 'Chegada'\n↓\nSeleciona Placa do Veículo\n↓\nAtualiza KM\n↓\nResponde Itens de Inspeção (Limpeza, Óleo, Pneus...)\n↓\nSe NOK, obriga observação e foto\n↓\nFinaliza (Submission e Answers salvos no BD)\n```")
add("\n---\n")

add("# 30 a 33. Fluxos Operacionais (Admin)")
add("## Manutenção & Ocorrências")
add("```text\nItem do Checklist é apontado como NOK\n↓\nSurge Alerta no Monitoramento (IssuesTab)\n↓\nAdmin avalia e define status (Em Analise -> Agendado -> Resolvido)\n↓\nAdmin informa custo da peça/serviço e salva\n↓\n(Custo entra nos indicadores de BI e relatório de manutenção)\n```")
add("\n---\n")

add("# 34. Tratamento de erros")
add("* Erros de Auth: Capturados pelo AuthContext, geram redirecionamento (Redirect) para `/login`.")
add("* Erros de Requisição (Supabase): Tratados em blocos `try/catch`, reportados com mensagens estilo `alert(...)` ou `console.error`.")
add("* Erros de Validação: Avisos no front-end na hora de submeter o form.")
add("\n---\n")

add("# 35. Variáveis de ambiente")
add("```env")
add("VITE_SUPABASE_URL=")
add("VITE_SUPABASE_ANON_KEY=")
add("```")
add("\n---\n")

add("# 36. Deploy")
add("* O deploy é comumente executado em Vercel ou host compatível com Vite SPA (SPA Fallback para roteamento ativado).")
add("* Configuração em `vercel.json` (rewrites para `/index.html`).")
add("\n---\n")

add("# 37. Dependências")
add("* `react` e `react-dom`")
add("* `@supabase/supabase-js`")
add("* `react-router-dom`")
add("* `lucide-react` (Ícones)")
add("* `recharts` (Gráficos)")
add("* `xlsx`, `jspdf`, `jspdf-autotable` (Exportação e Relatórios)")
add("* `date-fns` (Manipulação de horas/datas)")
add("* `react-hook-form` (Alguns formulários avançados)")
add("\n---\n")

add("# 38. Scripts")
add("```bash")
add("npm run dev      # Roda o app localmente via vite")
add("npm run build    # Compila a SPA para /dist")
add("npm run preview  # Serve a pasta /dist para debug")
add("```")
add("\n---\n")

add("# 39. Migrations")
add("O versionamento do BD no Supabase (se existente) ou em scripts soltos na raiz (ex: `alter_multiempresa.sql`, `alter_saas_plans.sql`) define a evolução. Políticas e tabelas foram injetadas ativamente nesses scripts de setup.")
add("\n---\n")

add("# 40. Triggers, Functions e Procedures")
add("* `set_company_id_on_insert()`: Associa novos registros ao Tenant de quem os criou automaticamente.")
add("* **Restrições Multi-Tenant** foram aplicadas via esse trigger na maioria das tabelas operacionais (`vehicles`, `checklist_submissions`, `inventory_items`, etc).")
add("\n---\n")

add("# 41. Integrações externas")
add("Nenhuma integração complexa (como gateways de pagamento) mapeada de forma madura, uso de APIs de serviço (ex. viacep, se hover), e possivelmente integração básica WhatsApp/Mensageria (arquivos como `whatsappIntegration.ts`).")
add("\n---\n")

add("# 42. Funcionalidades incompletas")
add("* Lava-Jato não implementado no fluxo atual.")
add("* Funcionalidades que citam pagamentos (Planos SaaS) parecem ser controles manuais em BD por enquanto, sem integração com Stripe ou Asaas ativa no front-end.")
add("\n---\n")

add("# 43 a 46. Problemas conhecidos, Regras e Dependências")
add("## Dívidas / Problemas")
add("* O componente `MaintenanceTab` está muito longo, contendo diversas modais renderizadas condicionalmente inline.")
add("* **Recomendação**: Refatorar modais (ex: `MaintenanceTrackingPrintModal` separou logicamente parte da UI, mas ainda há lógica acoplada).")
add("## Regras Core")
add("* **Multi-tenant**: Todo registro pertence a uma `company_id`. Jamais ignore essa regra ao inserir/alterar.")
add("* **Hodômetro Sequencial**: Ao aprovar/enviar um checklist ou abastecimento, o KM atual não pode ser inferior ao último registrado pelo veículo no banco.")
add("\n---\n")

add("# 47. Segurança")
add("* Dados expostos via RLS restritivo apenas aos tokens autenticados que pertencem à empresa `company_id` vinculada.")
add("* Nenhuma chave secreta foi detectada no código client-side.")
add("\n---\n")

add("# 48. Guia para futuras IAs")
add("# Como uma IA deve trabalhar neste projeto")
add("1. **Sempre analisar a documentação antes de alterar o sistema**: Use este arquivo (`documentation.md`) como norte.")
add("2. **Não criar tabelas duplicadas sem necessidade**: Revise a seção de DB para reaproveitar estruturas.")
add("3. **Não alterar estruturas existentes sem verificar dependências**: Ao mexer na tabela `vehicles`, lembre-se que ela afeta checklists, manutenções e abastecimentos.")
add("4. **Não ignorar RLS**: Toda query backend ou script SQL deve considerar o Multi-Tenant e suas triggers.")
add("5. **Não inventar campos ou IDs incompatíveis**: Se um modal recebe string e envia para UUID, adote o casting correto.")
add("6. **Atualizar `documentation.md`** caso realize mudanças drásticas estruturais ou de RLS.")
add("7. **Não expor secrets**: Jamais preencha valores reais em `env.example` ou referencie senhas.")
add("\n---\n")

add("# 49. Histórico de alterações da documentação")
add("```markdown")
add("## Changelog da documentação")
add("| Data       | Alteração                             | Responsável |")
add(f"| {datetime.now().strftime('%Y-%m-%d')} | Documentação técnica completa gerada. | IA          |")
add("```")

with open("documentation.md", "a", encoding="utf-8") as f:
    f.write("\n".join(out))

