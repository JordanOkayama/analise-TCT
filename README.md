# PsicoEdu Analytics

Aplicação web acadêmica para análise psicométrica de avaliações educacionais com Teoria Clássica dos Testes (TCT), Curva S-P e matriz zonal. O projeto foi estruturado para pesquisas em Educação Matemática, Avaliação Educacional, TCCs, dissertações e teses.

## Principais recursos

- Importação de CSV com separador `,` ou `;`, detecção automática e validação binária.
- Prévia da matriz, validação de coluna `ID` e reconhecimento de metadados.
- Indicadores por item: dificuldade `p*`, proporção de acerto, frequência de acertos, discriminação, correlação ponto-bisserial, correlação item-total e coeficiente `D_i`.
- Indicadores por estudante: escore bruto, percentual de acerto, índice de cautela `C_n`, chutes e erros anômalos.
- Métricas globais: Alfa de Cronbach, média de acertos, desvio padrão, número de estudantes e número de itens.
- Curva S-P com ordenação de estudantes por escore e itens por facilidade.
- Matriz zonal colorida: acerto esperado, erro esperado, acerto inesperado e erro anômalo.
- Comparação por grupos quando o CSV contém colunas como `escola`, `municipio`, `turma`, `serie` ou `grupo`.
- Gráficos exportáveis em PNG/SVG pelo frontend.
- Tabelas interativas com busca, ordenação e exportação CSV.
- Relatório PDF acadêmico gerado pelo backend.

## Estrutura

```text
.
├── backend/
│   ├── app/
│   │   ├── api/             # Rotas REST
│   │   ├── core/            # Configurações
│   │   ├── models/          # Schemas Pydantic
│   │   └── services/        # CSV, TCT, S-P e relatório
│   ├── requirements.txt
│   └── run.ps1
├── frontend/
│   ├── src/
│   │   ├── api/             # Cliente HTTP
│   │   ├── components/      # Componentes reutilizáveis
│   │   ├── lib/             # Utilitários
│   │   └── types/           # Tipagens TypeScript
│   ├── package.json
│   └── vite.config.ts
├── examples/
│   ├── matriz_exemplo_simples.csv
│   └── matriz_com_grupos.csv
└── start-dev.ps1
```

## Requisitos

- Python 3.11 ou superior
- Node.js 20 ou superior
- VSCode recomendado

## Execução local

### Opção rápida no Windows

Na raiz do projeto:

```powershell
.\start-dev.ps1
```

O script abre duas janelas: backend e frontend.

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

API: `http://127.0.0.1:8000`

Documentação interativa: `http://127.0.0.1:8000/docs`

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Interface: `http://127.0.0.1:5173`

## Formato do CSV

O arquivo deve conter uma coluna `ID` e colunas de itens binários:

```csv
ID,i1,i2,i3,i4
1,1,0,1,1
2,0,1,0,1
```

Com metadados opcionais para comparação entre grupos:

```csv
ID;escola;municipio;turma;serie;i1;i2;i3
1;Escola A;Cuiaba;7A;7;1;0;1
2;Escola B;Varzea Grande;7B;7;0;1;1
```

Valores aceitos nos itens:

- `1` para acerto
- `0` para erro

## Endpoints REST

- `GET /api/health`: status da API.
- `POST /api/preview`: valida e retorna prévia do CSV.
- `POST /api/analyze`: processa a matriz e retorna todos os indicadores.
- `POST /api/report/pdf`: gera relatório PDF acadêmico.
- `POST /api/export/items`: exporta indicadores de itens em CSV.
- `POST /api/export/students`: exporta indicadores de estudantes em CSV.
- `POST /api/export/groups`: exporta comparação entre grupos em CSV.

## Notas metodológicas

- `p*` foi implementado como índice de dificuldade no sentido de proporção de erro: `p* = 1 - proporção de acerto`.
- A discriminação usa a diferença entre os grupos superior e inferior, com corte de 27%.
- A correlação ponto-bisserial usa o item contra o escore total sem o próprio item.
- O coeficiente `D_i` é calculado como a proporção de respostas inesperadas do item na matriz zonal S-P.
- O índice `C_n` é calculado como razão entre erros anômalos e oportunidades de erro do estudante.
- Para amostras pequenas, o sistema retorna avisos para interpretação acadêmica cuidadosa.

## Expansão futura

O backend foi organizado para receber novos serviços estatísticos em `backend/app/services/`, como:

- TRI
- Modelo de Rasch
- DIF
- calibração por grupo
- análise longitudinal

O frontend já possui abas e componentes reutilizáveis para incorporar novos painéis analíticos.

