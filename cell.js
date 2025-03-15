const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

// Inicializando o aplicativo Express
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Servir os arquivos estáticos (como seu HTML, CSS e JS)
app.use(express.static('public'));

// Definir o servidor de Socket.IO
io.on('connection', (socket) => {
    console.log('Um usuário se conectou');

    // Enviar status de inicialização
    socket.emit('status', 'Pronto para automatizar!');

    // Evento de atualização de mensagem
    socket.on('updateMessage', (newMessage) => {
        console.log('Nova mensagem:', newMessage);
        socket.broadcast.emit('status', 'Mensagem atualizada: ' + newMessage);
    });

    // Evento de atualização de template
    socket.on('updateTemplate', (template) => {
        console.log('Novo template:', template);
        socket.broadcast.emit('status', 'Template atualizado: ' + template);
    });

    // Evento de atualização de lista (Whitelist ou Blacklist)
    socket.on('updateList', ({ type, number }) => {
        console.log(`${type} atualizado: ${number}`);
        socket.broadcast.emit(`${type}Updated`, number);
    });

    // Desconectar o usuário
    socket.on('disconnect', () => {
        console.log('Usuário desconectado');
    });
});

// Definir a porta do servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
