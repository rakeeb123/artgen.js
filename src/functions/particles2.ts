import { Lambda, DecoratedPoint, Shape, Point, Line, updateShapes } from "../types";

const particlesGen2 = (): Lambda => {
    let points: DecoratedPoint[] = []

    for (let p = 0; p < 1000; p++) {
        points.push(Shape.point({
            x: Math.random() * 1024 - 512,
            y: Math.random() * 1024 - 512,
            fill: `rgba(${0 / 600 * 200},200,${200 * (1 - 0 / 600)},1)`,
            radius: 3,
            stateIndex: p
        }));
    }

    const lambda: Lambda = (x: number) => {
        updateShapes(points, (point, index) => {
            const i = index % 200;
            const s = Math.floor(index / 200);

            const targetAngle = (i / 200 * 2 * Math.PI) + (x / 600) * Math.PI;
            const targetX = 300 * Math.cos(targetAngle) + (s < 2 ? -x / 3 : x / 3) - s * 10;
            const targetY = 300 * Math.sin(targetAngle) + (s % 2 === 0 ? -x / 3 : x / 3) - s * 10;
            const dx = targetX - points[index].x;
            const dy = targetY - points[index].y;

            return {
                x: point.x + dx / 80,
                y: point.y + dy / 80,
                fill: `rgba(${x / 600 * 200},200,${200 * (1 - x / 600)}, 1)`,
                radius: 3,
                stateIndex: x < 300 ? index : undefined,
            };
        });
        
        return {
            shapes: points,
            dx: 1,
        }
    }
    return lambda;
}

export default particlesGen2;