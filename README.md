# Buzan - Jogo de Memória

Jogo de memória baseado no livro "Use sua mente" de Tony Buzan.

## Deploy no Vercel

### Backend (FastAPI)

1. Faça push do código para o GitHub
2. Acesse [vercel.com](https://vercel.com) e faça login
3. Clique em "Add New Project"
4. Importe seu repositório do GitHub
5. Configure:
   - **Framework Preset**: Other
   - **Root Directory**: deixe vazio (raiz do projeto)
6. Clique em "Deploy"
7. Após o deploy, copie a URL do backend (ex: `https://seu-projeto.vercel.app`)

### Frontend (React)

1. No Vercel, clique em "Add New Project" novamente
2. Importe o mesmo repositório
3. Configure:
   - **Framework Preset**: Create React App
   - **Root Directory**: `frontend`
   - **Environment Variables**: 
     - Nome: `REACT_APP_API_URL`
     - Valor: URL do backend que você copiou (ex: `https://seu-projeto.vercel.app`)
4. Clique em "Deploy"

## Desenvolvimento Local

### Backend
```bash
uv sync
uvicorn backend.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## Tecnologias

- **Frontend**: React
- **Backend**: FastAPI
- **Deploy**: Vercel
