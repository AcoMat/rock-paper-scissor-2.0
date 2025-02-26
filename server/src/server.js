import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import Game from "./game.js";
import { generateGameLogic } from "./ai.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:5173",
    }
});

// Constants
const GAME_FLOW = ["LOBBY", "CHOOSING", "READY", "RUNNING", "GAME_OVER"];
const GAME_LOOP_INTERVAL = 20; // milliseconds
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

async function startGame(roomCode, customLogic) {
    if (!rooms[roomCode] || rooms[roomCode].game_state !== GAME_FLOW[2]) return;

    gameInstances[roomCode] = new Game([...rooms[roomCode].users.values()], customLogic);

    rooms[roomCode].game_objects = gameInstances[roomCode].getObjects();
    rooms[roomCode].game_state = GAME_FLOW[3];

    emitUpdate(roomCode, { roomCode, game_state: GAME_FLOW[3] });
    emitGameFrame(roomCode, rooms[roomCode].game_objects);

    const gameLoop = setInterval(() => {
        if (!gameInstances[roomCode]) {
            clearInterval(gameLoop);
            return;
        }

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
};


io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Handle user disconnect
    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
        for (const roomCode in rooms) {

            if (rooms[roomCode].users.has(socket.id)) {
                rooms[roomCode].users.delete(socket.id);

                if (rooms[roomCode].users.size === 0) {
                    delete rooms[roomCode];
                    delete gameInstances[roomCode];
                } else if (rooms[roomCode].game_state === GAME_FLOW[0]) {
                    emitUpdate(roomCode, { roomCode, game_state: GAME_FLOW[0], users: rooms[roomCode].users.size });
                } else if (rooms[roomCode].game_state === GAME_FLOW[1]) {
                    rooms[roomCode].game_state = GAME_FLOW[0];
                    emitUpdate(roomCode, { roomCode, game_state: GAME_FLOW[0], users: rooms[roomCode].users.size });
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
            hasCustomObjects: false
        };
        rooms[roomCode].users.set(socket.id, null);
        console.log("Created Room ", roomCode);
        emitUpdate(roomCode, { roomCode, game_state: GAME_FLOW[0], users: rooms[roomCode].users.size });
    });

    // Handle joining a room
    socket.on("join_room", (roomCode) => {
        if (!rooms[roomCode]){
            socket.emit("update", { error: "Room not found" });
            return;
        }
        if (rooms[roomCode].game_state === GAME_FLOW[0]) {
            socket.join(roomCode);
            rooms[roomCode].users.set(socket.id, null);
            emitUpdate(roomCode, { roomCode, game_state: GAME_FLOW[0], users: rooms[roomCode].users.size });
        }
        console.log(`User ${socket.id} joined room ${roomCode}`);
    });

    // Handle starting the game (transition to choosing phase)
    socket.on("start", (roomCode) => {
        if (rooms[roomCode] && rooms[roomCode].users.size > 1) {
            rooms[roomCode].game_state = GAME_FLOW[1];
            emitUpdate(roomCode, { roomCode, game_state: GAME_FLOW[1] });
        }
    });

    // Handle player choice
    socket.on("choose", async (data) => {
        const { roomCode, option } = data;
        if (!rooms[roomCode]) return;
        rooms[roomCode].users.set(socket.id, option);

        if (data.custom) {
            rooms[roomCode].hasCustomObjects = true;
        }

        socket.emit("update", { roomCode, game_state: GAME_FLOW[2], option });

        if ([...rooms[roomCode].users.values()].every(value => value !== null)) {
            let customLogic;

            if (rooms[roomCode].hasCustomObjects) {
                const response = await generateGameLogic([...rooms[roomCode].users.values()]);
                if(!response.success) {
                    console.error(response.error);
                    rooms[roomCode].game_state = GAME_FLOW[1];
                    rooms[roomCode].hasCustomObjects = false;
                    rooms[roomCode].users.forEach((_, userId) => rooms[roomCode].users.set(userId, null));
                    emitUpdate(roomCode, { roomCode, game_state: GAME_FLOW[1], error: response.error });
                    return;
                }
                customLogic = response.result;
                rooms[roomCode].customLogic = customLogic;
            } else {
                customLogic = [
                    {
                        "object": "rock",
                        "emoji": "🪨",
                        "loses_against": ["paper"]
                    },
                    {
                        "object": "paper",
                        "emoji": "📄",
                        "loses_against": ["scissor"]
                    },
                    {
                        "object": "scissor",
                        "emoji": "✂️",
                        "loses_against": ["rock"]
                    }
                ]
            }

            rooms[roomCode].game_state = GAME_FLOW[2];
            startGame(roomCode, customLogic);
        }
    });

    socket.on("cancel_selection", (roomCode) => {
        if(!rooms[roomCode]) return;
        rooms[roomCode].users.set(socket.id, null);
        rooms[roomCode].game_state = GAME_FLOW[1];
        socket.emit("update", { roomCode, game_state: GAME_FLOW[1] });
    });

    // Handle boost
    socket.on("boost", (roomCode) => {
        if (rooms[roomCode].game_state !== GAME_FLOW[3]) return;
        const typeBoosted = rooms[roomCode].users.get(socket.id)
        gameInstances[roomCode].boost(typeBoosted);
    });

    socket.on("leave_room", (roomCode) => {
        console.log(`User ${socket.id} left room ${roomCode}`);
        socket.leave(roomCode);
        if (!rooms[roomCode]) return;
        rooms[roomCode].users.delete(socket.id);
        if (rooms[roomCode].users.size === 0) {
            delete rooms[roomCode];
            delete gameInstances[roomCode];
            console.log("Deleted Room ", roomCode);
        }
        if (rooms[roomCode].game_state === GAME_FLOW[0]) {
            emitUpdate(roomCode, { roomCode, game_state: GAME_FLOW[0], users: rooms[roomCode].users.size });
        }
        if (rooms[roomCode].users.size === 1 && rooms[roomCode].game_state === GAME_FLOW[1] || rooms[roomCode].game_state === GAME_FLOW[2]) {
            rooms[roomCode].game_state = GAME_FLOW[0];
            rooms[roomCode].users.forEach((_, userId) => rooms[roomCode].users.set(userId, null));
            emitUpdate(roomCode, { roomCode, game_state: GAME_FLOW[0], users: rooms[roomCode].users.size });
        }
    });
}
);

httpServer.listen(PORT, () => {
    console.log(`Server started, listening on port ${PORT}`);
});