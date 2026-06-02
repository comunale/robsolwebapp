"""
Processa o CSV de clientes da Robsol e gera SQL de INSERT para a tabela stores.
Uso: python process_stores.py <caminho_do_csv>
"""
import sys

def clean_cnpj(raw):
    digits = ''.join(c for c in raw if c.isdigit())
    if len(digits) < 12:
        return None
    return digits.zfill(14)[:14]

def escape(s):
    return s.strip().replace("'", "''")[:500]

def process(filepath):
    seen = {}
    rows = []
    skipped_cpf = 0
    skipped_dup = 0

    encodings = ['utf-8', 'latin-1', 'cp1252']
    lines = None
    for enc in encodings:
        try:
            with open(filepath, encoding=enc) as f:
                lines = f.readlines()
            break
        except Exception:
            continue

    if not lines:
        print("Erro ao ler o arquivo.", file=sys.stderr)
        sys.exit(1)

    for line in lines:
        line = line.rstrip('\n').rstrip('\r')
        parts = line.split(';')
        if len(parts) < 6:
            continue
        if parts[0].lower().startswith('dt'):
            continue

        razao = escape(parts[2])
        nome  = escape(parts[3])
        cnpj  = clean_cnpj(parts[4].strip())
        uf    = parts[5].strip()[:2]

        if not cnpj:
            skipped_cpf += 1
            continue
        if cnpj in seen:
            skipped_dup += 1
            continue

        seen[cnpj] = True
        rows.append((cnpj, nome, razao, uf))

    print(f"-- Total unico: {len(rows)} lojas", file=sys.stderr)
    print(f"-- Ignorados (CPF/invalido): {skipped_cpf}", file=sys.stderr)
    print(f"-- Ignorados (duplicatas): {skipped_dup}", file=sys.stderr)

    chunk_size = 200
    for i in range(0, len(rows), chunk_size):
        chunk = rows[i:i+chunk_size]
        vals = ',\n  '.join(
            f"('{r[0]}', '{r[1]}', '{r[2]}', '{r[3]}')"
            for r in chunk
        )
        print(f"INSERT INTO public.stores (cnpj, name, razao_social, location)")
        print(f"VALUES\n  {vals}")
        print(f"ON CONFLICT (cnpj) DO NOTHING;")
        print()

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Uso: python process_stores.py <caminho_csv> [output.sql]", file=sys.stderr)
        sys.exit(1)
    outfile = sys.argv[2] if len(sys.argv) > 2 else None
    if outfile:
        old_stdout = sys.stdout
        sys.stdout = open(outfile, 'w', encoding='utf-8')
    process(sys.argv[1])
    if outfile:
        sys.stdout.close()
        sys.stdout = old_stdout
        print(f"SQL escrito em: {outfile}", file=sys.stderr)
