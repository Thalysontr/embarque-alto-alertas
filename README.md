# Embarque Alto — Gerador de Alertas

Site interno para gerar os alertas de promoção (voos e pacotes) que hoje são feitos manualmente pelo ChatGPT. Sobe o print, a IA lê os dados, o site calcula o valor de venda e monta o texto pronto para copiar e enviar.

100% gratuito: a leitura de prints usa a API de visão do **Google Gemini**, que tem camada gratuita sem exigir cartão de crédito.

## Como funciona

1. Escolhe a aba **Alerta de Voo** ou **Alerta de Pacote**.
2. Sobe o print (ou preenche os campos manualmente) e clica em **Ler print com IA** — os campos são preenchidos automaticamente.
3. Confere/ajusta os dados, informa o valor do milheiro (voo) ou o valor do pacote, e a taxa.
4. Clica em **Gerar cálculo e alerta** — aparece o cálculo (igual ao padrão que vocês já usam) e o texto final pronto para copiar.

O cálculo é sempre feito pelo próprio site (nunca pela IA), então não tem risco de erro de conta:

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
3. Pegue uma chave gratuita do Google Gemini em **https://aistudio.google.com/apikey** (login com conta Google, sem cartão de crédito).
4. Copie o arquivo `.env.example` para `.env` e cole a chave:
   ```
   GEMINI_API_KEY=sua-chave-aqui
   ```
   Sem essa chave, o site ainda funciona, mas só no modo manual (sem leitura automática de print).

## Rodando localmente

```
npm start
```

Abre em `http://localhost:3000`.

## Colocando no ar para a equipe usar (grátis, com IA funcionando)

Diferente de um site totalmente estático, a leitura de prints precisa de um servidor que guarde a chave do Gemini em segredo (nunca deve ficar exposta no código do navegador). Por isso a hospedagem recomendada é a **Vercel** (plano gratuito, sem cartão de crédito):

1. Acesse **https://vercel.com** e faça login com sua conta do GitHub.
2. Clique em "Add New" → "Project" e importe o repositório `embarque-alto-alertas`.
3. Antes de concluir, em "Environment Variables", adicione:
   - `GEMINI_API_KEY` = sua chave do Google AI Studio
4. Clique em "Deploy". Em ~1 minuto o site está no ar com a leitura de prints funcionando.
5. A partir daí, toda vez que o código for atualizado e enviado ao GitHub (`git push`), a Vercel publica a nova versão sozinha — automático.

Esse projeto já inclui o arquivo `vercel.json` configurado para isso, não precisa mexer em mais nada.

### Alternativa sem IA (site puramente estático)

Se preferir não configurar nenhuma API, a pasta `public/` funciona sozinha como site estático (GitHub Pages, Netlify, etc.) — só que o botão "Ler print com IA" não vai funcionar, e o formulário manual continua 100% disponível.

## Estrutura do projeto

```
server.js        → servidor Express + chamada à API de visão do Gemini (leitura dos prints)
vercel.json       → configuração para publicar o server.js como função na Vercel
public/index.html→ estrutura da página
public/style.css → visual (design limpo, cores neutras + acento indigo/coral)
public/app.js    → lógica de cálculo, formulário e geração do alerta
```
