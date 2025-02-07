import { Draw, DrawableFunction } from "../types"
import { generate, updateShapes, GenPoint } from "../utils"

const particlesGen2: DrawableFunction = ({ unwrap }) => {
    const points = generate(1000, i =>
        GenPoint([-512, 512], [-512, 512], {
            fill: `rgba(${(0 / 600) * 200},200,${200 * (1 - 0 / 600)},1)`,
            radius: 3,
            stateIndex: i
        })
    )

    const draw: Draw = (x: number) => {
        updateShapes(points, (point, index) => {
            const i = index % 200
            const s = Math.floor(index / 200)

            const targetAngle = (i / 200) * 2 * Math.PI + (x / 600) * Math.PI
            const targetX =
                300 * Math.cos(targetAngle) + (s < 2 ? -x / 3 : x / 3) - s * 10
            const targetY =
                300 * Math.sin(targetAngle) +
                (s % 2 === 0 ? -x / 3 : x / 3) -
                s * 10
            const dx = targetX - unwrap(points[index].x)
            const dy = targetY - unwrap(points[index].y)

            return {
                x: unwrap(point.x) + dx / 80,
                y: unwrap(point.y) + dy / 80,
                fill: `rgba(${(x / 600) * 200},200,${200 * (1 - x / 600)}, 1)`,
                radius: 3,
                stateIndex: x < 300 ? index : undefined
            }
        })

        return points
    }
    return {
        draw,
        iterate: x => x + 1,
        endIf: duration => duration >= 10000
    }
}

export default particlesGen2
