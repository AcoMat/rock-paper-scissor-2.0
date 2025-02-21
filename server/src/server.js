import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import Game from "./game.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:5173",
    }
});

// Constants
const GAME_FLOW = ["LOBBY", "CHOOSING", "READY", "RUNNING", "GAME_OVER"];
const GAME_LOOP_INTERVAL = 5; // milliseconds
const PORT = 3000;

// Room management
const rooms = {};

const gameInstances = {};

// Helper function to generate a random room code
const generateRoomCode = () => Math.random().toString(36).substring(7);

// Helper function to emit updates to all clients in a room
const emitUpdate = (roomCode, data) => {
    io.to(roomCode).emit("update", data);
};

// Helper function to emit game frames to all clients in a room
const emitGameFrame = (roomCode, gameObjects) => {
    io.to(roomCode).emit("game_frame", gameObjects);
};

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Handle user disconnect
    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
        for (const roomCode in rooms) {
            if (rooms[roomCode].users.get(socket.id)) {
                rooms[roomCode].users.delete(socket.id);
                if (rooms[roomCode].users.size === 0 && rooms[roomCode].game_state === GAME_FLOW[0]) {
                    delete rooms[roomCode]; // Clean up empty rooms
                } else {
                    emitUpdate(roomCode, rooms[roomCode]);
                }
                break;
            }
        }
    });

    // Handle room creation
    socket.on("create_room", () => {
        const roomCode = generateRoomCode();
        socket.join(roomCode);
        rooms[roomCode] = {
            roomCode,
            users: new Map(),
            game_state: GAME_FLOW[0],
            game_objects: null,
            winner: null,
        };
        rooms[roomCode].users.set(socket.id,null);
        emitUpdate({roomCode, game_state: GAME_FLOW[0], users: rooms[roomCode].users.size}); 
    });

    // Handle joining a room
    socket.on("join_room", (roomCode) => {
        if (rooms[roomCode].game_state === GAME_FLOW[0]) {
            socket.join(roomCode);
            rooms[roomCode].users.add(socket.id,null);
            emitUpdate({roomCode, game_state: GAME_FLOW[0], users: rooms[roomCode].users.size});
        }
    });

    // Handle starting the game (transition to choosing phase)
    socket.on("start", (roomCode) => {
        if (rooms[roomCode] && rooms[roomCode].users.size > 1) {
            rooms[roomCode].game_state = GAME_FLOW[1];
            emitUpdate({roomCode, game_state: GAME_FLOW[1]});
        }
    });

    // Handle player choice
    socket.on("choose", (data) => {
        const { roomCode, option } = data;
        if (!rooms[roomCode]) return;

        if (rooms[roomCode].users.get(socket.id) == null){
            rooms[roomCode].user.set(socket.id, option);
        }

        if([...rooms[roomCode].users.values()].every(value => value !== null)){
            rooms[roomCode].game_state = GAME_FLOW[2];
            emitUpdate({roomCode, game_state: GAME_FLOW[2]});
        }
        
    });

    // Handle starting the game (transition to running phase)
    socket.on("start_game", (roomCode) => {
        if (!rooms[roomCode] || rooms[roomCode].game_state !== GAME_FLOW[2]) return;

        rooms[roomCode].game_state = GAME_FLOW[3];
        gameInstances[roomCode] = new Game(rooms[roomCode].playerOne.choice, rooms[roomCode].playerTwo.choice);
        rooms[roomCode].game_objects = gameInstances[roomCode].getObjects();
        emitGameFrame(roomCode, rooms[roomCode].game_objects);

        const gameLoop = setInterval(() => {
            gameInstances[roomCode].moveObjects();
            gameInstances[roomCode].checkCollisions();
            rooms[roomCode].game_objects = gameInstances[roomCode].getObjects();
            emitGameFrame(roomCode, rooms[roomCode].game_objects);

            const winner = gameInstances[roomCode].checkWinner();
            if (winner) {
                clearInterval(gameLoop);
                rooms[roomCode].game_state = GAME_FLOW[4];
                rooms[roomCode].winner = winner;
                emitUpdate(roomCode, rooms[roomCode]);
            }
        }, GAME_LOOP_INTERVAL);
    });


    // Handle boost
    socket.on("boost", (roomCode) => {
        console.log(`Boost requested in room ${roomCode}`);
        
        if (rooms[roomCode].game_state !== GAME_FLOW[3]) return;

        // Determine which player is boosting based on socket ID
        const player = rooms[roomCode].playerOne.id === socket.id ? 
            rooms[roomCode].playerOne : 
            rooms[roomCode].playerTwo;
    
        // Apply boost to the player's choice type
        gameInstances[roomCode].boost(player.choice);
        console.log(`Boost applied to ${player.choice}`);
        
        
        // Send updated game objects
        rooms[roomCode].game_objects = gameInstances[roomCode].getObjects();
        emitGameFrame(roomCode, rooms[roomCode].game_objects);
    });
});

httpServer.listen(PORT, () => {
    console.log(`Server started, listening on port ${PORT}`);
});