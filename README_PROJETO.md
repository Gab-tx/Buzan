# Jogo de Memória - Human Memory

## Estrutura do Projeto

- `backend/` - API FastAPI
- `frontend/` - Interface React

## Como Executar

### Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

O backend estará rodando em `http://localhost:8000`

### Frontend (React)

```bash
cd frontend
npm install
npm start
```

O frontend estará rodando em `http://localhost:3000`

## Como Jogar

1. Clique em "Iniciar Jogo"
2. Memorize as palavras exibidas em 60 segundos
3. Digite as palavras nas posições corretas (os números estarão embaralhados)
4. Envie suas respostas e veja o resultado
5. O nível aumenta automaticamente se você acertar mais de 85%
