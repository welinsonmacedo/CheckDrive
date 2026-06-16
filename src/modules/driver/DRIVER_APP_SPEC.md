# CARGA BRASIL - ESPECIFICAÇÃO TÉCNICA E REQUISITOS DO APP DO MOTORISTA (KOTLIN/APK)

> **Aviso para Inteligência Artificial:** Use este documento como a verdade absoluta (Single Source of Truth) para conceber, desenvolver e testar a versão nativa em Kotlin (Android) do Painel Operacional do Motorista, espelhando com precisão milimétrica todas as regras de negócio, layouts bento-grid, fórmulas aritméticas de médias, de pontuação e de mascaramento vigentes na aplicação web em React.

---

## 1. ESCOPO E MÓDULOS DO APLICATIVO

O aplicativo nativo do motorista deve ser desenvolvido utilizando **Jetpack Compose** para a interface de usuário baseada no padrão de design bento moderno (cartões arredondados, contrastes profundos, tipografia limpa) e arquitetura recomendada pelo Android (**MVVM** com StateFlow e Coroutines).

O app é composto por **6 telas principais** acessíveis via **Bottom Navigation** (nas cores cinza cromo `/zinc` e azul primário para elementos ativos) e uma navegação de fluxo específico para preenchimento de checklist:

1. **Início (Home):** Resumo do motorista, escalas ativas, e cards de acesso rápido a checklists (bloqueados se houver escala ativa pendente).
2. **Médias (Averages/Fuel):** Histórico de médias de consumo calculado com base em abastecimentos revisados.
3. **Classificação (Ranking):** Top 20 dos motoristas do mesmo perfil de pontuação.
4. **Descontos (Penalties/Audit):** Log de auditoria de penalidades aplicadas ao motorista no mês ativo.
5. **Alertas (Notifications):** Notificações de auditoria e alertas automáticos de vencimento de itens ou revisão de KM.
6. **Perfil (Profile):** Dados cadastrais do motorista logado e função de Sair (Logout).
7. **Fluxo do Checklist (Checklist Flow):** Fluxo assistido de 4 etapas para envio de vistorias com fotos comprimidas e controle rigoroso de odômetro.

---

## 2. ARQUITETURA DE DADOS E CONEXÃO SUPABASE
Todo o app se comunica com o Supabase utilizando autenticação JWT. Os dados das tabelas abaixo devem ser expostos localmente via banco de dados **Room** para viabilizar operação e rascunho offline.

### Modelos de Dados (Esquema de Tabelas de Origem)

#### `profiles`
*   `id` (UUID, PK) - Relacionado com Auth do Supabase.
*   `full_name` (Text)
*   `role` (Text) - Deve ser obrigatoriamente `'driver'`.
*   `score_profile_id` (UUID) - Perfil de pontuação do motorista (filtra o ranking).
*   `participates_in_ranking` (Boolean) - Se `false`, oculta o motorista da classificação.
*   `company_id` (UUID) - Empresa vinculada ao motorista.
*   `modality_ids` (UUID[]) - Lista de modalidades permitidas (filtra veículos e rotas disponíveis).

#### `driver_performance`
*   `driver_id` (UUID, PK, FK `profiles.id`)
*   `score` (Numeric) - Pontuação/saldo atual do motorista.

#### `schedules` (Escalas)
*   `id` (BigInt, PK)
*   `driver_id` (UUID, FK `profiles.id`)
*   `vehicle_id` (UUID, FK `vehicles.id`)
*   `trailer_id` (UUID, FK `trailers.id`)
*   `route_id` (UUID, FK `routes.id`)
*   `start_at` (Timestamp)
*   `end_at` (Timestamp)
*   `start_checklist_id` (UUID, FK `checklist_submissions.id`)
*   `end_checklist_id` (UUID, FK `checklist_submissions.id`)
*   `fuel_checklist_id` (UUID, FK `checklist_submissions.id`)
*   `requires_fueling` (Boolean) - dita se o checklist de Abastecimento é obrigatório nesta escala.

#### `vehicles`
*   `id` (UUID, PK)
*   `plate` (Text) - Placa do veículo (padrão Mercosul/Antigo).
*   `model` (Text) - Modelo/marca.
*   `requires_trailer` (Boolean) - Exige reboque se `true`.
*   `modality_id` (UUID) - Modalidade vinculada.
*   `active` (Boolean)

#### `trailers` (Reboques)
*   `id` (UUID, PK)
*   `plate` (Text) - Placa.
*   `model` (Text)
*   `active` (Boolean)

#### `routes`
*   `id` (UUID, PK)
*   `origin` (Text)
*   `destination` (Text)
*   `stops` (Text[]) - Cidades de parada. Se contiver elementos com o prefixo `"__MODALITY:UUID"`, filtra de acordo com as modalidades do motorista.
*   `active` (Boolean)

#### `checklist_submissions`
*   `id` (UUID, PK)
*   `driver_id` (UUID, FK)
*   `vehicle_id` (UUID, FK, nulo se vistoria de carreta isolada)
*   `trailer_id` (UUID, FK)
*   `route_id` (UUID, FK)
*   `type` (Text) - Tipo de checklist (`'start' | 'end' | 'fuel' | 'yard'`)
*   `odometer` (Integer)
*   `latitude` / `longitude` (Numeric, opcional)
*   `photos` (JSON) - Caminhos correspondentes no Storage (`front`, `back`, `left`, `right`, `odometer`)
*   `receipt_photo_url` (Text) - Caminho da foto do cupom de combustível.
*   `status` (Text) - `'concluido'` ou `'com_defeitos'`.
*   `company_id` (UUID)
*   `details` (JSON) - Dicionário contendo respostas cruciais (`itemValues`, `itemTitles`, `manualTrailerPlate`).

#### `checklist_issues`
*   `id` (UUID, PK)
*   `submission_id` (UUID)
*   `vehicle_id` / `trailer_id` (UUID, conforme a origem do item)
*   `driver_id` (UUID)
*   `item_title` (Text) - Nome do item inspecionado.
*   `description` (Text) - Texto do defeito.
*   `photo_url` (Text) - Foto do defeito no Storage.
*   `status` (Text) - `'pending' | 'resolved'`.
*   `existing_issue_id` (UUID, opcional caso seja reincidência sincronizada)

#### `audit_logs` (Descontos/Contestações)
*   `id` (UUID, PK)
*   `driver_id` (UUID)
*   `amount` (Numeric) - Valor do desconto (pontos/moeda).
*   `reason` (Text) - Motivo detalhado.
*   `type` (Text) - `'penalty' | 'manual'`.
*   `created_at` (Timestamp)

#### `auto_alerts` (Alertas de Manutenção/Datas)
*   `id` (UUID, PK)
*   `title` (Text)
*   `trigger_type` (Text) - `'date' | 'km'`
*   `trigger_date` (Date, se tipo 'date')
*   `warning_days` (Integer) - Antecedência em dias para gerar o alerta.
*   `interval_km` / `last_km` / `warning_km` (Integer, se tipo 'km')
*   `target_vehicle_id` (UUID)
*   `active` (Boolean)
*   `generate_issue` (Boolean) - Se ativo, gera automaticamente um item em `checklist_issues` no submit.

---

## 3. ESPECIFICAÇÃO DE TELAS E REGRAS DE NEGÓCIO

### 3.1 Tela: Início (DriverHome)
Interface bento-grid com visualização rápida e limpa de informações táticas.

*   **Status de Perfil:**
    *   Exibir Nome Completo do motorista em destaque e saudação dinâmica dependendo do horário do dia.
    *   Exibir o Card de Pontos/Saldo obtido da tabela `driver_performance`.
        *   Carregar `system_type` de `app_settings` (ID `'global'`). Se for `'cash'`, formatar saldo como moeda brasileira: `R$ X.XX`. Se for `'points'`, exibir valor bruto + sufixo `pts` (Ex: `1250 pts`).
        *   Caso o motorista possua `participates_in_ranking == false` no seu `profile`, este card de pontuação **deve ser oculto** da tela, exibindo apenas o card de estatísticas ("Checklists Mês").
    *   Exibir Card "Checklists Mês" contendo a contagem exata de envios efetuados pelo motorista logado no mês vigente.

*   **Destaque "Minhas Escalas" (Escalas Ativas):**
    *   Buscar em `schedules` todas as escalas do motorista onde `end_at >= inicio_do_dia` e `start_at <= fim_do_dia`.
    *   Se houver escalas ativas não ocultadas pelo motorista (verificar se o ID não consta no `localStorage` sob a chave de escalas fechadas/escondidas):
        *   Renderizar em lista interativa.
        *   Exibir Placa do Veículo e Ordem da Rota (Ex: "São Paulo - Porto Alegre").
        *   Horário de Início e Término.
        *   **Comportamento de Clique (Expansão):** Ao clicar, abre o submenu contendo as ações obrigatórias e sequenciais da escala:
            1.  **Início de Viagem:** Direciona para o checklist de início `/checklist/start?schedule_id=X`. Desabilita se já houver registro em `start_checklist_id`.
            2.  **Abastecimento:** Direciona para o checklist de combustível `/checklist/fuel?schedule_id=X`. Só exibe se a escala possuir `requires_fueling == true`. Desabilita se já preenchido (`fuel_checklist_id`).
            3.  **Fim de Viagem:** Direciona para o checklist de encerramento `/checklist/end?schedule_id=X`. Desabilita se já preenchido original (`end_checklist_id`).
    *   **Bloqueio de Vistorias Avulsas:**
        *   O app possui um Grid de Vistorias Avulsas na parte inferior ("Operação Diária") composto por: *Início de Viagem*, *Abastecimento* e *Fim de Viagem*.
        *   **REGRA CRÍTICA:** Se o motorista possuir **qualquer escala ativa** listada para o dia de hoje, as vistorias avulsas **devem ser bloqueadas visualmente** (exibindo um estado "desabilitado" com opacidade reduzida e borda tracejada), forçando o preenchimento estrito e rastreável de dentro da escala ativa respectiva.
        *   Caso o motorista esteja marcado de forma interna (nome contém o sufixo `//INTERNO` no banco), exibir apenas o card de "Checklist de Pátio" (`'yard'`) sem bloqueio.

*   **Contador de Alertas Ativos (Badge de Notificações):**
    *   O ícone do sino na barra superior do cabeçalho deve carregar a soma de:
        1.  Problemas de checklist pendentes (`checklist_issues` com `status == 'pending'`). Para que o contador seja exato e livre de duplicidades, computar apenas issues cuja combinação de `vehicle_id` (ou `trailer_id`) e `item_title` seja única.
        2.  Alertas automáticos disparados (`auto_alerts` ativos e que passaram da linha de corte).

---

### 3.2 Fluxo de Checklist Dinâmico (ChecklistFlow)
Processo passo a passo (Step Indicator) dividido em 4 fases sequenciais para resguardar a qualidade e fidedignidade dos dados reportados.

```
Fase 0: Dados (Veículo/KM) ──> Fase 1: Fotos Externas ──> Fase 2: Itens Checklist ──> Fase 3: Resumo & Envio
```

#### Fase 0: Identificação
*   **Seleção do Veículo:** Dropdown carregando a frota vinculada da tabela `vehicles`.
*   **Seleção de Reboque/Carreta:** Dropdown carregando reboques da tabela `trailers`.
    *   **REGRA DE VEÍCULO EXIGENTE:** Se o veículo selecionado possuir a flag `requires_trailer == true`, o app **bloqueia a transição de etapa** obrigando a seleção de um reboque.
*   **Seleção de Rota:** Dropdown trazendo as rotas ativas. Se o perfil do motorista definir `modality_ids`, filtrar trazendo apenas rotas compatíveis.
*   **Preenchimento do Odômetro (KM):** Campo numérico restrito.
    *   **REGRA DE VALIDAÇÃO DE SINAL (KM MÍNIMO):** O app busca a última vistoria enviada para aquele veículo no banco (`checklist_submissions`). Se a quilometragem digitada for inferior ao último odômetro conhecido registrado (`lastKm`), exibe um alerta impeditivo, bloqueando a ida para o próximo passo.
    *   **REGRA DE KM MÁXIMO (LIMITE OPERACIONAL):** Verificar se `km_limit_enabled == true` nas configurações globais. Se ativo, calcular a diferença entre o KM digitado e `lastKm`. Se esta diferença superar `max_km_limit` (Ex: superior a 1500km rodados na mesma jornada), o app deve emitir um pop-up de aviso para confirmação visual do motorista, de modo a prevenir erros de digitação (Ex: digitar um dígito extra por engano).

#### Fase 1: Fotos Probatórias
*   **Checklist de Início/Fim:** Exigir fotos dos quatro quadrantes do veículo (`front` - Frente, `back` - Traseira, `left` - Lateral Esquerda, `right` - Lateral Direita).
    *   Se `require_external_photos == false` nas configurações globais, essa etapa pode ser considerada auto-válida, porém deve ser mantida na tela como opcional.
*   **Checklist de Abastecimento (`type == 'fuel'`):**
    *   Nesta modalidade, as fotos dos 4 ângulos são dispensadas.
    *   Exige-se obrigatoriamente a foto do **Odômetro no Painel** (`odometer`) e a foto do **Cupom Fiscal de Abastecimento** (`receipt`), exceto se `require_fuel_receipt_photo == false` para este último.

#### Fase 2: Inspeção de Itens (Físicos)
*   Nesta etapa, o app carrega os itens mapeados para o checklist ativo (`checklist_items` cujo `type_id` corresponde ao slug) ordenados por `order_index`.
*   Cada item possui um título, o qual deve ser decodificado usando a rotina `decodeItemTitle` (Ver Seção 4). Isso permite extrair o título limpo, máscaras especiais de entrada ou opções de lista.
*   **Controle de Estado do Item:**
    *   Para itens tradicionais (sem máscaras ou campos de escrita), exibir dois seletores coloridos, intuitivos e grandes para toque fácil no celular:
        *   `OK` (Salva valor como `'normal'`, fundo verde limpo).
        *   `Defeito` (Salva valor como `'defect'`, fundo vermelho crítico).
    *   Se o item possuir máscara ou campo de entrada numérica/texto (`input_type` igual a `'text'`, `'number'` ou contendo máscara), exibir um campo de texto formatado alinhado à direita para preenchimento.

*   **Sub-fluxo de Defeitos Detalhados:**
    *   Se o motorista marcar qualquer item como `Defeito` (fundo vermelho), abre-se abaixo uma Gaveta (Bottom Sheet) ou campo expansivo focado obrigando:
        1.  Breve descrição do defeito.
        2.  Captura obrigatoria de foto do dano físico constatado.
    *   **REGRA DE SINCRONIZAÇÃO DE DEFEITOS PREEXISTENTES:** Se o veículo selecionado possuir anomalias ativas listadas em `checklist_issues` (`status == 'pending'`), ao abrir o passo do checklist com os itens físicos, o app deve **pré-preencher as respostas preexistentes** e exibir um aviso em azul: *"Este defeito já foi reportado anteriormente"*. O motorista pode escolher manter ou atualizar a descrição e imagem. Isso evita que o motorista tenha o retrabalho de fotografar um amassado conhecido a cada jornada.

#### Fase 3: Resumo e Envio
*   Exibição direta e limpa das escolhas registradas para revisão geral.
*   Ao submeter, o aplicativo deve:
    1.  Efetuar o upload das imagens para o Storage do Supabase (bucket `checklist-photos`).
    2.  Registrar os dados na tabela `checklist_submissions` vinculando-os ao motorista e empresa, preenchendo todos os dados de JSON e placas manuais.
    3.  Inserir linhas individuais na tabela `checklist_issues` para cada defeito apontado na Fase 2 com as fotos atreladas.
    4.  Atualizar a parametrização da escala correspondente em `schedules` anotando o ID da vistoria no respectivo campo.
    5.  **Cálculo e Geração Automática de Alertas:** Caso o odômetro digitado atinja limites operacionais ou de datas estipulados nos alertas configurados em `auto_alerts`, registrar automaticamente o item de issue correspondente e acionar alertas no WhatsApp usando a lógica integrada.
    6.  Remover os rascunhos salvos no banco local (`Room` / `SharedPreferences`) para liberar memória.

---

### 3.3 Tela: Médias (DriverAverages)
Exibição exclusiva para que o motorista acompanhe suas médias de combustível já avaliadas e autorizadas pelos auditores da frota.

*   **REGRA DE VISIBILIDADE OPERACIONAL:** Se o motorista possuir `hideAverages == true` ou se for um motorista interno (`isInternal`), essa aba de médias **deve ser completamente oculta** do menu de navegação e bloqueada de ser aberta.
*   **Algoritmo de Cálculo de Médias Históricas:**
    *   Buscar todos os checklists do tipo abastecimento (`type == 'fuel'`) do motorista logado cujo `average_status` dentro do JSON de `details` seja igual à `'reviewed'` (revisados/validados pela retaguarda).
    *   Agrupar cliques por Veículo (`vehicle_id`) e ordenar as entradas de forma estritamente cronológica por data de criação (`created_at` ou, se disponível, `details.adjusted_date`).
    *   Para cada abastecimento sequencial de um mesmo veículo, calcular a quilometragem percorrida desde a última parada no posto:
        $$\Delta KM = (KM_{\text{Atual}} - KM_{\text{Anterior}})$$
    *   Caso haja ajuste manual de dados pela gerência administrativas, utilizar os campos saneados contidos do JSON de detalhes:
        *   Se `details.adjusted_liters` não for nulo/vazio, usar este valor no lugar da quantidade declarada.
        *   Se `details.adjusted_odometer` contiver valor, usar este no lugar do campo `odometer`.
    *   A média de consumo do trecho é expressa por:
        $$\text{Média (KM/L)} = \frac{\Delta KM}{\text{Litros}}$$
    *   Apresentar em tela o histórico em forma de lista com cartões Bento detalhando: Placa do veículo, Média obtida (Ex: `3.24 KM/L`), Litros injetados e data consolidada do abastecimento.

---

### 3.4 Tela: Classificação (Ranking)
Exibição saudável de performance para fomento de eficiência de condução no asfalto.

*   O Ranking reúne apenas motoristas cujo perfil de faturamento/pontuação seja igual ao perfil do motorista ativo (`profiles.score_profile_id`). O nome da categoria deve encabeçar o cabeçalho decorado com o ícone de medalha/troféu.
*   **Regras de Exclusão do Ranking:**
    *   Remover da listagem quaisquer motoristas que possuam `participates_in_ranking == false` em seus perfis.
    *   Remover do ranking motoristas que contenham o sufixo `'//INTERNO'` no campo de nome (`full_name`).
*   **Critério de Desempate Operacional:**
    *   A ordenação primária é feita por saldo de pontuação em ordem decrescente (`score DESC`).
    *   **REGRA DE DESEMPATE:** Se dois ou mais motoristas possuírem exatamente a mesma pontuação, o desempate na classificação dar-se-á pela contagem total de checklists gerados dentro do mês vigente (onde o motorista com mais checklists efetuados assume a melhor colocação).
*   Mostrar posições do primeiro ao vigésimo colocado (Top 20), usando design de destaque dourado com efeito sutil no pódio (Top 3).

---

### 3.5 Tela: Descontos (Penalties)
Exibe a consolidação de todas as ocorrências de débitos ocorridas e auditadas no mês corrente.

*   Buscar registros da tabela `audit_logs` correspondentes ao `driver_id` ativo, com tipo mapeado em `['penalty', 'manual']` e data de criação coincidente com o mês absoluto em curso.
*   **Soma Consolidada:** Apresentar no topo um painel vermelho arredondado, no maior bento-grid da tela, indicando o valor total descontado acumulado.
*   **Estado de Recompensa (Zero Multas):** Se a lista retornar perfeitamente zerada (sem nenhuma ocorrência no mês), ocultar tabelas e exibir uma animação/arte minimalista congratulando o motorista por sua retidão e segurança rodoviária: *"Excelente trabalho! Sem descontos neste mês."*

---

### 3.6 Tela: Alertas (DriverNotifications)
Visualização crítica de correspondências, manutenções e logs.

*   **Histórico de Logs de Auditoria:** Exibir logs que ditaram alterações na conta do motorista coletadas em `audit_logs`.
*   **Controle de Leitura Automática (Badging persistente):**
    *   Para registrar se o motorista leu e conferiu os comunicados, o app deve armazenar um histórico local de IDs conhecidos de alertas já renderizados no dispositivo do usuário (`localStorage` no formato stringificado `viewed_point_log_ids_${userId}`).
    *   Ao acessar a tela de notificações, os novos registros carregados do banco devem ser imediatamente anotados nesta chave local.
    *   O evento nativo de recarga deve ser disparado para purgar instantaneamente os badges de novos alertas exibidos no layout inferior e cabeçalho, prevenindo falsas indicações de notificações pendentes.

---

## 4. CÓDIGO FONTE DE MÁSCARAS E UTILS (MIGRADO DE REFERÊNCIA)

Nas seções seguintes estão descritas as rotinas nativas de decodificação de títulos e máscaras de dados digitados para transporte idêntico ao ambiente do Kotlin.

### 4.1 Utilitário de Decodificação de Título (`decodeItemTitle`)
Alguns itens de checklist vêm empacotados com metadados avançados, como regras de máscaras de entrada e opções enumeradas de escolhas no próprio campo do banco utilizando delimitadores de string especiais `::mask=` e `::options=`.

#### Versão Original em React/TypeScript:
```typescript
export function decodeItemTitle(rawTitle: string): { title: string, mask: string | null, options: string[] } {
  let title = rawTitle;
  let mask: string | null = null;
  let options: string[] = [];

  const optionsSplit = title.split('::options=');
  if (optionsSplit.length > 1) {
    title = optionsSplit[0];
    options = optionsSplit[1].split('|').filter(Boolean);
  }

  const maskSplit = title.split('::mask=');
  if (maskSplit.length > 1) {
    title = maskSplit[0];
    mask = maskSplit[1];
  }

  return { title, mask, options };
}
```

#### Transposição Direta para Kotlin (Implementação Obrigatória no App Android):
```kotlin
data class ChecklistItemMetadata(
    val title: String,
    val mask: String?,
    val options: List<String>
)

fun decodeItemTitle(rawTitle: String): ChecklistItemMetadata {
    var title = rawTitle
    var mask: String? = null
    var options: List<String> = emptyList()

    if (title.contains("::options=")) {
        val optionsSplit = title.split("::options=")
        if (optionsSplit.size > 1) {
            title = optionsSplit[0]
            options = optionsSplit[1].split("|").filter { it.isNotEmpty() }
        }
    }

    if (title.contains("::mask=")) {
        val maskSplit = title.split("::mask=")
        if (maskSplit.size > 1) {
            title = maskSplit[0]
            mask = maskSplit[1]
        }
    }

    return ChecklistItemMetadata(title.trim(), mask, options)
}
```

---

### 4.2 Máscara de Valores (`applyNumberMask` & `parseMaskedValue`)
Mecanismo para formatar a entrada de texto dinamicamente em conformidade com as regras operacionais predefinidas nas vistorias.

#### Transposição direta das funções de Máscara para Kotlin:
```kotlin
import java.text.NumberFormat
import java.util.Locale

fun applyNumberMask(value: String, mask: String?): String {
    if (value.isEmpty()) return ""
    if (mask == null || mask == "none") return value

    // Isola apenas números do input
    val numeric = value.replace(Regex("[^0-9]"), "")
    if (numeric.isEmpty()) return ""

    return when (mask) {
        "decimal", "currency" -> {
            val parsedDouble = numeric.toDoubleOrNull() ?: return ""
            // Divide por 100 para tratar os dois últimos números como centavos (fração flutuante)
            val amount = parsedDouble / 100.0
            val formatter = NumberFormat.getCurrencyInstance(Locale("pt", "BR"))
            
            if (mask == "decimal") {
                // Formato limpo indexado por vírgula sem o cifrão monetário R$
                formatter.maximumFractionDigits = 2
                formatter.minimumFractionDigits = 2
                formatter.format(amount).replace("R$", "").trim()
            } else {
                formatter.format(amount) // Retorna estruturado R$ 1.250,54
            }
        }
        "integer" -> {
            numeric.toLongOrNull()?.toString() ?: ""
        }
        else -> value
    }
}

fun parseMaskedValue(value: String, mask: String?): String {
    if (mask == null || mask == "none") {
        return value.replace(",", ".")
    }
    val numeric = value.replace(Regex("[^0-9]"), "")
    if (numeric.isEmpty()) return ""

    return when (mask) {
        "decimal", "currency" -> {
            val cents = numeric.toDoubleOrNull() ?: 0.0
            String.format(Locale.US, "%.2f", cents / 100.0)
        }
        "integer" -> {
            numeric
        }
        else -> value
    }
}
```

---

### 4.3 Validador de Arquivos (`validateFileUpload`)
Limitação rígida aplicável à captura de fotos pela câmera nativa do Android para evitar sobrecarga no banco de dados.

*   Tamanho máximo admitido por arquivo físico de foto: **5 MB**.
*   Extensões operacionais permitidas: `jpg`, `jpeg`, `png`, `webp`.

#### Implementação de Compressão de Câmera Recomendada no Android:
No fluxo de câmera do Android (utilizando **CameraX**), deve-se forçar o salvamento das fotos no formato JPEG com qualidade de amostragem reduzida a **75%** e redimensionamento proporcional limitando a maior dimensão a **1200px**. Isto replica integralmente a rotina `compressImageSafe` executada via Canvas no ambiente web HTML5, reduzindo o tráfego de dados de download pelas antenas de operadoras móveis em rodovias remotas.

---

## 5. ESTRATÉGIA OFFLINE E ARMAZENAMENTO COMPATÍVEL
Devido ao tráfego em locais sem qualquer recepção de sinal celular (áreas de sombra em autoestradas), o aplicativo deve ter robustez offline baseada nos seguintes pilares:

1.  **Draft de Fluxo de Inspeção (Persistent State):**
    *   A cada alteração feita pelo motorista nas Fases do Checklist, salvar o progresso atualizado de forma persistente.
    *   No Android, implementar utilizando a biblioteca **Jetpack DataStore** ou banco de dados **Room** sob chave indexada pelo ID da Escala correspondente.
    *   Se o usuário fechar o aplicativo abruptamente ou descarregar a bateria, ao reabrir o app e tocar para retomar, carregar os dados exatamente do ponto onde o usuário parou (restaurando respostas, fotos em diretório temporário interno do aparelho e step ativo).
    *   Expurgar os logs provisórios locais apenas após obter retorno positivo de consolidação no servidor HTTP (StatusCode 201/200 do Supabase).

2.  **Fila de Sincronização em Segundo Plano (Background Worker):**
    *   Implementar um sincronizador baseado no **WorkManager** do Android.
    *   Se o motorista tocar para enviar um checklist e o aparelho constatar ausência de conectividade:
        *   Salvar o envio em uma tabela interna de rascunhos pendentes do SQLite local (Room).
        *   Registrar um trabalho em segundo plano que aguardará conexão de rede estável (`Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED)`).
        *   Exibir uma notificação discreta no Android de que a operação está aguardando sinal ativo e será sincronizada de forma transparente assim que o tráfego de dados normalizar.
