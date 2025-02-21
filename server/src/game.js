export default class Game {
    constructor(players) {
        this.EMOJIS = { rock: "🧱", paper: "📄", scissor: "✂️" };
        this.CANVAS = { width: 800, height: 600};
        this.STEP = 2; // Movimiento en pasos de 2 píxeles
        this.MIN_DISTANCE_FOR_COLLISION = 30;

        this.objects = [];

        // Crear objetos para cada jugador
        players.forEach(player => {
            this.objects.push(this.createObject(player));
            this.objects.push(this.createObject(player));
            this.objects.push(this.createObject(player));
            this.objects.push(this.createObject(player));
            this.objects.push(this.createObject(player));
        });
    }

    createObject(type) {
        // Dirección inicial aleatoria en pasos de 2 píxeles
        const directions = [
            { vx: this.STEP, vy: 0 },  // Derecha
            { vx: -this.STEP, vy: 0 }, // Izquierda
            { vx: 0, vy: this.STEP },  // Abajo
            { vx: 0, vy: -this.STEP }, // Arriba
            { vx: this.STEP, vy: this.STEP },    // Diagonal abajo derecha
            { vx: -this.STEP, vy: this.STEP },   // Diagonal abajo izquierda
            { vx: this.STEP, vy: -this.STEP },   // Diagonal arriba derecha
            { vx: -this.STEP, vy: -this.STEP }   // Diagonal arriba izquierda
        ];
        
        const initialDirection = directions[Math.floor(Math.random() * directions.length)];

        return {
            type: this.EMOJIS[type],
            x: Math.random() * this.CANVAS.width,
            y: Math.random() * this.CANVAS.height,
            vx: initialDirection.vx,
            vy: initialDirection.vy
        };
    }

    getObjects() {
        return this.objects;
    }

    moveObjects() {
        this.objects.forEach(obj => {
            // Mover el objeto
            obj.x += obj.vx;
            obj.y += obj.vy;
    
            // Verificar colisiones con los bordes del canvas y hacer que reboten
            if (obj.x <= 0 || obj.x + 30 >= this.CANVAS.width) {
                obj.vx *= -1; // Invertir dirección en X
                obj.x = Math.max(0, Math.min(obj.x, this.CANVAS.width - 30)); // Ajustar dentro del límite
            }
            if (obj.y <= 0 || obj.y + 30 >= this.CANVAS.height) {
                obj.vy *= -1; // Invertir dirección en Y
                obj.y = Math.max(0, Math.min(obj.y, this.CANVAS.height - 30)); // Ajustar dentro del límite
            }
    
            // 20% de probabilidad de cambiar de dirección aleatoriamente
            if (Math.random() < 0.2) {
                const directions = [
                    { vx: this.STEP, vy: 0 },
                    { vx: -this.STEP, vy: 0 },
                    { vx: 0, vy: this.STEP },
                    { vx: 0, vy: -this.STEP },
                    { vx: this.STEP, vy: this.STEP },
                    { vx: -this.STEP, vy: this.STEP },
                    { vx: this.STEP, vy: -this.STEP },
                    { vx: -this.STEP, vy: -this.STEP }
                ];
                const newDirection = directions[Math.floor(Math.random() * directions.length)];
                obj.vx = newDirection.vx;
                obj.vy = newDirection.vy;
            }
        });
    }
    

    checkCollisions() {
        const newObjs = [];

        for (let i = 0; i < this.objects.length; i++) {
            let obj1 = this.objects[i];
            let isEliminated = false;

            for (let j = 0; j < this.objects.length; j++) {
                if (i === j) continue;

                let obj2 = this.objects[j];
                const dx = obj1.x - obj2.x;
                const dy = obj1.y - obj2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.MIN_DISTANCE_FOR_COLLISION && this.isEnemy(obj1, obj2)) {
                    obj1.type = obj2.type;
                }
            }
            newObjs.push(obj1);
        }

        this.objects = newObjs;
    }

    isEnemy(obj1, obj2) {
        return (
            (obj1.type === this.EMOJIS.rock && obj2.type === this.EMOJIS.paper) ||
            (obj1.type === this.EMOJIS.paper && obj2.type === this.EMOJIS.scissor) ||
            (obj1.type === this.EMOJIS.scissor && obj2.type === this.EMOJIS.rock)
        );
    }

    checkWinner() {
        const remainingTypes = new Set(this.objects.map(obj => obj.type));

        if (remainingTypes.size === 1) {
            return remainingTypes.values().next().value;
        }
        return false;
    }

    boost(type){
        this.objects.forEach(obj => {
            if (obj.type === this.EMOJIS[type]) { 
                obj.vx *= 2;
                obj.vy *= 2;
            }
        });
    }
}
