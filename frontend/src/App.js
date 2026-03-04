import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

function App() {
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  const [fase, setFase] = useState('login');
  const [jogador, setJogador] = useState(null);
  const [nomeInput, setNomeInput] = useState('');
  const [ranking, setRanking] = useState([]);
  const [nivel, setNivel] = useState(1);
  const [palavras, setPalavras] = useState([]);
  const [palavrasEmbaralhadas, setPalavrasEmbaralhadas] = useState([]);
  const [respostas, setRespostas] = useState({});
  const [tempo, setTempo] = useState(30);
  const [tempoTotal, setTempoTotal] = useState(30);
  const [resultado, setResultado] = useState(null);
  const [tema, setTema] = useState('sistema');
  const [mostrarInfo, setMostrarInfo] = useState(false);
  const [abaInfo, setAbaInfo] = useState('instrucoes');

  useEffect(() => {
    const jogadorSalvo = localStorage.getItem('jogador');
    if (jogadorSalvo) {
      setJogador(JSON.parse(jogadorSalvo));
      setFase('inicio');
    }
    carregarRanking();
  }, []);

  useEffect(() => {
    if (tema === 'sistema') {
      const darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.body.className = darkMode ? 'dark' : 'light';
    } else {
      document.body.className = tema;
    }
  }, [tema]);

  const carregarRanking = () => {
    const rankingData = JSON.parse(localStorage.getItem('ranking') || '[]');
    setRanking(rankingData.sort((a, b) => b.pontuacao - a.pontuacao).slice(0, 10));
  };

  const fazerLogin = () => {
    if (!nomeInput.trim()) return;
    const rankingData = JSON.parse(localStorage.getItem('ranking') || '[]');
    const jogadorExistente = rankingData.find(j => j.nome === nomeInput.trim());
    
    const novoJogador = jogadorExistente || { nome: nomeInput.trim(), pontuacao: 0 };
    localStorage.setItem('jogador', JSON.stringify(novoJogador));
    setJogador(novoJogador);
    setFase('inicio');
  };

  const sair = () => {
    localStorage.removeItem('jogador');
    setJogador(null);
    setFase('login');
    setNivel(1);
  };

  const atualizarPontuacao = (pontos) => {
    const jogadorAtualizado = { ...jogador, pontuacao: jogador.pontuacao + pontos };
    setJogador(jogadorAtualizado);
    localStorage.setItem('jogador', JSON.stringify(jogadorAtualizado));
    
    const rankingData = JSON.parse(localStorage.getItem('ranking') || '[]');
    const index = rankingData.findIndex(j => j.nome === jogador.nome);
    
    if (index >= 0) {
      rankingData[index] = jogadorAtualizado;
    } else {
      rankingData.push(jogadorAtualizado);
    }
    
    localStorage.setItem('ranking', JSON.stringify(rankingData));
    carregarRanking();
  };

  const iniciarResposta = useCallback(() => {
    const indices = palavras.map((_, i) => i);
    const embaralhados = [...indices].sort(() => Math.random() - 0.5);
    setPalavrasEmbaralhadas(embaralhados);
    setRespostas({});
    setFase('resposta');
  }, [palavras]);

  useEffect(() => {
    if (fase === 'memorizacao' && tempo > 0) {
      const timer = setTimeout(() => setTempo(tempo - 1), 1000);
      return () => clearTimeout(timer);
    } else if (tempo === 0 && fase === 'memorizacao') {
      iniciarResposta();
    }
  }, [tempo, fase, iniciarResposta]);

  const iniciarJogo = async () => {
    const res = await fetch(`${API_URL}/gerar-palavras/${nivel}`);
    const data = await res.json();
    setPalavras(data.palavras);
    setTempo(data.tempo);
    setTempoTotal(data.tempo);
    setFase('memorizacao');
  };

  const handleResposta = (indice, valor) => {
    setRespostas({ ...respostas, [indice]: valor });
  };

  const enviarRespostas = async () => {
    const respostasArray = palavras.map((_, i) => respostas[i] || '');
    const res = await fetch(`${API_URL}/avaliar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        respostas: respostasArray,
        palavras_corretas: palavras
      })
    });
    const data = await res.json();
    atualizarPontuacao(Math.round(data.pontuacao * 10));
    setResultado(data);
    setFase('resultado');
  };

  const proximoNivel = async () => {
    let novoNivel = nivel;
    if (resultado.taxa > 0.85) novoNivel = nivel + 1;
    else if (resultado.taxa < 0.5 && nivel > 1) novoNivel = nivel - 1;
    setNivel(novoNivel);
    setResultado(null);
    
    const res = await fetch(`${API_URL}/gerar-palavras/${novoNivel}`);
    const data = await res.json();
    setPalavras(data.palavras);
    setTempo(data.tempo);
    setTempoTotal(data.tempo);
    setFase('memorizacao');
  };

  return (
    <div className="App">
      <button className="info-button" onClick={() => setMostrarInfo(true)}>?</button>
      
      {mostrarInfo && (
        <div className="modal-overlay" onClick={() => setMostrarInfo(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setMostrarInfo(false)}>×</button>
            <div className="modal-tabs">
              <button 
                className={abaInfo === 'instrucoes' ? 'active' : ''} 
                onClick={() => setAbaInfo('instrucoes')}
              >
                Instruções
              </button>
              <button 
                className={abaInfo === 'sobre' ? 'active' : ''} 
                onClick={() => setAbaInfo('sobre')}
              >
                Sobre
              </button>
            </div>
            <div className="modal-body">
              {abaInfo === 'instrucoes' && (
                <div>
                  <h3>Como Jogar</h3>
                  <ol>
                    <li>Faça login com seu nome</li>
                    <li>Clique em "Iniciar Jogo" para começar</li>
                    <li>Memorize as palavras exibidas no tempo disponível</li>
                    <li>Digite as palavras nas posições corretas (os números serão embaralhados)</li>
                    <li>Não precisa se preocupar com acentos ou maiúsculas/minúsculas</li>
                    <li>Você ganha pontos parciais por letras corretas</li>
                    <li>O nível aumenta automaticamente se você acertar mais de 85%</li>
                  </ol>
                  <h3>Níveis</h3>
                  <ul>
                    <li><strong>Nível 1:</strong> 4 palavras, 30 segundos</li>
                    <li><strong>Nível 2:</strong> 5 palavras, 40 segundos</li>
                    <li><strong>Nível 3:</strong> 6 palavras, 50 segundos</li>
                    <li><strong>Nível 4:</strong> 8 palavras, 60 segundos</li>
                  </ul>
                </div>
              )}
              {abaInfo === 'sobre' && (
                <div>
                  <h3>Sobre o Jogo</h3>
                  <p>Esse jogo foi feito como um modo de me ajudar a fazer o que um livro pede, sim um livro. Tony Buzan é a lenda. O livro de Tony Buzan, <em>Use sua mente</em>, é bem mais que um simples livro de autoajuda --se engana bonito quem vê pela capa aquelas palavras tão motivadoras "Use sua mente"-- é um livro que realmente tem um conteúdo bom e que realmente te ajuda -- isso é inacreditável vindo de mim que julga todos os livros de autoajuda.</p>
                  
                  <p>Buzan fala muito sobre memória, como ela pode ser treinada, como é uma das principais inteligências e como as pessoas pensam que se nasce inteligente, onde o livro deixa claro que isso não é verdade. Em uma determinada partezinha do livro -- digo partezinha porque eu meio que tô devorando o livro por ser de leitura fácil e parece que não tem muito aprofundamento em cada tópico, bom esse deve ser um dos problemas do livro... Em um determinada parte, Buzan faz um joguinho com muitos benefícios cognitivos, e eu, um bom dev da era da burrice artificial, desenvolvi por meio de vibe coding (Desenvolvimento por IA, para quem não conhece os termos) esse site com esse mesmo jogo e os mesmo propósitos cognitivos, dentre eles:</p>
                  
                  <h4>Benefícios Cognitivos</h4>
                  <ul>
                    <li>
                      <strong>Memória de trabalho:</strong> Capacidade de manter informações ativas por alguns segundo enquanto você as manipula. Reter de 5 a 8, ou até mais, palavras é uma coisa muito difícil, se não acha, tente!
                    </li>
                    <li>
                      <strong>Atenção sustentada:</strong> Para memorizar corretamente você precisa manter o foco irmão! Ai tu com aquele lance de déficit de atenção comprado na feira da parangaba vai treinar a ficar um tempinho focado e um pouco menos deficitado, tá ligado?
                    </li>
                    <li>
                      <strong>Associação semântica:</strong> Essa parada aqui é a mais top pra mim, porque tu cria conexões para se lembrar das palavras e associa elas ao teu imaginário, isso é muito louco porque teu cérebro começa a pipocar de brilhinho e tu nem percebe, só vai perceber quando tua capacidade de relacionar palavras melhorar e tua memória também.
                    </li>
                    <li>
                      <strong>Imaginação e Criatividade:</strong> Depois de algum tempo jogando tu vai perceber que criar mnemonicos, ou associções criativas, são uteis demais. Imagina o seguinte, temos as palavras 1.cobra, 2.árvore, 3.prato, 4.familia, na hora você pode usar a sua imaginação para criar uma história, como: a Familia de 4 pessoas, subiram em 2 árvores, para caçar 1 cobra e o que rendeu foram 3 pratos. Isso é o cérebro se forçando para criar conexões, e essas conexões te ajudam a se desenvolver em vários aspectos.
                    </li>
                  </ul>
                  
                  <p>Bom, eu listei esses benefícios, mas saiba que tem muitos mais e que exercitar o cérebro, que é um músculo, é importantíssimo na era da Burrice artificial. Pense mais criticamente, interprete e crie conexões, é disso que o mundo precisa no momento.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <header>
        <h1>Jogo de Memória</h1>
        <div className="controls">
          {jogador && (
            <>
              <span className="jogador-info">{jogador.nome}: {jogador.pontuacao}pts</span>
              <span className="nivel">Nível {nivel}</span>
              <button onClick={sair} className="btn-sair">Sair</button>
            </>
          )}
          <select value={tema} onChange={(e) => setTema(e.target.value)} className="tema-select">
            <option value="sistema">Sistema</option>
            <option value="light">Claro</option>
            <option value="dark">Escuro</option>
          </select>
        </div>
      </header>

      {fase === 'login' && (
        <div className="fase-container">
          <h2>Bem-vindo!</h2>
          <div className="login-box">
            <input
              type="text"
              value={nomeInput}
              onChange={(e) => setNomeInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && fazerLogin()}
              placeholder="Digite seu nome"
              autoFocus
            />
            <button onClick={fazerLogin}>Entrar</button>
          </div>
          {ranking.length > 0 && (
            <div className="ranking-box">
              <h3>🏆 Ranking</h3>
              <ol>
                {ranking.map((j, i) => (
                  <li key={i}>
                    <span className="rank-nome">{j.nome}</span>
                    <span className="rank-pontos">{j.pontuacao}pts</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {fase === 'inicio' && (
        <div className="fase-container">
          <button onClick={iniciarJogo}>Iniciar Jogo</button>
          {ranking.length > 0 && (
            <div className="ranking-box">
              <h3>🏆 Ranking</h3>
              <ol>
                {ranking.map((j, i) => (
                  <li key={i} className={j.nome === jogador.nome ? 'destaque' : ''}>
                    <span className="rank-nome">{j.nome}</span>
                    <span className="rank-pontos">{j.pontuacao}pts</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {fase === 'memorizacao' && (
        <div className="fase-container">
          <div className="timer">
            <div className="timer-bar" style={{width: `${(tempo / tempoTotal) * 100}%`}}></div>
            <span className="timer-text">{tempo}s</span>
          </div>
          <h2>Memorize as palavras</h2>
          <div className="palavras-grid">
            {palavras.map((palavra, i) => (
              <div key={i} className="palavra-box">
                <span className="numero">{i + 1}</span>
                <span className="palavra">{palavra}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {fase === 'resposta' && (
        <div className="fase-container">
          <h2>Digite as palavras nas posições corretas</h2>
          <div className="respostas-grid">
            {palavrasEmbaralhadas.map((indiceOriginal) => (
              <div key={indiceOriginal} className="resposta-box">
                <label>{indiceOriginal + 1}</label>
                <input
                  type="text"
                  value={respostas[indiceOriginal] || ''}
                  onChange={(e) => handleResposta(indiceOriginal, e.target.value)}
                  placeholder="..."
                  autoFocus={indiceOriginal === palavrasEmbaralhadas[0]}
                />
              </div>
            ))}
          </div>
          <button onClick={enviarRespostas} className="btn-primary">Enviar</button>
        </div>
      )}

      {fase === 'resultado' && resultado && (
        <div className="fase-container">
          <h2>Resultado</h2>
          <div className="resultado-resumo">
            <p className="acertos">{resultado.acertos} / {resultado.total}</p>
            <p className="taxa">{(resultado.taxa * 100).toFixed(0)}%</p>
            <p className="pontuacao">+{Math.round(resultado.pontuacao * 10)} pontos</p>
          </div>
          <div className="detalhes-grid">
            {resultado.detalhes.map((detalhe) => (
              <div key={detalhe.posicao} className={`detalhe-box ${detalhe.acertou ? 'acerto' : detalhe.similaridade > 50 ? 'parcial' : 'erro'}`}>
                <span className="posicao">{detalhe.posicao}</span>
                <div className="palavras-comparacao">
                  <span className="sua-resposta">{detalhe.resposta || '(vazio)'}</span>
                  {!detalhe.acertou && (
                    <>
                      <span className="palavra-correta">→ {detalhe.correta}</span>
                      <span className="similaridade">{detalhe.similaridade}%</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button onClick={proximoNivel} className="btn-primary">Continuar</button>
        </div>
      )}
    </div>
  );
}

export default App;
