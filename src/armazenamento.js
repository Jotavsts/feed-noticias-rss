const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const CHAVE_PADRAO = "noticias/ultimas.json";

// Guarda o último feed lido em um bucket S3. É opcional: sem bucket, não faz nada.
// As credenciais vêm da cadeia padrão da AWS (perfil IAM da instância EC2, por exemplo),
// então nenhuma chave precisa ficar no código ou nas variáveis de ambiente.
function criarArmazenamento({ bucket, chave = CHAVE_PADRAO, client } = {}) {
  if (!bucket) {
    return { ativo: false, salvar: async () => {} };
  }

  const s3 = client || new S3Client({});

  return {
    ativo: true,
    async salvar(dados) {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: chave,
          Body: JSON.stringify(dados),
          ContentType: "application/json",
        })
      );
    },
  };
}

module.exports = { criarArmazenamento, CHAVE_PADRAO };
