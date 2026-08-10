import os
import json
import re
from datetime import datetime

doc = []
doc.append("# CheckDrive — Documentação Técnica\n")

doc.append("## 1. Visão geral")
doc.append("CheckDrive é um sistema para gestão de frotas, motoristas, e checklists. "
           "A arquitetura atual é React (Vite) no frontend e Supabase no backend.")
doc.append("---\n")

doc.append("# 2. Stack tecnológica")
doc.append("- Frontend: React, Vite, Tailwind CSS")
doc.append("- Backend / Banco de dados: Supabase (PostgreSQL)")
doc.append("- Autenticação: Supabase Auth")
doc.append("- Roteamento: React Router DOM")
doc.append("- Ícones: Lucide React")
doc.append("- Tratamento de Formulários/Estados: React Hook Form / Zustand / Context API (conforme projeto)")
doc.append("---\n")

doc.append("# 3. Arquitetura do sistema")
doc.append("O sistema segue uma arquitetura serverless utilizando Supabase como backend-as-a-service.\n"
           "```text\nUsuário\n  ↓\nFrontend (SPA React)\n  ↓\nAutenticação (Supabase Auth)\n  ↓\nBanco de dados (PostgreSQL no Supabase)\n  ↓\nStorage (Supabase Storage para fotos/arquivos)\n```")
doc.append("---\n")

doc.append("# 4. Estrutura do projeto")
tree_out = os.popen("find src -maxdepth 2 -type d").read()
doc.append("```text\n" + tree_out + "```")
doc.append("---\n")

doc.append("# 5. Rotas e navegação")
doc.append("| Rota | Componente |")
doc.append("| ---- | ---------- |")
try:
    with open("src/routes/AppRoutes.tsx", "r") as f:
        content = f.read()
        routes = re.findall(r'<Route\s+path=["\']([^"\']+)["\']\s+element=\{<([^>]+)>\}\s*/>', content)
        for route, comp in routes:
            doc.append(f"| {route} | {comp} |")
except Exception as e:
    doc.append(f"Erro ao ler AppRoutes.tsx: {e}")
doc.append("---\n")

doc.append("# 21. Banco de dados")
try:
    with open("schema.sql", "r") as f:
        schema = f.read()
        tables = re.findall(r'CREATE TABLE IF NOT EXISTS ([a-zA-Z0-9_]+)\s*\((.*?)\);', schema, re.DOTALL | re.IGNORECASE)
        for table_name, table_body in tables:
            doc.append(f"## `{table_name}`")
            doc.append("### Campos")
            doc.append("| Campo | Tipo |")
            doc.append("| ----- | ---- |")
            lines = table_body.split('\n')
            for line in lines:
                line = line.strip()
                if not line or line.startswith('--') or line.startswith('PRIMARY KEY') or line.startswith('FOREIGN KEY') or line.startswith('UNIQUE'):
                    continue
                parts = line.split()
                if len(parts) >= 2:
                    col_name = parts[0]
                    col_type = parts[1].replace(',', '')
                    doc.append(f"| {col_name} | {col_type} |")
            doc.append("")
except Exception as e:
    doc.append(f"Erro ao ler schema.sql: {e}")
doc.append("---\n")

doc.append("# 35. Variáveis de ambiente")
try:
    with open(".env.example", "r") as f:
        lines = f.readlines()
        doc.append("```env")
        for line in lines:
            if '=' in line:
                key = line.split('=')[0]
                doc.append(f"{key}=")
        doc.append("```")
except:
    pass

doc.append("---\n")
doc.append("# 37. Dependências")
try:
    with open("package.json", "r") as f:
        pkg = json.load(f)
        deps = pkg.get("dependencies", {})
        for k, v in deps.items():
            doc.append(f"- {k}: {v}")
except:
    pass

doc.append("---\n")
doc.append("# 49. Histórico de alterações da documentação")
doc.append("```markdown")
doc.append("## Changelog da documentação")
doc.append(f"| Data | Alteração | Responsável |")
doc.append(f"| {datetime.now().strftime('%Y-%m-%d')} | Documentação inicial criada | IA |")
doc.append("```")

with open("documentation.md", "w") as f:
    f.write("\n".join(doc))

