const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode");
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
require("dotenv").config(); // Carregar variáveis de ambiente

// Verificar se DATABASE_URL está definido
if (!process.env.DATABASE_URL) {
  console.error("❌ Erro: A variável de ambiente DATABASE_URL não está definida.");
  process.exit(1);
}

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static("public"));
app.use(express.json());

// Conectar ao banco PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
});

// Criar tabela automaticamente se não existir
const createTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        telefone TEXT UNIQUE NOT NULL,
        nome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL
      )
    `);
    console.log("📌 Tabela 'usuarios' verificada!");
  } catch (error) {
    console.error("Erro ao criar tabela:", error);
  }
};
createTable();

const client = new Client({
  authStrategy: new LocalAuth(),
});

// Exibir QR Code no frontend
client.on("qr", (qr) => {
  qrcode.toDataURL(qr, (err, url) => {
    if (err) {
      console.error("Erro ao gerar QR Code:", err);
      return;
    }
    io.emit("qr", url);
  });
});

// Status do Bot
client.on("ready", () => {
  console.log("✅ Bot pronto!");
  io.emit("status", "🟢 Bot conectado!");
});

client.on("disconnected", () => {
  console.log("❌ Bot desconectado!");
  io.emit("status", "🔴 Bot desconectado!");
});

// 📩 Processar mensagens recebidas
client.on("message", async (msg) => {
  const telefone = msg.from.replace(/@c.us$/, "");
  console.log(`📩 Mensagem recebida de ${telefone}: ${msg.body}`);

  // 📌 Cadastro de usuário: "!cadastro nome email senha"
  if (msg.body.startsWith("!cadastro ")) {
    const partes = msg.body.split(" ");
    if (partes.length !== 4) {
      return msg.reply("❌ Formato inválido! Use: !cadastro Nome Email Senha");
    }

    const nome = partes[1];
    const email = partes[2];
    const senha = await bcrypt.hash(partes[3], 10); // Criptografa a senha

    try {
      // Verificar se o usuário já está cadastrado
      const resultado = await pool.query("SELECT * FROM usuarios WHERE telefone = $1 OR email = $2", [telefone, email]);

      if (resultado.rows.length > 0) {
        return msg.reply("⚠️ Você já está cadastrado!");
      }

      // Salvar no banco de dados
      await pool.query("INSERT INTO usuarios (telefone, nome, email, senha) VALUES ($1, $2, $3, $4)", [telefone, nome, email, senha]);
      msg.reply("✅ Cadastro realizado com sucesso!");
    } catch (error) {
      console.error("Erro ao cadastrar usuário:", error);
      msg.reply("❌ Erro ao cadastrar. Tente novamente.");
    }
  }

  // 📌 Consultar meus dados: "!meusdados"
  if (msg.body === "!meusdados") {
    try {
      const resultado = await pool.query("SELECT nome, email FROM usuarios WHERE telefone = $1", [telefone]);

      if (resultado.rows.length === 0) {
        return msg.reply("⚠️ Você ainda não está cadastrado! Use `!cadastro Nome Email Senha`");
      }

      const usuario = resultado.rows[0];
      msg.reply(`📌 Seus dados:\n🧑 Nome: ${usuario.nome}\n📧 Email: ${usuario.email}`);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      msg.reply("❌ Erro ao buscar seus dados.");
    }
  }

  // 📌 Ajuda: "!help"
  if (msg.body.startsWith("!help")) {
    msg.reply(
      "📌 Comandos disponíveis:\n" +
        "!cadastro Nome Email Senha - Cadastra seu usuário\n" +
        "!meusdados - Mostra seus dados cadastrados\n" +
        "!help - Exibe os comandos disponíveis"
    );
  }
});

// Iniciar bot
client.initialize();

// Iniciar servidor
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
