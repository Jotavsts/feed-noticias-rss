const test = require("node:test");
const assert = require("node:assert");
const { criarArmazenamento, CHAVE_PADRAO } = require("../src/armazenamento");

test("sem bucket, o armazenamento fica inativo e não faz nada", async () => {
  const armazenamento = criarArmazenamento({});
  assert.strictEqual(armazenamento.ativo, false);
  await armazenamento.salvar({ qualquer: "coisa" });
});

test("com bucket, envia o JSON para o S3 com a chave padrão", async () => {
  const enviados = [];
  const client = { send: async (comando) => enviados.push(comando.input) };

  const armazenamento = criarArmazenamento({ bucket: "meu-bucket", client });
  assert.strictEqual(armazenamento.ativo, true);

  await armazenamento.salvar({ fonte: "g1", noticias: [] });

  assert.strictEqual(enviados.length, 1);
  assert.strictEqual(enviados[0].Bucket, "meu-bucket");
  assert.strictEqual(enviados[0].Key, CHAVE_PADRAO);
  assert.strictEqual(enviados[0].ContentType, "application/json");
  assert.deepStrictEqual(JSON.parse(enviados[0].Body), { fonte: "g1", noticias: [] });
});

test("propaga o erro do S3 para quem chamou tratar", async () => {
  const client = { send: async () => { throw new Error("acesso negado"); } };
  const armazenamento = criarArmazenamento({ bucket: "b", client });
  await assert.rejects(() => armazenamento.salvar({}), /acesso negado/);
});
