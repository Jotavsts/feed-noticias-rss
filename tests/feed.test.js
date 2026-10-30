const test = require("node:test");
const assert = require("node:assert");
const { normalizarItem, limparTexto, encurtar, extrairImagem } = require("../src/feed");

test("limparTexto remove tags e espaços repetidos", () => {
  assert.strictEqual(limparTexto("<p>Olá   <b>mundo</b></p>"), "Olá mundo");
});

test("encurtar não corta texto curto e usa reticências no longo", () => {
  assert.strictEqual(encurtar("curto", 10), "curto");
  const longo = "palavra ".repeat(50);
  const resultado = encurtar(longo, 40);
  assert.ok(resultado.length <= 41);
  assert.ok(resultado.endsWith("…"));
});

test("extrairImagem pega a primeira imagem do HTML", () => {
  const html = '<img src="https://exemplo.com/a.jpg" /><br />texto';
  assert.strictEqual(extrairImagem(html), "https://exemplo.com/a.jpg");
  assert.strictEqual(extrairImagem("sem imagem"), null);
});

test("normalizarItem prefere o subtítulo e monta o formato da API", () => {
  const item = {
    title: "  Título da notícia ",
    link: "https://exemplo.com/noticia",
    subtitulo: "Resumo curto do subtítulo",
    description: '<img src="https://exemplo.com/foto.jpg" /> texto longo da descrição',
    isoDate: "2026-10-30T12:00:00.000Z",
  };
  assert.deepStrictEqual(normalizarItem(item), {
    titulo: "Título da notícia",
    resumo: "Resumo curto do subtítulo",
    link: "https://exemplo.com/noticia",
    imagem: "https://exemplo.com/foto.jpg",
    publicadoEm: "2026-10-30T12:00:00.000Z",
  });
});

test("normalizarItem usa a descrição quando não há subtítulo e aceita data ausente", () => {
  const n = normalizarItem({ title: "A", link: "https://x.com", description: "<p>Só descrição</p>" });
  assert.strictEqual(n.resumo, "Só descrição");
  assert.strictEqual(n.publicadoEm, null);
  assert.strictEqual(n.imagem, null);
});
