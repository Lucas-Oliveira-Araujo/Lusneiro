const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Client, LocalAuth } = require('whatsapp-web.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3002; // Porta alterada para 3002

let botStatus = "Aguardando...";
let botStarted = false; // Evita reinicializações duplas

// Inicializando o cliente WhatsApp
const client = new Client({
    authStrategy: new LocalAuth(),
});

client.on('qr', qr => {
    io.emit('qr', qr);
});

client.on('ready', () => {
    botStatus = 'Bot está pronto!';
    io.emit('status', botStatus);
});

client.on('message', msg => {
    console.log(`Mensagem recebida: ${msg.body}`);
});

client.initialize();

// Servir o frontend
app.use(express.static('public'));

// Socket.io para gerenciar interações
io.on('connection', socket => {
    console.log('Novo cliente conectado');

    socket.on('startBot', () => {
        if (!botStarted) {
            botStatus = "Iniciando Bot...";
            io.emit('status', botStatus);
            botStarted = true;
        }
    });

    socket.on('updateMessage', (newMessage) => {
        console.log('Mensagem atualizada:', newMessage);
    });

    socket.on('updateTemplate', (template) => {
        console.log('Template aplicado:', template);
    });

    socket.on('updateList', ({ type, number }) => {
        console.log(`${type} atualizado com o número:`, number);
    });
});

server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
