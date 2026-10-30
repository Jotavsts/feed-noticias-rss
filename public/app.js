const lista = document.getElementById("lista");
const status = document.getElementById("status");
const fonte = document.getElementById("fonte");
const busca = document.getElementById("busca");
const botao = document.getElementById("atualizar");

let noticias = [];

function tempoAtras(iso) {
  if (!iso) return "";
  const minutos = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

function criarCartao(n) {
  const cartao = document.createElement("a");
  cartao.className = "cartao";
  cartao.href = n.link;
  cartao.target = "_blank";
  cartao.rel = "noopener noreferrer";

  if (n.imagem) {
    const img = document.createElement("img");
    img.className = "cartao__imagem";
    img.src = n.imagem;
    img.alt = "";
    img.loading = "lazy";
    cartao.appendChild(img);
  }

  const corpo = document.createElement("div");
  corpo.className = "cartao__corpo";

  const titulo = document.createElement("h2");
  titulo.className = "cartao__titulo";
  titulo.textContent = n.titulo;

  const resumo = document.createElement("p");
  resumo.className = "cartao__resumo";
  resumo.textContent = n.resumo;

  const data = document.createElement("span");
  data.className = "cartao__data";
  data.textContent = tempoAtras(n.publicadoEm);

  corpo.append(titulo, resumo, data);
  cartao.appendChild(corpo);
  return cartao;
}

function desenhar() {
  const termo = busca.value.trim().toLowerCase();
  const visiveis = noticias.filter(
    (n) => !termo || `${n.titulo} ${n.resumo}`.toLowerCase().includes(termo)
  );
  lista.replaceChildren(...visiveis.map(criarCartao));
  status.className = "status";
  status.textContent = visiveis.length ? "" : "Nenhuma notícia encontrada.";
}

async function carregar() {
  botao.disabled = true;
  status.className = "status";
  status.textContent = "Carregando notícias…";
  try {
    const resposta = await fetch("/api/noticias?limite=40");
    if (!resposta.ok) throw new Error("Falha ao carregar");
    const dados = await resposta.json();
    noticias = dados.noticias;
    fonte.textContent = dados.desatualizado
      ? `Fonte: ${dados.fonte} (dados anteriores, o feed está fora do ar)`
      : `Fonte: ${dados.fonte}`;
    desenhar();
  } catch (erro) {
    status.className = "status status--erro";
    status.textContent = "Não foi possível carregar as notícias agora. Tente novamente em instantes.";
  } finally {
    botao.disabled = false;
  }
}

busca.addEventListener("input", desenhar);
botao.addEventListener("click", carregar);
carregar();
