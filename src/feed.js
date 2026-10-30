const Parser = require("rss-parser");

const parser = new Parser({
  timeout: 10000,
  headers: { "User-Agent": "feed-noticias-rss/1.0 (+https://github.com/Jotavsts/feed-noticias-rss)" },
  customFields: { item: [["atom:subtitle", "subtitulo"]] },
});

const LIMITE_RESUMO = 220;

// Remove tags HTML e espaços repetidos de um trecho de texto.
function limparTexto(html = "") {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function encurtar(texto, limite = LIMITE_RESUMO) {
  if (texto.length <= limite) return texto;
  return texto.slice(0, limite).replace(/\s+\S*$/, "") + "…";
}

// Pega a primeira imagem do HTML da descrição, se existir.
function extrairImagem(html = "") {
  const achou = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return achou ? achou[1] : null;
}

// Converte um item do RSS no formato usado pela API e pela interface.
function normalizarItem(item) {
  const html = item.content || item["content:encoded"] || item.description || "";
  const resumo = item.subtitulo ? limparTexto(item.subtitulo) : limparTexto(html);
  const data = item.isoDate || item.pubDate || null;

  return {
    titulo: limparTexto(item.title || "Sem título"),
    resumo: encurtar(resumo),
    link: item.link || null,
    imagem: extrairImagem(html),
    publicadoEm: data ? new Date(data).toISOString() : null,
  };
}

async function buscarNoticias(url) {
  const feed = await parser.parseURL(url);
  return {
    fonte: feed.title || url,
    noticias: (feed.items || []).map(normalizarItem).filter((n) => n.link),
  };
}

module.exports = { buscarNoticias, normalizarItem, limparTexto, encurtar, extrairImagem };
