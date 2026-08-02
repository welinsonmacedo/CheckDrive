# CheckDrive - Documentação do Sistema

Esta é a documentação completa do CheckDrive, um sistema de gestão de frotas e checklists operacionais de veículos e motoristas.

## 1. Módulo de Autenticação e Perfis
- **Login e Registro:** Sistema de autenticação seguro (via Supabase Auth).
- **Tipos de Perfil:**
  - **Empresa (Administrador):** Cadastra motoristas, veículos, reboques, filiais, apólices de seguro, e gerencia as configurações da frota.
  - **Motorista (Usuário):** Tem acesso pelo aplicativo/sistema para responder a checklists diários.
- **Configurações da Empresa:** 
  - Limite de veículos e motoristas do plano atual.
  - Informações corporativas.

## 2. Módulo de Filiais (Unidades)
- **Gestão de Filiais:**
  - Cadastro completo com Razão Social / Nome da Filial, CNPJ, Código identificador, CEP, Endereço, Bairro, Cidade, Estado e Status (Ativa/Inativa).
  - Vínculo direto com a empresa gestora.
  - Permite categorizar e organizar veículos, motoristas e usuários administrativos por filial.

## 3. Módulo de Veículos e Reboques
- **Gestão de Veículos (Frota):**
  - Informações Principais: Placa, Modelo, Renavam, Ano Fabricação/Modelo, Tipo de Combustível, Cor Predominante, ANTT, Tipo de Veículo, Modalidade e **Filial Atribuída** (Select de filial).
  - Seguradora Vinculada.
  - Requisito de Reboque: Opção de definir se um veículo obriga a anexação de um reboque no checklist.
  - **Fotos:** Frontal, Lateral Direita, Lateral Esquerda e Traseira.
  - **Documentos em PDF (Upload):** CRLV, ANTT e Apólice do Seguro.
- **Visualização Moderna (Carousel):** Interface onde o administrador vê detalhes minuciosos, fotos e a filial vinculada a cada veículo.
- **Gestão de Reboques:** Cadastro simples de placa de reboques associados à empresa.

## 4. Módulo de Seguradoras
- **Cadastro de Seguradoras:**
  - Informações Cadastrais: Nome, CNPJ.
  - Telefones de Contato: Telefone Sinistro, Telefone 24 horas e Telefone da Corretora.
- Os veículos podem ser vinculados a essas seguradoras.

## 5. Módulo de Motoristas
- **Cadastro de Motoristas:**
  - Inserção de dados, CNH, categoria da CNH, telefone, e-mail, criação de senha para acesso e **Atribuição de Filial**.
  - Motoristas ficam restritos a visualizar e responder checklists da empresa a que pertencem.

## 5. Módulo de Checklists Operacionais
- **Criação e Gestão de Modelos de Checklist:**
  - A empresa pode criar modelos que possuem **Categorias** (ex: Pneus, Parte Elétrica, Documentos).
  - Dentro de cada categoria, adicionam-se **Itens**.
  - O formato das respostas pode ser selecionado.
- **Execução do Checklist (Motorista):**
  - O motorista seleciona o veículo (e o reboque, se for obrigatório).
  - Responde ao formulário preestabelecido (com opções OK / Não OK / N/A, anexação de fotos e observações).
- **Registro Georreferenciado:** Salva as coordenadas (Latitude/Longitude) no momento exato em que o checklist é respondido e enviado.

## 6. Módulo de Relatórios e Alertas (Dashboard)
- **Histórico e Relatórios:**
  - Listagem dos checklists preenchidos com os resultados (conformidades e não conformidades).
  - Os administradores podem analisar as respostas dos motoristas e agir preventivamente.
- **Painel Resumo (Dashboard):**
  - Exibição do total de veículos, motoristas e checklists realizados.
  - Alertas sobre CNHs vencidas, status pendentes, etc.

## Considerações Técnicas
- **Arquitetura Base:** React (Vite) com TypeScript + Tailwind CSS.
- **Banco de Dados & Storage:** Supabase (PostgreSQL) utilizado para banco de dados relacional e armazenamento de arquivos (Storage "vehicles-docs").
- **Autenticação:** Supabase Auth gerenciando sessão e JWT (Row Level Security aplicada).
