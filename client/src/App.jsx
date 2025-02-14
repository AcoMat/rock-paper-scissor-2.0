import { useEffect, useRef, useState } from "react";
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
      }else if (update.game_state === "RUNNING") {
        
      }
    });

    return () => {
      socket.disconnect();
      setActualRoomData(null);
    }

  }, []);


  const handleCreateRoom = () => {
    socket.emit("create_room");
  }

  const handleJoinRoom = () => {
    const roomCode = inputRoomCode.current.value;
    socket.emit("join_room", roomCode);
  }

  const handleStart = () => {
    socket.emit("start", actualRoomData.roomCode);
  }

  const handleChoose = (option) => {
    socket.emit("choose", { roomCode: actualRoomData.roomCode, option });
  }


  function drawObjects(objects) {
    canvasRef.current.getContext("2d").clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    objects.forEach(obj => {
      canvasRef.current.getContext("2d").font = "30px Arial";
      canvasRef.current.getContext("2d").fillText(obj.type, obj.x, obj.y);
    });
  }



  return (
    !actualRoomData ?
      <div>
        <h1>Menu</h1>
        <button onClick={handleCreateRoom}>Crear Sala</button>
        <input type="text" placeholder="Código de Sala" ref={inputRoomCode} />
        <button onClick={handleJoinRoom}>Unirse</button>
      </div>
      : actualRoomData?.game_state === "LOBBY" ?
        <div>
          <h1>Sala:{actualRoomData.roomCode}</h1>
          <button onClick={handleStart}>Empezar</button>
          <button>Salir</button>
        </div>
        : actualRoomData?.game_state === "CHOOSING" ?
          <div>
            <h1>Elige</h1>
            <button onClick={() => handleChoose("rock")}>🧱</button>
            <button onClick={() => handleChoose("paper")}>📄</button>
            <button onClick={() => handleChoose("scissor")}>✂️</button>
          </div>
          : actualRoomData?.game_state === "RUNNING" ?
            <div>
              <h1>En Juego</h1>
              <canvas ref={canvasRef} width="800" height="600"></canvas>
            </div>
            : actualRoomData?.game_state === "GAME_OVER" ?
              <div>
                <h1>Fin del Juego</h1>
              </div>
              : null
  )
}

export default App;
