const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // Cambia según el frontend
        methods: ["GET", "POST"]
    }
});

app.use(cors());

const rooms = {
    "roomId": {"players": new Set(),"stage": "lobby","playersConfig": [{},{}],}
};

function disconnectUserFromRooms(id, roomId = null) {
    Object.keys(rooms).forEach(room => {
        if (rooms[room].players.has(id) && room !== roomId) {
            rooms[room].players.delete(id);
            io.to(room).emit('userLeft', `Usuario ${id} ha abandonado la sala`);
            console.info(`Usuario ${id} ha abandonado la sala ${room}`);

        }
        if (rooms[room].players.size === 0) {
            delete rooms[room];
            console.info(`Sala ${room} eliminada`);
        }
    });
}

io.on('connection', (socket) => {
    console.log(`Usuario conectado: ${socket.id}`);

    socket.on('joinRoom', (room) => {
        if(!rooms[room]){
            console.error(`Sala ${room} no existe`);
            return;
        };
        
        socket.join(room);
        rooms[room].players.add(socket.id);
        
        disconnectUserFromRooms(socket.id, room);
        console.info(`Usuario ${socket.id} se unió a la sala: ${room}`);
        io.to(room).emit('userJoined', {message: `Usuario ${socket.id} se unió a la sala`, user: socket.id, room: room});
    });

    socket.on('createRoom', () => {
        
        const room = Math.random().toString(36).substring(7);
        rooms[room] = {
            players: new Set(),
            stage: "lobby",
            playersConfig: {},
        }
        rooms[room].players.add(socket.id);
        socket.join(room);

        disconnectUserFromRooms(socket.id, room);

        socket.emit('roomCreated', { room: room }); 
        console.info(`Usuario ${socket.id} se unió a la sala: ${room}`);
    });

    socket.on('disconnect', () => {
        console.log(`Usuario desconectado: ${socket.id}`);
        disconnectUserFromRooms(socket.id);
    });

    socket.on('tryStart', (room) => {
        if (!rooms[room]) {
            console.error(`Sala ${room} no existe`);
            return;
        }
        if (rooms[room].players.size < 2) {
            console.error(`Sala ${room} no tiene suficientes jugadores`);
            return;
        }
        console.log(`Iniciando juego en sala ${room}`);
        rooms[room].stage = "config";
        io.to(room).emit('nextStage');
    });

    socket.on('confirmSelection', (data) => {
        rooms[data.room].playersConfig[socket.id] = data.config;
        console.log(`Usuario ${socket.id} ha confirmado su selección en la sala ${data.room}`);
        console.log(rooms[data.room].playersConfig);
        

        if (Object.keys(rooms[data.room].playersConfig).length === 2) {
            io.to(data.room).emit('nextStage');
            rooms[data.room].stage = "game";
            console.log(`Iniciando juego en sala ${data.room}`);
        }
    });
});

server.listen(3000, () => {
    console.log('Servidor corriendo en http://localhost:3000');
});
