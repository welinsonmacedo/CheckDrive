# Sugestões de Melhorias e Evolução do Sistema

Este documento apresenta uma análise técnica da estrutura atual do sistema e propõe uma lista de melhorias arquiteturais, de experiência do usuário (UI/UX), segurança e otimização de banco de dados para elevar o projeto a um nível ainda mais robusto e escalável.

---

## 1. Arquitetura de Software e Limpeza do Projeto

### 📦 Consolidação de Scripts e Organização do Diretório Raiz
- **Problema atual:** O diretório raiz do projeto contém dezenas de arquivos de script soltos (`alter_db*.js`, `test_*.js`, `phase_*.sql`), o que polui o workspace e gera confusão sobre quais scripts estão ativos na produção ou são legados.
- **Melhoria proposta:**
  - Mover todos os arquivos de script de banco de dados (`alter_...`) e arquivos de teste para pastas dedicadas (ex.: `/database/migrations` ou `/scripts/legacy_tests`).
  - Limpar arquivos redundantes para manter o workspace limpo e focado no código da aplicação.

### 🧩 Componentização e Hooks Customizados (AveragesTab)
- **Problema atual:** Componentes como `AveragesTab.tsx` possuem mais de 1000 linhas, acumulando responsabilidades como: busca de dados, cálculos complexos de médias com proporção, renderização de filtros, visualização gráfica, renderização de tabelas e gerenciamento de formulário de edição.
- **Melhoria proposta:**
  - **Extração de Componentes:** Dividir a aba em subcomponentes menores e puros:
    - `<AveragesFilters />`: filtros de veículo, motorista e datas.
    - `<AveragesCharts />`: gráficos e cartões de resumo dos consumos.
    - `<ScheduleAveragesTable />`: tabela com histórico de escalas e abastecimentos.
    - `<ScheduleEditModal />`: formulário modular para ajuste de odômetro, litros, vínculos e motorista/veículo.
  - **Hooks Customizados:** Criar ganchos dedicados para isolar a regra de negócio lógica, ex.:
    - `useFuelAverages`: centraliza o processamento e cálculo do rateio de combustível com base nas escalas vizinhas.
    - `useSchedulesMutations`: centraliza as atualizações de escalas no Supabase.

---

## 2. Otimização de Performance e Banco de Dados

### ⚡ Processamento de Rateio via Postgres Views (Server-Side)
- **Problema atual:** Toda a lógica de proporcionalidade de combustível (pegar uma entrega de combustível, encontrar as escalas correspondentes ao período, calcular a soma dos hodômetros e ratear os litros pela distância proporcional) é executada em memória no navegador (Client-Side). Isso causa lentidão quando há milhares de registros.
- **Melhoria proposta:**
  - Migrar o cálculo de rateio para uma **View** ou **Store Procedure** (Database Function) no Postgres.
  - O frontend passaria a consumir uma rota optimizada que já retorna a "distância real calculada por escala", "litros efetivos" e "Km/L" sem precisar baixar as checklist-submissions brutas do motorista.

### 🗄️ Gerenciamento de Estado com React Query
- **Problema atual:** Chamadas diretas ao cliente do Supabase dentro de blocos de `useEffect` sem cache ativo. Isso pode gerar múltiplas chamadas concorrentes desnecessárias ou deixar a tela em branco enquanto aguarda o resultado do carregamento.
- **Melhoria proposta:**
  - Implementar o **React Query (`@tanstack/react-query`)**.
  - Garantir invalidação automática de cache apenas quando o usuário edita uma escala.
  - Carregamento instantâneo via cache em transições de abas, melhorando acentuadamente a percepção de velocidade do app.

---

## 3. UI/UX (Experiência do Usuário)

### 🔔 Notificações Visuais (Toasts) em vez de Alerts Físicos
- **Problema atual:** O sistema utiliza `alert('Escala e abastecimento atualizados com sucesso!')` nativo do navegador, o que interrompe fluxo do usuário, prejudica a usabilidade mobile e quebra a identidade visual moderna do design.
- **Melhoria proposta:**
  - Substituir todos os `alert(...)` e `confirm(...)` por notificações animadas elegantes utilizando a biblioteca **Sonner** ou **react-hot-toast**.
  - O visual se beneficiará de pequenos alertas suspensos informando o sucesso ("Escala ajustada com sucesso!") ou erros técnicos com botões de retry amigáveis.

### 🔘 Formulário de Interface Assistida e Validação Real-Time
- **Problema atual:** Ajustar um abastecimento manual necessita preencher inputs numéricos crus sem avisos claros se a quilometragem final inserida é menor que a quilometragem inicial (o que causaria cálculo de distância negativa).
- **Melhoria proposta:**
  - Validação inline em tempo real que bloqueia o botão de salvar e avisa em vermelho: *"Atenção: O hodômetro final não pode ser menor que o hodômetro inicial"*.
  - Indicação clara se os litros editados vão alterar o consumo histórico de outras escalas vinculadas ao mesmo abastecimento.

---

## 4. Segurança, Testes e Robustez

### 🧪 Testes Unitários de Lógica de Rateio
- **Melhoria proposta:**
  - Como a regra de rateado de litros por escala envolve cálculos lógicos cruciais de quilometragem e condições de contorno (ex: veículo sem combustível anterior cadastrado), implementar testes unitários de lógica pura (`Vitest` ou `Jest`) para testar os casos de uso:
    1. Escala única sem combustível correspondente.
    2. Escala com combustível correspondente e quilometragem padrão.
    3. Múltiplas escalas no mesmo intervalo de combustível (verificar se a soma dos litros rateados confere precisamente com o abastecido).
    4. Escalas com odômetros/litros ajustados manualmente (para garantir que os valores manuais sobressaiam sobre os automáticos).

### 🛡️ Auditorias de Lock Contínuo (RLS)
- Garantir que as políticas de Segurança de Linha do Postgres (RLS) reforcem que os administradores pertencentes à empresa X só consigam realizar atualizações e modificações em escalas pertencentes à frota da mesma empresa X (pilar de multiempresa SaaS integrado de ponta a ponta).
