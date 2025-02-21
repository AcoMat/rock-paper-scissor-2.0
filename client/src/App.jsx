import { useEffect, useRef, useState, useCallback } from "react";
import { socket } from "./util/socket";
import "./App.css";


function App() {
  const [actualRoomData, setActualRoomData] = useState(null);
  const inputRoomCode = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    socket.connect();

    socket.on("update", (update) => {
      setActualRoomData(update);
      console.log(update);
      if (update.game_state === "READY") {
        socket.emit("start_game", update.roomCode);
      }
    });

    socket.on("game_frame", (objects) => {
      drawObjects(objects);
    });

    return () => {
      socket.disconnect();
      setActualRoomData(null);
    };
  }, []);

  const handleCreateRoom = () => {socket.emit("create_room")};
  const handleJoinRoom = () => socket.emit("join_room", inputRoomCode.current.value);
  const handleStart = () => socket.emit("start", actualRoomData.roomCode);
  const handleChoose = (option) => { socket.emit("choose", { roomCode: actualRoomData.roomCode, option }) };
  const handleBoost = () => socket.emit("boost", actualRoomData.roomCode);
  const restart = () => { setActualRoomData(null); };

  const drawObjects = useCallback((objects) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "30px Arial";
    objects.forEach(({ type, x, y }) => ctx.fillText(type, x, y));
  }, []);

  useEffect(() => {
    console.log("actualRoomData", actualRoomData);
  }, [actualRoomData]);
    

  return (
    <div className="center">
      {
        !actualRoomData ? (
          <div className="menu">
            <h1 className="title">Emojis Battle Royale</h1>
            <button onClick={handleCreateRoom}>Crear Sala</button>
            <span>o</span>
            <div className="join-room">
              <input type="text" placeholder="Código de Sala" ref={inputRoomCode} />
              <button onClick={handleJoinRoom}>Unirse</button>
            </div>
          </div>
        ) : actualRoomData.game_state === "LOBBY" ? (
          <div className="menu">
            <div className="room-info">
              <h1>Sala: {actualRoomData.roomCode}</h1>
              <button className="copy-button" onClick={() => navigator.clipboard.writeText(actualRoomData.roomCode)}><svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  strokeWidth="2"  strokeLinecap="round"  strokeLinejoin="round"  className="icon icon-tabler icons-tabler-outline icon-tabler-copy"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 7m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z" /><path d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1" /></svg></button>
            </div>
            <div className="room-info">
              <h2>Cant Jugadores: </h2>
              <h2>{actualRoomData.users}</h2>
            </div>
            <button onClick={handleStart}>Empezar</button>
          </div>
        ) : actualRoomData.game_state === "CHOOSING" ? (
          <div className="menu">
            <h1>Elige:</h1>
            <div className="choices">
              {["rock", "paper", "scissor"].map((choice) => (
                <button key={choice} onClick={() => handleChoose(choice)}>
                  {choice === "rock" ? "🧱" : choice === "paper" ? "📄" : "✂️"}
                </button>
              ))}
            </div>
          </div>
        ) : actualRoomData.game_state === "READY" ? (
          <div>
            <h1>En Juego</h1>
            <canvas ref={canvasRef} width="800" height="600"></canvas>
            <button onClick={handleBoost}>Boost</button>
          </div>
        ) : actualRoomData.game_state === "GAME_OVER" ? (
          <div className="menu">
            <h1>Fin del Juego</h1>
            <h1>Ganador: {actualRoomData.winner}</h1>
            <button onClick={restart}>Volver a jugar</button>
          </div>
        ) : null
      }
    </div>

  );
}

export default App;
