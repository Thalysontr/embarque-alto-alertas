# Embarque Alto — Gerador de Alertas

Site interno para gerar os alertas de promoção (voos e pacotes) que hoje são feitos manualmente pelo ChatGPT. Sobe o print, o site tenta ler os dados automaticamente (OCR gratuito, sem nenhuma API paga), calcula o valor de venda e monta o texto pronto para copiar e enviar.

100% gratuito: sem chave de API, sem cartão de crédito, sem custo por uso.

## Como funciona

1. Escolhe a aba **Alerta de Voo** ou **Alerta de Pacote**.
2. Sobe o print (ou preenche os campos manualmente) e clica em **Ler print (OCR grátis)** — uma biblioteca gratuita (Tesseract.js) roda dentro do próprio navegador e tenta preencher os campos automaticamente.
3. **Sempre confira os campos preenchidos** — OCR não é perfeito, principalmente em prints com fontes pequenas ou fundo colorido. Um bloco "Texto reconhecido pelo OCR" mostra tudo que foi lido, caso precise copiar algo manualmente.
4. Informa o valor do milheiro (voo) ou o valor do pacote, e a taxa.
5. Clica em **Gerar cálculo e alerta** — aparece o cálculo (igual ao padrão que vocês já usam) e o texto final pronto para copiar.

O cálculo é sempre feito pelo próprio site (nunca por OCR/IA), então não tem risco de erro de conta:

```
(milhas ÷ 1000 × milheiro) + taxas = custo
custo × 1,10 = valor à vista
valor à vista ÷ 12 = valor da parcela
```

Para pacotes, o "custo" é o valor total informado (hotel/transfer) em vez do cálculo por milhas.

## Configuração (uma vez só)

1. Instale o [Node.js](https://nodejs.org) (versão 18 ou mais nova).
2. Nesta pasta, rode:
   ```
   npm install
   ```

Não precisa de chave de API nem de `.env` — o OCR roda todo no navegador de quem está usando o site.

## Rodando localmente

```
npm start
```

Abre em `http://localhost:3000`. Todo mundo na mesma rede/computador acessa esse link, sem necessidade de login.

## Colocando no ar para a equipe usar de qualquer lugar (grátis)

Como não há backend com custo (nenhuma API paga, nenhum banco de dados), dá pra publicar em qualquer plano gratuito:

**Opção mais simples — hospedagem estática (recomendado):**
A pasta `public/` é um site puramente estático. Pode subir direto no [Netlify](https://netlify.com), [Vercel](https://vercel.com) ou [GitHub Pages](https://pages.github.com) arrastando a pasta `public` — sem servidor, sem mensalidade, sem "dormir" por inatividade.

**Opção com servidor Node (se preferir manter o `server.js`):**
1. Suba esta pasta para um repositório (GitHub, por exemplo).
2. Em um serviço como [Render](https://render.com) (plano free) ou [Railway](https://railway.app), crie um "Web Service" apontando para o repositório.
3. Comando de start: `npm start`. Não precisa configurar nenhuma variável de ambiente.
4. Depois do deploy, compartilhe o link gerado com a equipe.

## Limitações do OCR gratuito

Diferente de uma IA de visão paga, o OCR só reconhece texto — ele não "entende" a imagem. Por isso:
- Funciona melhor em prints nítidos, com texto legível e bom contraste.
- Pode errar ou não preencher origem, nome do hotel e trajeto de transfer (informações mais "soltas" no layout) — esses campos quase sempre precisam ser digitados/confirmados manualmente.
- Datas, horários, milhas, valor em R$ e a companhia aérea costumam ser reconhecidos bem, por seguirem um padrão de texto fixo (`DD/MM/AAAA`, `HH:MM`, `R$ X`, etc.).
- O formulário manual sempre funciona como alternativa 100% confiável.

## Estrutura do projeto

```
server.js        → servidor estático simples (Express), sem nenhuma dependência externa paga
public/index.html→ estrutura da página
public/style.css → visual (estilo cartão de embarque)
public/app.js    → OCR (Tesseract.js), heurísticas de leitura, cálculo e geração do alerta
```
