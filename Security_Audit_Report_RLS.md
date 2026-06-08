# Relatório de Auditoria de Segurança: Supabase RLS (Row Level Security)

Auditoria profunda executada contra as políticas de banco de dados e os scripts migratórios do sistema CheckDrive.
Abaixo detalhamos todas as falhas de segurança estrutural localizadas. Nenhuma alteração foi realizada automaticamente durante esta análise conforme solicitado.

## 🔴 Vulnerabilidades Críticas (Critical)

### 1. Escalada de Privilégios Imediata (Profile Manipulation)
* **Policy Relacionada:** `"Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);`
* **Descrição/Impacto:** Qualquer usuário autenticado (como um motorista) pode formular uma requisição `PATCH` diretamente para a API REST do Supabase e atualizar **todas** as colunas de sua linha na tabela `profiles`. Como não há restrição de colunas ou `WITH CHECK` restritivo para regras essenciais, um condutor padrão pode injetar em seu próprio registro o payload `{"role": "superadmin", "company_id": "<uuid_de_outra_empresa>"}` e obter acesso administrativo global em qualquer parte do sistema.
* **Justificativa Técnica para Futura Correção:** O PostgreSQL/Supabase não filtra colunas implicitamente em policies baseadas na linha (`UPDATE`). A policy deve ser reescrita para permitir a alteração de dados pessoais desde que os campos sensíveis (`role`, `company_id`, `score_profile_id`, `participates_in_ranking`) permaneçam os mesmos do valor original da view: ou seja, exigindo um escopo estrito via Triggers impeditivas, ou bloqueando a mutação via RLS Avançada.

### 2. Bypass de Multi-Empresas (Cross-Tenant Data Tampering)
* **Functions Relacionadas:** `is_admin()` e `is_manager()` refatoradas no arquivo de migração SaaS.
* **Policies Relacionadas:** Estruturas baseadas em `USING (is_admin())` e `USING (is_manager())` (presentes no arquivo central de schema).
* **Descrição/Impacto:** O script de introdução ao SaaS estabeleceu a coluna `company_id` mas não executou comandos `DROP POLICY` nas policies genéricas mais antigas. Por consequência, a diretriz permite acesso livre a quem repassar o teste verdadeiro de "role". Um `admin` orgulhosamente pertencente à "Empresa A" consegue gerenciar/apagar rotas, veículos, checklist submissions, e trailers de maneira arbitrária da "Empresa B", quebrando totalmente a proteção entre inquilinos.

### 3. Mutação Cruzada por Motoristas Oponentes
* **Policy Relacionada:** `"Drivers can update issues" ON public.checklist_issues FOR UPDATE TO authenticated USING (true);`
* **Descrição/Impacto:** A instrução de banco adota `USING (true)` para `UPDATE` sem requalificação em blocos `WITH CHECK`. Sem restrição de autoridade, todo condutor portando um token da sessão ativa consegue fechar defeitos (`status = 'resolved'`), alterar ou desfigurá-los nos chamados (`checklist_issues`) de quaisquer motoristas (mesmo em frotas e transportadoras concorrentes).

---

## 🟠 Vulnerabilidades Altas (High)

### 4. Vazamento Global de Dados Sensíveis (`USING (true)`)
* **Policies Relacionadas:** Políticas descritivas `"Public Read"` ou equivalentes espalhadas sobre tabelas nevrálgicas (`vehicles`, `routes`, `schedules`, `trailers`, `checklist_types`, `app_settings`, `driver_performance`, `checklist_issues`).
* **Descrição/Impacto:** Essas tabelas suportam unânime permissão `FOR SELECT TO authenticated USING (true)`. Logo, qualquer conta ativa enxergará o banco de dados do SAAS na íntegra. Ferramentas que monitoram telemetria de tráfego passivo poderiam ser induzidas para colapsar lógicas intelectuais das transportadoras (extração em massa dos veículos e rotas globais concorrentes da plataforma inteira).

### 5. Exposição Completa de Evidências Fotográficas (Storage Buckets)
* **Componente:** Supabase Storage (`storage.objects` e sub-módulos para envio em `checklist-photos`).
* **Descrição/Impacto:** Ao mapear a arquitetura infraestrutural relacional e o frontend atual, nota-se supressão severa de referências limitantes quanto ao tráfego do Bucket. Não havendo proteção restrita a pastas baseadas no ID do inquilino ou regras integradas usando `(storage.foldername(name))[1]`, qualquer conta maliciosa pode listar itens e até possivelmente exfiltrar notas fiscais comissionadas, dados dos odômetros sensíveis, e placas em tempo real (caso as URLs base do backend e do token cheguem a vazar deliberadamente na máquina do motorista).

---

## 🟡 Vulnerabilidades Médias (Medium)

### 6. Subversão Tácita em SECURITY DEFINER
* **Functions Relacionadas:** `get_database_stats()`.
* **Descrição/Impacto:** Esta sub-rotina RLS extrai dados estruturais do banco (pesos integrais de banco e buckets, quantias de arquivos transacionadas), sem verificar o `auth.uid()`. Pode se classificar como um sub-período do Bypass, auxiliando táticas exploratórias, mesmo de baixa recompensa direta, para mineração em falhas combinadas.

### 7. Atualização Sem Trânsito Seguro para Tabelas Cruciais
* **Tabelas Afetadas:** `"Managers can update schedules" FOR UPDATE USING (is_manager() OR auth.uid() = driver_id);`
* **Descrição/Impacto:** Sem uma regra `WITH CHECK`, a motoristas é confiada autonomia para remoldarem suas escalas cadastradas (`schedules`). Isso reflete numa brecha capaz de sabotá-las com dados fraudulentos ao modificarem implicitamente a placa, rota atrelada e os identificadores de veículos, já que `UPDATE` em todas as colunas é viável na RLS nativa.

---

## 🟢 Vulnerabilidades Baixas (Low)

### 8. Subversão Genérica nas Triggers Faltantes
* **Descrição/Impacto:** Uma trigger de Multi-Empresas foi instanciada (`set_company_id_on_insert`), atuando no fluxo `BEFORE INSERT` para anexar silenciosamente o inquilino à entidade gerada. No entanto, o design desconsidera operações de `UPDATE`. Um motorista logado ainda conseguiria mudar o locatário se explorado o canal de manipulação das outras vulnerabilidades, indicando a necessidade de triggers equivalentes que previnam re-locações por intermédio reverso.

### 9. Restrições Brandas no Fechamento Automático e Administrativo
* **Descrição/Impacto:** Tabelas contábeis de pontuação de condutores possuem um sistema administrativo genérico sem acoplamento à locação das empresas nos `score_closings`, expondo os perfis base do RLS em caso de manutenção rotineira por API.

---

**Conclusão e Recomendações**: 
* É mandatário aplicar a estratégia **Drop and Replace**. 
* Extinguir funções `USING (true)` para ambientes de inquilinos divididos, reescrevendo sob o estribo da função `can_access_company(company_id)`.
* Trancar a tabela nativa de Profiles elaborando limites à instrução `UPDATE` (e.g. bloqueando atualizações aos campos arbitrários e de privilégios como `role = 'superadmin'`). 
* O panorama apontado requer uma revisão na fonte (Backend) antes que a Plataforma assuma expansão em rede. Nenhuma correção é necessária no código React do App (Client-Side), a correção será 100% nas defesas SQL do Supabase.
