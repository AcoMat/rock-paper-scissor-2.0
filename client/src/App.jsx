import { useEffect, useRef, useState, useCallback } from "react";
import { socket } from "./util/socket";

function App() {
  const [actualRoomData, setActualRoomData] = useState(null);
  const inputRoomCode = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    socket.connect();

    socket.on("update", (update) => {
      setActualRoomData(update);
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

  const handleCreateRoom = () => socket.emit("create_room");
  const handleJoinRoom = () => socket.emit("join_room", inputRoomCode.current.value);
  const handleStart = () => socket.emit("start", actualRoomData.roomCode);
  const handleChoose = (option) => { socket.emit("choose", { roomCode: actualRoomData.roomCode, option }) };
  const handleBoost = () => socket.emit("boost", actualRoomData.roomCode );

  const drawObjects = useCallback((objects) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "30px Arial";
    objects.forEach(({ type, x, y }) => ctx.fillText(type, x, y));
  }, []);

  return (
    !actualRoomData ? (
      <div>
        <h1>Menu</h1>
        <button onClick={handleCreateRoom}>Crear Sala</button>
        <input type="text" placeholder="Código de Sala" ref={inputRoomCode} />
        <button onClick={handleJoinRoom}>Unirse</button>
      </div>
    ) : actualRoomData.game_state === "LOBBY" ? (
      <div>
        <h1>Sala: {actualRoomData.roomCode}</h1>
        <button onClick={handleStart}>Empezar</button>
      </div>
    ) : actualRoomData.game_state === "CHOOSING" ? (
      <div>
        <h1>Elige</h1>
        {["rock", "paper", "scissor"].map((choice) => (
          <button key={choice} onClick={() => handleChoose(choice)}>
            {choice === "rock" ? "🧱" : choice === "paper" ? "📄" : "✂️"}
          </button>
        ))}
      </div>
    ) : actualRoomData.game_state === "READY" ? (
      <div>
        <h1>En Juego</h1>
        <canvas ref={canvasRef} width="800" height="600"></canvas>
        <button onClick={handleBoost}>Boost</button>
      </div>
    ) : actualRoomData.game_state === "GAME_OVER" ? (
      <div>
        <h1>Fin del Juego</h1>
        <h1>Ganador: {actualRoomData.winner}</h1>
      </div>
    ) : null
  );
}

export default App;
