import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

function App() {
  const [actualRoom, setActualRoom] = useState(null);
  const socketRef = useRef(null);
  

  const gameStages = ["lobby", "config", "game", "end"];
  const [gameStage, setGameStage] = useState(gameStages[0]);
  
  
  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io("http://localhost:3000");

      socketRef.current.on("connect", () => {
        console.log(`Conectado con id: ${socketRef.current.id}`);
      });

      socketRef.current.on("userJoined", (data) => {
        
          setActualRoom(data.room);
          
      });

      socketRef.current.on("roomCreated", (data) => {
        setActualRoom(data.room);
      });


      socketRef.current.on("nextStage", () => {
        console.log("nextStage");
        nextStage();
      });

    }

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  const createRoom = () => {
    socketRef.current.emit("createRoom");
  };

  const getMyId = () => {
    console.log(socketRef.current.id);
  };

  const joinRoom = () => {
    const roomId = document.getElementById("roomIdInput").value;
    socketRef.current.emit("joinRoom", roomId);
  }

  const nextStage = () => {
    setGameStage(prevStage => gameStages[gameStages.indexOf(prevStage) + 1]);
    console.log(gameStage);
    
  }

  const handleSetup = () => {
    socketRef.current.emit("confirmSelection",{
      room:actualRoom,
      config:{
        rocks:1,
        papers:1,
        scissors:1
      }
    });
  }


  return (
    
      gameStage === "lobby" &&
      <>
        <h1>Sala actual: {actualRoom || "No estás en ninguna sala"}</h1>
        <button onClick={createRoom}>Crear Sala</button>
        <button onClick={getMyId}>Mi id</button>
        <input id="roomIdInput" type="text" /><button onClick={joinRoom}>Unirse</button>
        <button onClick={() => socketRef.current.emit("tryStart", actualRoom)}>Start</button>
      </>
      ||
      gameStage === "config" &&
      <>
        <h1>Configuración</h1>
        <h3>piedra</h3>
        <h3>papel</h3>
        <h3>tijera</h3>
        <button onClick={handleSetup}>Confirmar</button>
      </>
      ||
      gameStage === "game" &&
      <>
        <h1>Juego</h1>
        <h3>Esperando a que todos confirmen</h3>
      </>
      ||
      gameStage === "end" &&
      <>
        <h1>Fin del juego</h1>   
      </>
  );
}

export default App;
