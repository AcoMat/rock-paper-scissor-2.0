import { useEffect, useRef, useState } from "react";

function Game() {
    const canvasRef = useRef(null);
    const [winner, setWinner] = useState(null);
    const emojis = ["🧱", "📄", "✂️"];
    const objects = [];
    const speed = 2.5;

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        function createObjects(count) {
            for (let i = 0; i < count; i++) {
                const type = emojis[Math.floor(Math.random() * emojis.length)];
                objects.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * speed,
                    vy: (Math.random() - 0.5) * speed,
                    type: type
                });
            }
        }

        function drawObjects() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            objects.forEach(obj => {
                ctx.font = "30px Arial";
                ctx.fillText(obj.type, obj.x, obj.y);
            });
        }

        function findNearestEnemy(obj) {
            let minDist = Infinity;
            let target = null;

            objects.forEach(enemy => {
                if (
                    (obj.type === "🧱" && enemy.type === "📄") ||
                    (obj.type === "📄" && enemy.type === "✂️") ||
                    (obj.type === "✂️" && enemy.type === "🧱")
                ) {
                    const dx = enemy.x - obj.x;
                    const dy = enemy.y - obj.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < minDist) {
                        minDist = dist;
                        target = enemy;
                    }
                }
            });

            return target;
        }

        function moveObjects() {
            objects.forEach(obj => {
                const target = findNearestEnemy(obj);

                if (target) {
                    let dx = target.x - obj.x;
                    let dy = target.y - obj.y;
                    let mag = Math.sqrt(dx * dx + dy * dy);

                    if (mag > 0) {
                        obj.vx = (dx / mag) * speed;
                        obj.vy = (dy / mag) * speed;
                    }
                }

                obj.x += obj.vx;
                obj.y += obj.vy;

                if (obj.x < 0 || obj.x > canvas.width - 30) obj.vx *= -1;
                if (obj.y < 0 || obj.y > canvas.height - 30) obj.vy *= -1;
            });
        }

        function checkCollisions() {
            for (let i = 0; i < objects.length; i++) {
                for (let j = i + 1; j < objects.length; j++) {
                    const obj1 = objects[i];
                    const obj2 = objects[j];

                    const dx = obj1.x - obj2.x;
                    const dy = obj1.y - obj2.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 30) {
                        if (
                            (obj1.type === "🧱" && obj2.type === "✂️") ||
                            (obj1.type === "✂️" && obj2.type === "📄") ||
                            (obj1.type === "📄" && obj2.type === "🧱")
                        ) {
                            objects.splice(j, 1);
                        } else if (
                            (obj2.type === "🧱" && obj1.type === "✂️") ||
                            (obj2.type === "✂️" && obj1.type === "📄") ||
                            (obj2.type === "📄" && obj1.type === "🧱")
                        ) {
                            objects.splice(i, 1);
                        }
                    }
                }
            }
        }

        function checkWinner() {
            const remainingTypes = new Set(objects.map(obj => obj.type));

            if (remainingTypes.size === 1) {
                setWinner([...remainingTypes][0]); // Guarda el emoji ganador
                return true;
            }
            return false;
        }

        function update() {
            if (!checkWinner()) {
                moveObjects();
                checkCollisions();
                drawObjects();
                requestAnimationFrame(update);
            }
        }

        createObjects(10);
        update();
    }, []);

    return (
        <div style={{ textAlign: "center" }}>
            <canvas ref={canvasRef} width="800" height="600"></canvas>
            {winner && <h2>¡El ganador es {winner}!</h2>}
        </div>
    );
}

export default Game;
