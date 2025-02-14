export default class Game {
    constructor(playerOneChoice, playerTwoChoice) {
        this.emojis = {rock:"🧱", paper:"📄", scissor:"✂️"};
        this.objects = [];
        this.speed = 2.5;
        this.canvas = {width: 800, height: 600};

        this.objects.push({
            type: this.emojis[playerOneChoice],
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            vx: 0,
            vy: 0,
        });

        this.objects.push({
            type: this.emojis[playerTwoChoice],
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            vx: 0,
            vy: 0,
        });
    }

    getObjects() {
        return this.objects;
    }

    findNearestEnemy(obj) {
        let minDist = Infinity;
        let target = null;

        this.objects.forEach(enemy => {
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

    moveObjects() {
        this.objects.forEach(obj => {
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

    checkCollisions() {
        for (let i = 0; i < this.objects.length; i++) {
            for (let j = i + 1; j < this.objects.length; j++) {
                const obj1 = this.objects[i];
                const obj2 = this.objects[j];

                const dx = obj1.x - obj2.x;
                const dy = obj1.y - obj2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 30) {
                    if (
                        (obj1.type === "🧱" && obj2.type === "✂️") ||
                        (obj1.type === "✂️" && obj2.type === "📄") ||
                        (obj1.type === "📄" && obj2.type === "🧱")
                    ) {
                        this.objects.splice(j, 1);
                    } else if (
                        (obj2.type === "🧱" && obj1.type === "✂️") ||
                        (obj2.type === "✂️" && obj1.type === "📄") ||
                        (obj2.type === "📄" && obj1.type === "🧱")
                    ) {
                        this.objects.splice(i, 1);
                    }
                }
            }
        }
    }

    checkWinner() {
        const remainingTypes = new Set(this.objects.map(obj => obj.type));

        if (remainingTypes.size === 1) {
            return remainingTypes[0];
        }
        return false;
    }

}