from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import nltk
from nltk.corpus import mac_morpho
import random
import unicodedata
from collections import Counter
from supabase import create_client, Client
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = "https://rczlgswjjrgkkqylmewo.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjemxnc3dqanJna2txeWxtZXdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA5NjI5NzcsImV4cCI6MjA1NjUzODk3N30.sb_publishable_l4cB-gfhtdPVY4myUiArbA_1CVe-Fua"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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

class JogadorCreate(BaseModel):
    device_id: str
    nome: str

class JogadorUpdate(BaseModel):
    device_id: str
    pontuacao: int

@app.post("/jogador/criar")
def criar_jogador(jogador: JogadorCreate):
    try:
        existing = supabase.table('jogadores').select('*').eq('device_id', jogador.device_id).execute()
        if existing.data:
            return {"error": "Jogador já existe", "jogador": existing.data[0]}
        
        result = supabase.table('jogadores').insert({
            "device_id": jogador.device_id,
            "nome": jogador.nome,
            "pontuacao": 0
        }).execute()
        return {"success": True, "jogador": result.data[0]}
    except Exception as e:
        return {"error": str(e)}

@app.get("/jogador/{device_id}")
def buscar_jogador(device_id: str):
    try:
        result = supabase.table('jogadores').select('*').eq('device_id', device_id).execute()
        if result.data:
            return result.data[0]
        return None
    except Exception as e:
        return {"error": str(e)}

@app.post("/jogador/atualizar")
def atualizar_jogador(jogador: JogadorUpdate):
    try:
        result = supabase.table('jogadores').update({
            "pontuacao": jogador.pontuacao
        }).eq('device_id', jogador.device_id).execute()
        return {"success": True, "jogador": result.data[0]}
    except Exception as e:
        return {"error": str(e)}

@app.get("/ranking")
def buscar_ranking():
    try:
        result = supabase.table('jogadores').select('*').order('pontuacao', desc=True).limit(10).execute()
        return result.data
    except Exception as e:
        return {"error": str(e)}

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
