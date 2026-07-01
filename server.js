require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));

async function callGeminiVision({ prompt, imageBase64, mediaType, schema }) {
  if (!GEMINI_API_KEY) {
    const err = new Error('GEMINI_API_KEY não configurada no servidor. Configure a variável de ambiente para habilitar a leitura de prints.');
    err.status = 500;
    throw err;
  }

  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mediaType, data: imageBase64 } },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  };

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!resp.ok) {
    const text = await resp.text();
    const err = new Error(`Erro na API do Gemini (${resp.status}): ${text}`);
    err.status = 502;
    throw err;
  }

  const data = await resp.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    const err = new Error('A IA não retornou dados. Tente novamente ou preencha manualmente.');
    err.status = 502;
    throw err;
  }

  try {
    return JSON.parse(text);
  } catch {
    const err = new Error('A IA retornou um formato inesperado. Tente novamente ou preencha manualmente.');
    err.status = 502;
    throw err;
  }
}

function parseDataUrl(dataUrl) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl || '');
  if (!match) {
    const err = new Error('Imagem inválida.');
    err.status = 400;
    throw err;
  }
  return { mediaType: match[1], base64: match[2] };
}

const FLIGHT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    origem: { type: 'STRING', description: 'Cidade/aeroporto de origem' },
    destino: { type: 'STRING', description: 'Cidade/aeroporto de destino' },
    companhia: {
      type: 'STRING',
      description: 'Nome completo da companhia aérea. Ex: LATAM Airlines Brasil, GOL Linhas Aéreas, Azul Linhas Aéreas',
    },
    direto: { type: 'BOOLEAN', description: 'true se voo direto (sem escalas), false se houver qualquer conexão/escala' },
    milhas: { type: 'NUMBER', description: 'Quantidade de milhas necessárias para emissão, se visível no print. Se não houver, use 0.' },
    ida: {
      type: 'OBJECT',
      properties: {
        data: { type: 'STRING', description: 'Data no formato DD/MM/AAAA' },
        saida: { type: 'STRING', description: 'Horário de saída no formato HH:MM' },
        chegada: { type: 'STRING', description: 'Horário de chegada no formato HH:MM' },
      },
      required: ['data', 'saida', 'chegada'],
    },
    volta: {
      type: 'OBJECT',
      properties: {
        data: { type: 'STRING', description: 'Data no formato DD/MM/AAAA' },
        saida: { type: 'STRING', description: 'Horário de saída no formato HH:MM' },
        chegada: { type: 'STRING', description: 'Horário de chegada no formato HH:MM' },
      },
      required: ['data', 'saida', 'chegada'],
    },
  },
  required: ['origem', 'destino', 'companhia', 'direto', 'ida', 'volta'],
};

const PACKAGE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    tipo: { type: 'STRING', enum: ['hotel', 'transfer'], description: 'Tipo de item identificado no print' },
    destino: { type: 'STRING', description: 'Cidade/destino' },
    hotel: {
      type: 'OBJECT',
      properties: {
        nome: { type: 'STRING' },
        checkin: { type: 'STRING', description: 'Data no formato DD/MM/AAAA' },
        checkout: { type: 'STRING', description: 'Data no formato DD/MM/AAAA' },
        regime: { type: 'STRING', description: 'Ex: Café da manhã, Meia pensão, Tudo incluído' },
        diarias: { type: 'NUMBER' },
      },
    },
    transfer: {
      type: 'OBJECT',
      properties: {
        trajeto: { type: 'STRING', description: 'Ex: Aeroporto - Hotel (ida e volta)' },
        modalidade: { type: 'STRING', description: 'Ex: Privativo, Compartilhado' },
      },
    },
    valor: { type: 'NUMBER', description: 'Valor total em reais, se visível no print. Se não houver, use 0.' },
  },
  required: ['tipo', 'destino'],
};

app.post('/api/analisar-voo', async (req, res) => {
  try {
    const { imagem } = req.body;
    const { mediaType, base64 } = parseDataUrl(imagem);
    const data = await callGeminiVision({
      prompt:
        'Você extrai dados de prints de companhias aéreas (LATAM, GOL/Smiles, Azul ou outra) para uma agência de viagens. Seja literal com o que está escrito na imagem, sem inventar informação. Retorne os dados no schema JSON fornecido.',
      imageBase64: base64,
      mediaType,
      schema: FLIGHT_SCHEMA,
    });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ erro: err.message });
  }
});

app.post('/api/analisar-pacote', async (req, res) => {
  try {
    const { imagem } = req.body;
    const { mediaType, base64 } = parseDataUrl(imagem);
    const data = await callGeminiVision({
      prompt:
        'Você extrai dados de prints de reservas de hotel ou de transfer/traslado para uma agência de viagens. Seja literal com o que está escrito na imagem, sem inventar informação. Retorne os dados no schema JSON fornecido.',
      imageBase64: base64,
      mediaType,
      schema: PACKAGE_SCHEMA,
    });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ erro: err.message });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Embarque Alto - Alertas rodando em http://localhost:${PORT}`);
    if (!GEMINI_API_KEY) {
      console.warn('Aviso: GEMINI_API_KEY não definida. A leitura automática de prints não vai funcionar até configurar o .env');
    }
  });
}

module.exports = app;
