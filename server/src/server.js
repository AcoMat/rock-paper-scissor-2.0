import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import Game from "./game.js";
import { generateGameLogic } from "./ai.js";

// Constants
const GAME_STATES = {
  LOBBY: "LOBBY",
  CHOOSING: "CHOOSING",
  READY: "READY",
  RUNNING: "RUNNING",
  GAME_OVER: "GAME_OVER"
};
const GAME_LOOP_INTERVAL = 20; // milliseconds
const PORT = process.env.PORT || 3000;
const DEFAULT_GAME_LOGIC = [
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
];

class GameServer {
  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.io = new Server(this.httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        methods: ["GET", "POST"]
      }
    });
    
    this.rooms = {};
    this.gameInstances = {};
    this.gameLoops = {}; // Store game loops to clean them up properly
    
    this.setupSocketHandlers();
  }
  
  start() {
    this.httpServer.listen(PORT, () => {
      console.log(`Server started, listening on port ${PORT}`);
    });
  }
  
  setupSocketHandlers() {
    this.io.on("connection", this.handleConnection.bind(this));
  }
  
  handleConnection(socket) {
    console.log(`User connected: ${socket.id}`);
    
    // Set up event handlers
    socket.on("disconnect", () => this.handleDisconnect(socket));
    socket.on("create_room", () => this.handleCreateRoom(socket));
    socket.on("join_room", (roomCode) => this.handleJoinRoom(socket, roomCode));
    socket.on("start", (roomCode) => this.handleStartGame(socket, roomCode));
    socket.on("choose", (data) => this.handlePlayerChoice(socket, data));
    socket.on("cancel_selection", (roomCode) => this.handleCancelSelection(socket, roomCode));
    socket.on("boost", (roomCode) => this.handleBoost(socket, roomCode));
    socket.on("leave_room", (roomCode) => this.handleLeaveRoom(socket, roomCode));
  }
  
  // Helper functions
  generateRoomCode() {
    return Math.random().toString(36).substring(7);
  }
  
  emitUpdate(roomCode, data) {
    this.io.to(roomCode).emit("update", data);
  }
  
  emitGameFrame(roomCode, gameObjects) {
    this.io.to(roomCode).emit("game_frame", gameObjects);
  }
  
  isRoomValid(roomCode) {
    return !!this.rooms[roomCode];
  }
  
  cleanupRoom(roomCode) {
    this.stopGameLoop(roomCode);
    delete this.rooms[roomCode];
    delete this.gameInstances[roomCode];
    console.log(`Deleted Room ${roomCode}`);
  }
  
  stopGameLoop(roomCode) {
    if (this.gameLoops[roomCode]) {
      clearInterval(this.gameLoops[roomCode]);
      delete this.gameLoops[roomCode];
    }
  }
  
  // Event handlers
  handleDisconnect(socket) {
    console.log(`User disconnected: ${socket.id}`);
    for (const roomCode in this.rooms) {
      const room = this.rooms[roomCode];
      
      if (room.users.has(socket.id)) {
        room.users.delete(socket.id);
        
        if (room.users.size === 0) {
          this.cleanupRoom(roomCode);
        } else if (room.game_state === GAME_STATES.LOBBY) {
          this.emitUpdate(roomCode, { 
            roomCode, 
            game_state: GAME_STATES.LOBBY, 
            users: room.users.size 
          });
        } else if (room.game_state === GAME_STATES.CHOOSING) {
          room.game_state = GAME_STATES.LOBBY;
          this.emitUpdate(roomCode, { 
            roomCode, 
            game_state: GAME_STATES.LOBBY, 
            users: room.users.size 
          });
        }
        break;
      }
    }
  }
  
  handleCreateRoom(socket) {
    const roomCode = this.generateRoomCode();
    socket.join(roomCode);
    
    this.rooms[roomCode] = {
      roomCode,
      users: new Map(),
      game_state: GAME_STATES.LOBBY,
      game_objects: null,
      winner: null,
      hasCustomObjects: false
    };
    
    this.rooms[roomCode].users.set(socket.id, null);
    console.log(`Created Room ${roomCode}`);
    
    this.emitUpdate(roomCode, { 
      roomCode, 
      game_state: GAME_STATES.LOBBY, 
      users: this.rooms[roomCode].users.size 
    });
  }
  
  handleJoinRoom(socket, roomCode) {
    if (!this.isRoomValid(roomCode)) {
      socket.emit("update", { error: "Room not found" });
      return;
    }
    
    const room = this.rooms[roomCode];
    
    if (room.game_state === GAME_STATES.LOBBY) {
      socket.join(roomCode);
      room.users.set(socket.id, null);
      
      this.emitUpdate(roomCode, { 
        roomCode, 
        game_state: GAME_STATES.LOBBY, 
        users: room.users.size 
      });
      
      console.log(`User ${socket.id} joined room ${roomCode}`);
    } else {
      socket.emit("update", { error: "Game already in progress" });
    }
  }
  
  handleStartGame(socket, roomCode) {
    if (!this.isRoomValid(roomCode)) return;
    
    const room = this.rooms[roomCode];
    
    if (room.users.size > 1) {
      room.game_state = GAME_STATES.CHOOSING;
      this.emitUpdate(roomCode, { 
        roomCode, 
        game_state: GAME_STATES.CHOOSING 
      });
    } else {
      socket.emit("update", { 
        roomCode, 
        game_state: GAME_STATES.LOBBY, 
        users: this.rooms[roomCode].users.size,
        error: "Not enough players to start the game"
      });
    }
  }
  
  async handlePlayerChoice(socket, data) {
    const { roomCode, option } = data;
    
    if (!this.isRoomValid(roomCode)) return;
    
    const room = this.rooms[roomCode];
    room.users.set(socket.id, option);
    
    if (data.custom) {
      room.hasCustomObjects = true;
    }
    
    socket.emit("update", { 
      roomCode, 
      game_state: GAME_STATES.READY, 
      option 
    });
    
    // Check if all players have made their choice
    if ([...room.users.values()].every(value => value !== null)) {
      let customLogic;
      
      if (room.hasCustomObjects) {
        try {
          const response = await generateGameLogic([...room.users.values()]);
          
          if (!response.success) {
            console.error(response.error);
            room.game_state = GAME_STATES.CHOOSING;
            room.hasCustomObjects = false;
            room.users.forEach((_, userId) => room.users.set(userId, null));
            
            this.emitUpdate(roomCode, { 
              roomCode, 
              game_state: GAME_STATES.CHOOSING, 
              error: response.error 
            });
            return;
          }
          
          customLogic = response.result;
          room.customLogic = customLogic;
        } catch (error) {
          console.error("Error generating game logic:", error);
          room.game_state = GAME_STATES.CHOOSING;
          room.hasCustomObjects = false;
          room.users.forEach((_, userId) => room.users.set(userId, null));
          
          this.emitUpdate(roomCode, { 
            roomCode, 
            game_state: GAME_STATES.CHOOSING, 
            error: "Failed to generate custom game logic" 
          });
          return;
        }
      } else {
        customLogic = DEFAULT_GAME_LOGIC;
      }
      
      room.game_state = GAME_STATES.READY;
      this.startGameLogic(roomCode, customLogic);
    }
  }
  
  handleCancelSelection(socket, roomCode) {
    if (!this.isRoomValid(roomCode)) return;
    
    const room = this.rooms[roomCode];
    room.users.set(socket.id, null);
    room.game_state = GAME_STATES.CHOOSING;
    
    socket.emit("update", { 
      roomCode, 
      game_state: GAME_STATES.CHOOSING 
    });
  }
  
  handleBoost(socket, roomCode) {
    if (!this.isRoomValid(roomCode) || 
        this.rooms[roomCode].game_state !== GAME_STATES.RUNNING || 
        !this.gameInstances[roomCode]) return;
    
    const typeBoosted = this.rooms[roomCode].users.get(socket.id);
    this.gameInstances[roomCode].boost(typeBoosted);
  }
  
  handleLeaveRoom(socket, roomCode) {
    console.log(`User ${socket.id} left room ${roomCode}`);
    socket.leave(roomCode);
    
    if (!this.isRoomValid(roomCode)) return;
    
    const room = this.rooms[roomCode];
    room.users.delete(socket.id);
    
    if (room.users.size === 0) {
      this.cleanupRoom(roomCode);
      return;
    }
    
    if (room.game_state === GAME_STATES.LOBBY) {
      this.emitUpdate(roomCode, { 
        roomCode, 
        game_state: GAME_STATES.LOBBY, 
        users: room.users.size 
      });
    }
    
    // Reset to lobby if we don't have enough players or game was in setup stages
    if ((room.users.size === 1 && room.game_state === GAME_STATES.CHOOSING) || 
        room.game_state === GAME_STATES.READY) {
      room.game_state = GAME_STATES.LOBBY;
      room.users.forEach((_, userId) => room.users.set(userId, null));
      
      this.emitUpdate(roomCode, { 
        roomCode, 
        game_state: GAME_STATES.LOBBY, 
        users: room.users.size 
      });
    }
  }
  
  startGameLogic(roomCode, customLogic) {
    if (!this.isRoomValid(roomCode) || 
        this.rooms[roomCode].game_state !== GAME_STATES.READY) return;
    
    const room = this.rooms[roomCode];
    this.gameInstances[roomCode] = new Game([...room.users.values()], customLogic);
    
    room.game_objects = this.gameInstances[roomCode].getObjects();
    room.game_state = GAME_STATES.RUNNING;
    
    this.emitUpdate(roomCode, { 
      roomCode, 
      game_state: GAME_STATES.RUNNING 
    });
    
    this.emitGameFrame(roomCode, room.game_objects);
    
    // Store the game loop interval so we can clear it later
    this.gameLoops[roomCode] = setInterval(() => {
      if (!this.gameInstances[roomCode]) {
        this.stopGameLoop(roomCode);
        return;
      }
      
      const gameInstance = this.gameInstances[roomCode];
      gameInstance.moveObjects();
      gameInstance.checkCollisions();
      
      room.game_objects = gameInstance.getObjects();
      this.emitGameFrame(roomCode, room.game_objects);
      
      const winner = gameInstance.checkWinner();
      if (winner) {
        this.stopGameLoop(roomCode);
        room.game_state = GAME_STATES.GAME_OVER;
        room.winner = winner;
        this.emitUpdate(roomCode, room);
      }
    }, GAME_LOOP_INTERVAL);
  }
}

// Create and start the server
const gameServer = new GameServer();
gameServer.start();