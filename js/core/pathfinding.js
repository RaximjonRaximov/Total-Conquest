// ============================================
// PATHFINDING (A*) - Soddalashtirilgan versiya
// ============================================

const Pathfinding = {
    // Grid bo'yicha yo'l qidirish
    // start, end: {x, y}
    // weights: har bir katak uchun og'irlik (1 = bo'sh, 100 = devor)
    findPath(startX, startY, endX, endY) {
        const start = { x: Math.floor(startX), y: Math.floor(startY) };
        const end = { x: Math.floor(endX), y: Math.floor(endY) };

        if (start.x === end.x && start.y === end.y) return [];

        const openSet = [start];
        const cameFrom = {};
        const gScore = {};
        const fScore = {};

        const key = (p) => `${p.x},${p.y}`;
        
        gScore[key(start)] = 0;
        fScore[key(start)] = this.heuristic(start, end);

        let iterations = 0;
        const maxIterations = 400; // Juda ko'p vaqt sarflamaslik uchun

        while (openSet.length > 0) {
            iterations++;
            if (iterations > maxIterations) break;

            // Eng kichik fScore ga ega elementni olish
            let current = openSet[0];
            let lowestF = fScore[key(current)];
            let currentIndex = 0;

            for (let i = 1; i < openSet.length; i++) {
                const score = fScore[key(openSet[i])];
                if (score < lowestF) {
                    lowestF = score;
                    current = openSet[i];
                    currentIndex = i;
                }
            }

            if (current.x === end.x && current.y === end.y) {
                return this.reconstructPath(cameFrom, current);
            }

            openSet.splice(currentIndex, 1);

            const neighbors = this.getNeighbors(current);
            for (const neighbor of neighbors) {
                const weight = this.getWeight(neighbor.x, neighbor.y);
                const tentativeGScore = gScore[key(current)] + weight;

                if (gScore[key(neighbor)] === undefined || tentativeGScore < gScore[key(neighbor)]) {
                    cameFrom[key(neighbor)] = current;
                    gScore[key(neighbor)] = tentativeGScore;
                    fScore[key(neighbor)] = tentativeGScore + this.heuristic(neighbor, end);

                    if (!openSet.find(p => p.x === neighbor.x && p.y === neighbor.y)) {
                        openSet.push(neighbor);
                    }
                }
            }
        }

        return []; // Yo'l topilmadi
    },

    heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    },

    getNeighbors(p) {
        const neighbors = [];
        const dirs = [
            {x:0, y:1}, {x:0, y:-1}, {x:1, y:0}, {x:-1, y:0},
            {x:1, y:1}, {x:1, y:-1}, {x:-1, y:1}, {x:-1, y:-1}
        ];

        for (const d of dirs) {
            const nx = p.x + d.x;
            const ny = p.y + d.y;
            if (nx >= 0 && nx < Grid.SIZE && ny >= 0 && ny < Grid.SIZE) {
                neighbors.push({x: nx, y: ny});
            }
        }
        return neighbors;
    },

    getWeight(x, y) {
        const tile = Grid.tiles[y][x];
        if (tile.buildingId !== null) {
            const b = BuildingManager.buildings[tile.buildingId];
            if (b && b.type === 'wall') return 50; // Devor orqali o'tish qimmat
            return 200; // Bino orqali o'tish juda qimmat
        }
        return 1; // Bo'sh joy
    },

    reconstructPath(cameFrom, current) {
        const path = [];
        let curr = current;
        while (cameFrom[`${curr.x},${curr.y}`]) {
            path.push(curr);
            curr = cameFrom[`${curr.x},${curr.y}`];
        }
        return path.reverse();
    }
};
