from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import nltk
from nltk.corpus import mac_morpho
import random
import unicodedata
from collections import Counter

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

nltk.download('mac_morpho', quiet=True)

class JogoMemoria:
    def __init__(self):
        self.banco = []
        self._carregar_banco()

    def _normalizar(self, palavra):
        return "".join(
            c for c in unicodedata.normalize("NFD", palavra)
            if unicodedata.category(c) != 'Mn'
        ).lower()
    
    def _carregar_banco(self):
        dados = []
        for palavra, tag in mac_morpho.tagged_words():
            if tag.startswith('N'):
                p = self._normalizar(palavra)
                if p.isalpha() and len(p) > 3:
                    dados.append(p)
        
        freq = Counter(dados)
        for palavra, contagem in freq.items():
            self.banco.append({
                "palavra": palavra,
                "tamanho": len(palavra),
                "frequencia": contagem
            })

    def gerar_rodada(self, nivel):
        configs = {
            1: {"quantidade": 4, "min_tam": 4, "max_tam": 6, "freq_min": 20, "tempo": 30},
            2: {"quantidade": 5, "min_tam": 5, "max_tam": 7, "freq_min": 15, "tempo": 40},
            3: {"quantidade": 6, "min_tam": 6, "max_tam": 8, "freq_min": 10, "tempo": 50},
            4: {"quantidade": 8, "min_tam": 6, "max_tam": 10, "freq_min": 5, "tempo": 60},
        }
        config = configs.get(nivel, configs[4])
        
        candidatas = [
            p for p in self.banco
            if config["min_tam"] <= p["tamanho"] <= config["max_tam"]
            and p["frequencia"] >= config["freq_min"]
        ]
        
        palavras = random.sample(candidatas, min(config["quantidade"], len(candidatas)))
        return {"palavras": [p["palavra"] for p in palavras], "tempo": config["tempo"]}

jogo = JogoMemoria()

class AvaliarRequest(BaseModel):
    respostas: List[str]
    palavras_corretas: List[str]

@app.get("/gerar-palavras/{nivel}")
def gerar_palavras(nivel: int):
    return jogo.gerar_rodada(nivel)

@app.post("/avaliar")
def avaliar(request: AvaliarRequest):
    def normalizar(texto):
        return "".join(
            c for c in unicodedata.normalize("NFD", texto.strip())
            if unicodedata.category(c) != 'Mn'
        ).lower()
    
    def calcular_similaridade(resposta, correta):
        resp_norm = normalizar(resposta)
        corr_norm = normalizar(correta)
        
        if resp_norm == corr_norm:
            return 1.0
        
        if not resp_norm:
            return 0.0
        
        max_len = max(len(resp_norm), len(corr_norm))
        acertos = sum(1 for a, b in zip(resp_norm, corr_norm) if a == b)
        return acertos / max_len
    
    resultados = []
    pontuacao_total = 0
    
    for i, (resposta, correta) in enumerate(zip(request.respostas, request.palavras_corretas)):
        similaridade = calcular_similaridade(resposta, correta)
        acertou = similaridade == 1.0
        pontuacao_total += similaridade
        
        resultados.append({
            "posicao": i + 1,
            "resposta": resposta,
            "correta": correta,
            "acertou": acertou,
            "similaridade": round(similaridade * 100, 1)
        })
    
    acertos_completos = sum(1 for r in resultados if r["acertou"])
    taxa = pontuacao_total / len(request.palavras_corretas) if request.palavras_corretas else 0
    
    return {
        "taxa": taxa,
        "acertos": acertos_completos,
        "total": len(request.palavras_corretas),
        "pontuacao": round(pontuacao_total, 2),
        "detalhes": resultados
    }
