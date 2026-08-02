# Documentação do Sistema - Painel da Empresa

Este documento descreve as funcionalidades exatas presentes no painel administrativo de gestão da empresa, guiando-se estritamente pelas abas e telas construídas no sistema (arquitetura frontend React/Vite com retaguarda no Supabase). 

O painel é voltado para a administração de frota de uma única companhia (isolada das demais companhias, usando a premissa de `company_id`).

## 1. Abas de Operação Principais

### 1.1 Painel (Dashboard Geral/Overview)
A página inicial que fornece um resumo visual das métricas do sistema. Exibe contadores relevantes e atua como uma central de status (por exemplo, exibindo quais veículos têm pendências, o que precisa de atenção, e contagem de notificações).

### 1.2 Notificações
Lista todos os avisos gerados para o usuário administrativo ("Auto Alerts" ou avisos transacionais).

### 1.3 Monitoramento (Tracking)
Apresenta informações ou mapa de rastreamento da frota, com controle sobre a última localização reportada ou viagens ativas/planejadas.

### 1.4 Checklist (Submissões e Setup)
- **Histórico:** Permite analisar cada checklist submetido pelos motoristas (estado de aprovação/conforme ou não conforme, observações deixadas por eles e hora/data/km).
- **Setup:** Configuração exata das perguntas e categorias de vistoria que devem aparecer no aplicativo dos motoristas no momento do preenchimento.

### 1.5 Ranking
Mostra a pontuação e penalidades dos motoristas, calculando quais tiveram um bom desempenho de acordo com as regras de pontos definidas (ex: sistema de pontuação com perdas). 

### 1.6 Pendências (Manutenção)
Módulo centralizado de resolução de problemas mecânicos e documentais da frota.
- **Alertas Automáticos (Auto Alerts):** Os veículos com manutenção pendente ou checklists reprovados geram alertas. 
- **Resolução de Pendências:** O administrador pode selecionar uma pendência e lançar a resolução. 
- **Integração com Estoque:** Ao resolver uma pendência que envolve peças, o administrador seleciona os itens e suas respectivas quantidades, informando o custo unitário. O sistema automaticamente gera saídas (`transactions de out`) de estoque e ajusta o inventário (dando a baixa no estoque). 

### 1.7 Estoque (Inventário)
Módulo gerencial de peças consumidas na garagem ou operação.
- **Peças e Insumos:** Cadastro dos itens (`inventory_items`) controlando a Quantidade Atual, Quantidade Mínima Prevista, Preço Médio e SKU. 
- **Fornecedores:** Gestão da lista de empresas (`inventory_suppliers`) das quais as peças são compradas, permitindo vincular CPNJ/telefone.
- **Lançamento de Notas Fiscais (NFs / Entrada):** Interface de "Lançar Entrada", permitindo selecionar um fornecedor, data, número da nota e informar cada peça comprada com seu valor e quantidade. Ao finalizar o lançamento, ocorre o cálculo recalculando o `average_cost` (Custo Médio Ponderado das Peças) e inserindo o "tipo in" no relatório de movimentação do inventário.

### 1.8 Abastecimento (Fuel)
Centraliza dados dos reabastecimentos ocorridos, seja importado de integrações de bomba, relatórios do motorista com foto, ou lançamentos avulsos de consumo e KM (Hodômetro).

### 1.9 Médias
Aba exibida se o administrador tiver os direitos compatíveis; foca nos consumos de médias dos veículos (km/L).

### 1.10 Escalas (Schedules)
Permite ao gestor criar, alterar ou visualizar a agenda de viagem ou turno alocada aos Motoristas em Veículos específicos.

### 1.11 Relatório Gerencial e Auditoria
- **Relatório Gerencial:** Métricas consolidadas e exportáveis (tabelas/listas de custos e status) para fins contábeis e de performance.
- **Auditoria:** Módulo restrito ao nível "admin" exibindo trilha de ações executadas pelos usuários dentro do painel da empresa, útil para rastreabilidade de quem mudou um registro (roda sob um service de *Silent Audit*).

## 2. Abas de Cadastros Base

Na barra de navegação auxiliar de Cadastros ("Registros"), temos:
- **Filiais (`branches`):** Cadastro e gestão das unidades e filiais da empresa (Nome, CNPJ, Código interno, CEP, Endereço, Bairro, Cidade, Estado e Status Ativo/Inativo).
- **Usuários Admin (`adm_users`):** Controle dos perfis de outras pessoas do backoffice que usam o painel, controlando suas permissões, tipo de acesso (Admin, Supervisor, etc.) e filial atribuída.
- **Motoristas (`drivers`):** Listagem e adição do time de condutores com dados pessoais, CNH, perfil de pontuação e filial vinculada.
- **Veículos (`vehicles`):** Ficha técnica do patrimônio (placa, chassi, documento, modelo, modalidade, tipo e filial atribuída). 
- **Rotas (`routes`):** Configuração de caminhos padrões ou bases de viagem.
- **Iscas (`baits`):** Gerencia os rastreadores secundários colocados em cargas ou caixas, vinculando-os à frota principal.
- **Alertas (`alerts`):** Configuração paramétrica de regras para as pendências que vão para o Auto Alerts automáticos do sistema (como aviso de km vencida baseado no Hodômetro registrado). 
- **Opções de Perfil (Configurações/Feedback):** Definições de pontuação (ex: perda de 50 pontos). 

## 3. Isolamento, Segurança e Operações Subjacentes

- **Controle RLS por Company:** Todos os cadastros citados (Estoques, Veículos, Motoristas, Configurações de Checklist e Custos) usam um código interno atrelado à Empresa, de modo que nenhuma informação pode vazar entre uma frota A e uma frota B hospedada no mesmo sistema.
- **Hodômetro Dinâmico:** Os hodômetros dos veículos são baseados no último checklist validamente submetido; essa KM serve de balizador para cálculos de desgaste nas Pendências e Abastecimentos.
- **Auditoria de Background (Silent Audit):** O sistema dispara pings eventuais assíncronos e transparentes que gravam sessões de uso dos administradores para manter o histórico de acessos validado silenciosamente.
