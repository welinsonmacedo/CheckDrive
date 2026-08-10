import re

with open('schema.sql', 'r') as f:
    sql = f.read()

tables = re.findall(r'CREATE TABLE IF NOT EXISTS (public\.)?([a-zA-Z0-9_]+)\s*\((.*?)\);', sql, re.DOTALL | re.IGNORECASE)

for _, table_name, table_body in tables:
    print(f"## `{table_name}`\n")
    print("### Campos\n")
    print("| Campo | Tipo | Descrição |")
    print("| ----- | ---- | --------- |")
    lines = table_body.split('\n')
    for line in lines:
        line = line.strip()
        if not line or line.startswith('--') or line.startswith('PRIMARY KEY') or line.startswith('FOREIGN KEY') or line.startswith('UNIQUE') or line.startswith('CONSTRAINT'):
            continue
        parts = line.split()
        if len(parts) >= 2:
            col_name = parts[0].replace('"', '')
            col_type = parts[1].replace(',', '')
            print(f"| {col_name} | {col_type} | |")
    print("\n")
