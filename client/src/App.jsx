import { useEffect, useRef, useState, useCallback } from "react";
import { socket } from "./util/socket";
import logo from "./assets/logo.png";
import "./App.css";


function App() {
  const [actualRoomData, setActualRoomData] = useState(null);
  const inputRoomCode = useRef(null);
  const inputIa = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    socket.connect();

    socket.on("update", (update) => {
      setActualRoomData(update);
      if (update.error) {
        alert(update.error);
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

  const handleCreateRoom = () => { socket.emit("create_room") };
  const handleJoinRoom = () => socket.emit("join_room", inputRoomCode.current.value);
  const handleStart = () => socket.emit("start", actualRoomData.roomCode);
  const handleChoose = (option) => { socket.emit("choose", { roomCode: actualRoomData.roomCode, option, custom: false }) };
  const handleBoost = () => socket.emit("boost", actualRoomData.roomCode);
  const leave = () => { socket.emit("leave_room", actualRoomData.roomCode); setActualRoomData(null) };
  const cancelSelection = () => socket.emit("cancel_selection", actualRoomData.roomCode);

  const handleCustomObject = async (event) => {
    const iaChoice = inputIa.current.value.trim();

    const validFormat = /^[a-zA-ZáéíóúüñÑ]+(?: [a-zA-ZáéíóúüñÑ]+)?$/;

    if (!iaChoice) {
      alert("Debes escribir un objeto.");
      return;
    }
    if (!validFormat.test(iaChoice)) {
      alert("Solo se permiten hasta dos palabras sin caracteres especiales o números.");
      return;
    }
    if (iaChoice.length > 20) {
      alert("El objeto es demasiado largo. Usa hasta 20 caracteres.");
      return;
    }

    socket.emit("choose", { roomCode: actualRoomData.roomCode, option: iaChoice, custom: true });
  }

  const drawObjects = useCallback((objects) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "30px Arial";
    objects.forEach(({ emoji, x, y }) => ctx.fillText(emoji, x, y));
  }, []);

  useEffect(() => {
    console.log("actualRoomData", actualRoomData);
  }, [actualRoomData]);


  return (
    <div className="center">
      {
        !actualRoomData || !actualRoomData.roomCode ? (
          <div className="menu">
            <img src={logo} width={500} />
            <h1 className="title">Emojis Battle Royale</h1>
            <button className="button" onClick={handleCreateRoom}>Crear Sala</button>
            <div className="flex">
              <input className="input" type="text" placeholder="Código de Sala" ref={inputRoomCode} />
              <button className="input-button" onClick={handleJoinRoom}>Unirse</button>
            </div>
          </div>
        ) : actualRoomData.game_state === "LOBBY" ? (
          <div className="menu">
            <div className="room-info">
              <h1>Sala: {actualRoomData.roomCode}</h1>
              <button className="copy-button" onClick={() => navigator.clipboard.writeText(actualRoomData.roomCode)}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-copy"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M7 7m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z" /><path d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1" /></svg></button>
            </div>
            <div className="room-info">
              <h2>N° de Jugadores:</h2>
              <h2>{actualRoomData.users}</h2>
            </div>
            <div className="room-info">
              <button className="button" onClick={leave}>Volver</button>
              <button className="button" onClick={handleStart}>Empezar</button>
            </div>
          </div>
        ) : actualRoomData.game_state === "CHOOSING" ? (
          <div className="menu">
            <h1>Elige uno:</h1>
            <div className="choices">
              {["rock", "paper", "scissor"].map((choice) => (
                <button key={choice} className="choice" onClick={() => handleChoose(choice)}>
                  {choice === "rock" ? "🪨" : choice === "paper" ? "📄" : "✂️"}
                </button>
              ))}
            </div>
            <h1>O inventa el tuyo</h1>
            <form className="flex" action={handleCustomObject}>
              <input className="input" placeholder="Escribe tu propio objeto" id="iaChoice" ref={inputIa} />
              <button className="input-button">Enviar <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 48 48"><path fill="currentColor" d="M34 6c-1.368 4.944-3.13 6.633-8 8c4.87 1.367 6.632 3.056 8 8c1.368-4.944 3.13-6.633 8-8c-4.87-1.367-6.632-3.056-8-8m-14 8c-2.395 8.651-5.476 11.608-14 14c8.524 2.392 11.605 5.349 14 14c2.395-8.651 5.476-11.608 14-14c-8.524-2.392-11.605-5.349-14-14" /></svg></button>
            </form>
          </div>
        ) : actualRoomData.game_state === "READY" ? (
          <div>
            <h1>Elegiste: "{actualRoomData.option}"</h1>
            <button className="sm-button" onClick={cancelSelection}>Cancelar?</button>
            <h2>Esperando al resto de jugadores</h2>
          </div>
        ) : actualRoomData.game_state === "RUNNING" ? (
          <div className="menu">
            <canvas ref={canvasRef} width="800" height="600"></canvas>
            <button onClick={handleBoost} className="turbo-button">Boost</button>
          </div>
        ) : actualRoomData.game_state === "GAME_OVER" ? (
          <div className="menu">
            <h1>Ganador: {actualRoomData.winner}</h1>
            {actualRoomData.customLogic ?
              <div>
                <div className="ai-logic">
                  <div className="ai-label">Logica Generada con IA:</div>
                  <ul>
                    {actualRoomData.customLogic.map(({ object, emoji, logic }) => (
                      <li key={object}>
                        <h3>{object}</h3>
                        <h3>{emoji}: </h3>
                        <h3>{logic}</h3>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              : null
            }
            <button className="button" onClick={leave}>Volver a jugar</button>
          </div>
        ) : null
      }
    </div>
  );
}

export default App;
