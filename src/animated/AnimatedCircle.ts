import { DecoratedArc, Value } from "../types"

class AnimatedCircle {
    private _x: Value
    private _y: Value
    private _r: Value
    private _percentage: number
    private _ended = false
    private _delay: number

    private _arc: DecoratedArc
    private _startAngle: number

    get x() {
        return this._x
    }
    get y() {
        return this._y
    }
    get r() {
        return this._r
    }

    get ended() {
        return this._ended
    }

    constructor(config: DecoratedArc, startAngle: number, delay?: number) {
        this._delay = delay || 0
        this._x = config.x
        this._y = config.y
        this._r = config.radius
        this._percentage = 0
        this._startAngle = startAngle
        this._arc = config
        this._arc.start = this._startAngle
        this._arc.end = this._startAngle
    }

    line(delta: number) {
        if (this._delay > 0) {
            this._delay -= 1
            return this._arc
        }
        this._percentage += delta
        this._arc.end = this._startAngle + this._percentage * Math.PI * 2
        if (this._percentage > 1.05) this._ended = true
        return this._arc
    }
}

export default AnimatedCircle
