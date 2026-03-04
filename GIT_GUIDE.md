# Guia de Git - Buzan

## Branches

- **main**: Produção (site ao vivo)
- **dev**: Desenvolvimento e testes

## Ver Branch Atual

```bash
git branch
```

## Trocar de Branch

```bash
# Ir para dev
git checkout dev

# Ir para main
git checkout main
```

## Workflow Completo

### 1. Trabalhar na Dev

```bash
# Certifique-se que está na dev
git checkout dev

# Faça suas mudanças nos arquivos...

# Adicione as mudanças
git add .

# Commite
git commit -m "descrição das mudanças"

# Envie para GitHub (cria preview no Vercel)
git push origin dev
```

### 2. Testar Preview

- Acesse o Vercel
- Vá em "Deployments"
- Encontre o deploy da branch "dev"
- Clique na URL do preview
- Teste tudo

### 3. Fazer Merge para Produção

```bash
# Volte para main
git checkout main

# Atualize a main
git pull origin main

# Faça o merge da dev
git merge dev

# Envie para produção
git push origin main
```

### 4. Continuar Trabalhando

```bash
# Volte para dev
git checkout dev

# Continue fazendo mudanças...
```

## Comandos Úteis

```bash
# Ver status (arquivos modificados)
git status

# Ver histórico de commits
git log --oneline

# Desfazer mudanças não commitadas
git checkout -- arquivo.txt

# Ver diferenças
git diff
```

## Dicas

- ✅ Sempre trabalhe na **dev**
- ✅ Teste no **preview** antes do merge
- ✅ Só faça merge para **main** quando tiver certeza
- ✅ A branch **dev** nunca é deletada, é permanente
- ✅ Commits pequenos e frequentes são melhores

## URLs

- **Produção**: buzan-memory-game.vercel.app
- **Preview Dev**: buzan-memory-game-git-dev.vercel.app
