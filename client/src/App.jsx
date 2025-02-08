import { useEffect, useRef, useState } from "react";
import { socket } from "./util/socket";

function App() {
  const [actualRoomData, setActualRoomData] = useState(null);
  const inputRoomCode = useRef(null);


  useEffect(() => {
    socket.connect();

    socket.on("update", (update) => {
      console.log(update);
      if (!actualRoomData) {
        setActualRoomData(update);
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

  const handleStartGame = () => {
    socket.emit("start_game", actualRoomData.roomCode);
  }

  const handleChoose = (option) => {
    socket.emit("choose", { roomCode: actualRoomData.roomCode, option });
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
          <button onClick={handleStartGame}>Empezar</button>
          <button>Salir</button>
        </div>
        : actualRoomData?.game_state === "CHOOSING" ?
          <div>
            <h1>Elige</h1>
            <button onClick={() => handleChoose("rock")}>🧱</button>
            <button onClick={() => handleChoose("paper")}>📄</button>
            <button onClick={() => handleChoose("scissor")}>✂️</button>
          </div>
          : actualRoomData?.game_state === "IN_PROGRESS" ?
            <div>
              <h1>En Juego</h1>
            </div>
            : actualRoomData?.game_state === "GAME_OVER" ?
              <div>
                <h1>Fin del Juego</h1>
              </div>
              : null
  )
}

export default App;
