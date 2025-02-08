import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:5173",
    }
});

const GAME_FLOW = ["LOBBY", "CHOOSING", "IN_PROGRESS", "GAME_OVER"];
const rooms = {
    "roomCodeExample": {
        users: new Set(),
        game_state: GAME_FLOW[0]
    }
};


io.on("connection", (socket) => {
    console.log(`user connected ${socket.id}`);

    socket.on("disconnect", () => {
        console.log("user disconnected");
    });


    socket.on("create_room", () => {
        const roomCode = Math.random().toString(36).substring(7);
        socket.join(roomCode);
        const players_set = new Set();
        players_set.add(socket.id);
        rooms[roomCode] = {
            roomCode: roomCode,
            users: players_set,
            game_state: GAME_FLOW[0]
        };
        io.to(roomCode).emit("update", rooms[roomCode]);
    });

    socket.on("join_room", (roomCode) => {
        if (rooms[roomCode] && rooms[roomCode].users.size < 2 && rooms[roomCode].game_state === GAME_FLOW[0]) {
            socket.join(roomCode);
            rooms[roomCode].users.add(socket.id);
            io.to(roomCode).emit("update", rooms[roomCode]);
        }
    });

    socket.on("ping_room", (roomCode) => {
        io.to(roomCode).emit("update", rooms[roomCode]);
    });

    socket.on("start_game", (roomCode) => {
        rooms[roomCode].game_state = GAME_FLOW[1];
        io.to(roomCode).emit("update", rooms[roomCode]);
    });

    socket.on("choose", (data) => {
        const roomCode = data.roomCode;
        if (!rooms[roomCode].playerOne || rooms[roomCode].playerOne?.id === socket.id) {
            rooms[roomCode].playerOne = { id: socket.id, choice: data.option } 
        }else {
            rooms[roomCode].playerTwo = { id: socket.id, choice: data.option };
            rooms[roomCode].game_state = GAME_FLOW[2];
            io.to(roomCode).emit("update", rooms[roomCode]);
        }
    });
});



httpServer.listen(3000, () => {
  console.log("server started, listening on port 3000");
});