const path = require("path");
const express = require("express");
const { buscarNoticias } = require("./src/feed");

const PORT = Number(process.env.PORT) || 3000;
const FEED_URL = process.env.FEED_URL || "https://g1.globo.com/rss/g1/";
const CACHE_TTL_MS = (Number(process.env.CACHE_TTL) || 300) * 1000;

const app = express();
app.disable("x-powered-by");
app.use(express.static(path.join(__dirname, "public")));

// Cache simples em memória: evita bater no feed a cada requisição.
const cache = { dados: null, expiraEm: 0 };

async function obterFeed() {
  if (cache.dados && Date.now() < cache.expiraEm) {
    return { ...cache.dados, doCache: true };
  }
  try {
    const dados = await buscarNoticias(FEED_URL);
    cache.dados = dados;
    cache.expiraEm = Date.now() + CACHE_TTL_MS;
    return { ...dados, doCache: false };
  } catch (erro) {
    // Se o feed cair, devolve a última versão guardada em vez de quebrar a página.
    if (cache.dados) return { ...cache.dados, doCache: true, desatualizado: true };
    throw erro;
  }
}

app.get("/api/noticias", async (req, res) => {
  const limite = Math.min(Math.max(parseInt(req.query.limite, 10) || 30, 1), 100);
  try {
    const feed = await obterFeed();
    res.json({
      fonte: feed.fonte,
      total: Math.min(feed.noticias.length, limite),
      doCache: feed.doCache,
      desatualizado: Boolean(feed.desatualizado),
      noticias: feed.noticias.slice(0, limite),
    });
  } catch (erro) {
    console.error("Falha ao buscar o feed:", erro.message);
    res.status(502).json({ erro: "Não foi possível carregar o feed agora." });
  }
});

app.get("/saude", (req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
