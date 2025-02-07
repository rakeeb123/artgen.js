import {
    DecoratedPoint,
    DecoratedShape,
    DecoratedLine,
    Range,
    DecoratedArc,
    Value,
    DrawableFunction,
    DrawableFunctionConfig
} from "../types"

import VirtualCanvas from "./VirtualCanvas"
import { unwrap, unwrapColor, rgba } from "../utils"

type Separation = {
    fill: DecoratedShape[]
    stroke: DecoratedShape[]
    fillAndStroke: DecoratedShape[]
}

type IndexedSeparationMap = Map<number, Separation>

class TimeTracker {
    private _entries: Map<string, number>
    private _start: number
    constructor() {
        this._entries = new Map()
        this._start = 0
    }

    start(): void {
        this._entries.clear()
        this._start = performance.now()
        this._entries.set("_start", this._start)
    }

    addBreakpoint(name: string): void {
        this._entries.set(name, performance.now())
    }

    output(): string {
        const end = performance.now()
        const arr = Array.from(this._entries)
        return `${arr
            .map(
                (time, i) =>
                    `${time[0]}: ${(i >= 1
                        ? time[1] - arr[i - 1][1]
                        : 0
                    ).toFixed(2)}ms, elapsed: ${(time[1] - this._start).toFixed(
                        2
                    )}ms`
            )
            .join("\n")}\nTotal Time: ${(end - this._start).toFixed(2)}ms
        `
    }

    timeLapsed(): number {
        return performance.now() - this._start
    }
}

function bounded(num: number, lower: number, upper: number): number {
    return Math.min(Math.max(num, lower), upper)
}

function getRange(
    range: Range<number | string>,
    length: number
): Range<number> {
    if (typeof range[0] === "string") {
        const newRange: Range<number> = [
            parseFloat(range[0]) / 100.0,
            parseFloat(range[1] as string) / 100.0
        ]
        if (isNaN(newRange[0]) || isNaN(newRange[1])) return [0, length - 1]
        return [
            Math.round(bounded(newRange[0], 0, 1) * (length - 1)),
            Math.round(bounded(newRange[1], 0, 1) * (length - 1))
        ]
    }
    const numRange = range as Range<number>
    return [
        bounded(numRange[0], 0, length - 1),
        bounded(numRange[1], 0, length - 1)
    ]
}

class DrawEngine {
    private _virtualCanvas: VirtualCanvas
    private _ctx: CanvasRenderingContext2D | null
    private _backgroundCtx: CanvasRenderingContext2D | null
    private _drawableFunctionConfig: DrawableFunctionConfig
    private _startTime = 0
    private _prevTime = 0
    private _iterationCount = 0
    private _state: Map<number, DecoratedShape>
    private _timeTracker: TimeTracker

    constructor(
        fun: DrawableFunction,
        container: HTMLDivElement,
        coordinateSystem?: {
            width: number
            height: number
        }
    ) {
        this._drawableFunctionConfig = fun({ unwrap, rgba })
        // normalizing to square canvas
        const artboard = document.createElement("canvas")
        artboard.className = "artgen-canvas"
        artboard.width = container.clientWidth * 2
        artboard.height = container.clientHeight * 2

        const backgroundArtboard = document.createElement("canvas")
        backgroundArtboard.className = "artgen-canvas"
        backgroundArtboard.width = container.clientWidth * 2
        backgroundArtboard.height = container.clientHeight * 2

        this._style(artboard)
        this._style(backgroundArtboard)

        container.appendChild(backgroundArtboard)
        container.appendChild(artboard)
        if (coordinateSystem)
            this._virtualCanvas = new VirtualCanvas(
                coordinateSystem.width,
                coordinateSystem.height
            )
        else
            this._virtualCanvas = new VirtualCanvas(
                artboard.width,
                artboard.height
            )

        this._ctx = artboard.getContext("2d")
        this._backgroundCtx = backgroundArtboard.getContext("2d")
        this._state = new Map<number, DecoratedShape>()

        this._startTime = 0
        this._timeTracker = new TimeTracker()
    }

    private _style(artboard: HTMLElement): void {
        artboard.style.position = "absolute"
        artboard.style.left = "0"
        artboard.style.top = "0"
        artboard.style.width = "inherit"
        artboard.style.height = "inherit"
    }

    /**
     * Start the animation
     */
    start(): void {
        if (!this._ctx || !this._backgroundCtx) return
        this._startTime = performance.now()

        // clear the state
        this._state = new Map<number, DecoratedShape>()
        this._iterationCount = 0

        requestAnimationFrame(() =>
            this._draw(
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                this._ctx!,
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                this._backgroundCtx!,
                this._drawableFunctionConfig,
                0
            )
        )
    }

    /**
     * Draws the
     */
    private _draw = (
        ctx: CanvasRenderingContext2D,
        backgroundCtx: CanvasRenderingContext2D,
        fun: DrawableFunctionConfig,
        x: number
    ): void => {
        this._timeTracker.start()
        const funResult = fun.draw(x, this._iterationCount)
        this._timeTracker.addBreakpoint("calculate")

        const next = (): void =>
            this._iterate(x, fun, newX => {
                this._draw(ctx, backgroundCtx, fun, newX)
            })

        function addToIndexedSeparationMap(
            shape: DecoratedShape,
            acc: IndexedSeparationMap
        ): void {
            if (!acc.get(shape.zIndex))
                acc.set(shape.zIndex, {
                    fill: [],
                    stroke: [],
                    fillAndStroke: []
                })
            if (shape.fill && shape.stroke)
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                acc.get(shape.zIndex)!.fillAndStroke.push(shape)
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            else if (shape.fill) acc.get(shape.zIndex)!.fill.push(shape)
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            else if (shape.stroke) acc.get(shape.zIndex)!.stroke.push(shape)
        }

        // separate points between points that have changed state, and points that have not
        const states = funResult.reduce(
            (accum, shape) => {
                if (shape.stateIndex === undefined) {
                    addToIndexedSeparationMap(shape, accum.staticState)
                    return accum
                }

                if (!this._state.has(shape.stateIndex)) {
                    this._state.set(shape.stateIndex, shape)
                }
                this._state.set(shape.stateIndex, shape)
                accum.changeState = true
                return accum
            },
            { changeState: false, staticState: new Map<number, Separation>() }
        )

        this._timeTracker.addBreakpoint("reduce all")

        // if there are no changes to be made, then render as usual
        if (!states.changeState) {
            this._render(backgroundCtx, states.staticState.entries())
            this._timeTracker.addBreakpoint("render static")
            if (this._timeTracker.timeLapsed() > 15)
                console.log(this._timeTracker.output())
            return next()
        }

        /**
         * if there are changes to be made,
         *  1) Clear the canvas
         *  2) Redraw elements from saved static state
         *  3) Redraw the newly updated state
         *
         * Note, if there are a lot of points (> 2000) already drawn in static state, this will be very slow
         * Don't have > 1000 points saved in the state
         */

        // 1) Clear the canvas
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

        // 2) Render static elements into the background
        this._render(backgroundCtx, states.staticState.entries())
        this._timeTracker.addBreakpoint("render static")

        // 3) Redraw elements from newly updated state
        const stateMap = Array.from(this._state.entries()).reduce(
            (accum, entry) => {
                addToIndexedSeparationMap(entry[1], accum)
                return accum
            },
            new Map<number, Separation>()
        )
        this._timeTracker.addBreakpoint("reduce state")

        this._render(ctx, stateMap.entries())
        this._timeTracker.addBreakpoint("render state")

        if (this._timeTracker.timeLapsed() > 15)
            console.log(this._timeTracker.output())
        return next()
    }

    private _iterate(
        currentX: number,
        fun: DrawableFunctionConfig,
        next: (x: number) => void
    ): void {
        const currentTime = performance.now()
        const runningTime = currentTime - this._startTime

        if (fun.endIf(runningTime, currentX)) return

        const fps = 1000 / (currentTime - this._prevTime)

        if (this._prevTime !== 0) this.dataListener(fps, runningTime)

        this._prevTime = currentTime
        this._iterationCount += 1

        return void requestAnimationFrame(() =>
            next(fun.iterate(currentX, runningTime))
        )
    }

    private _render(
        ctx: CanvasRenderingContext2D,
        entries: IterableIterator<[number, Separation]>
    ): void {
        const arr = Array.from(entries).sort((a, b) => a[0] - b[0])
        for (const result of arr) {
            ctx.beginPath()
            result[1].fill.forEach(shape =>
                this._drawShape[shape.type](shape, ctx)
            )
            ctx.fill()

            ctx.beginPath()
            result[1].stroke.forEach(shape =>
                this._drawShape[shape.type](shape, ctx)
            )
            ctx.stroke()

            ctx.beginPath()
            result[1].fillAndStroke.forEach(shape =>
                this._drawShape[shape.type](shape, ctx)
            )
            ctx.fill()
            ctx.stroke()
        }
    }

    private _drawShape = {
        prevFill: "",
        prevStroke: "",
        prevLineWidth: 1 as Value,
        point: (shape: DecoratedShape, ctx: CanvasRenderingContext2D): void => {
            const point = shape as DecoratedPoint
            const transformed = this._virtualCanvas.transformPointToCanvas(
                point
            )
            const r = this._virtualCanvas.transformDimensionToCanvas(
                point.radius || 5
            ) // get radius from function

            if (this._drawShape.prevFill !== point.fill) {
                ctx.fillStyle = unwrapColor(point.fill || "")
                this._drawShape.prevFill = unwrapColor(point.fill || "")
            }
            if (this._drawShape.prevStroke !== point.stroke) {
                ctx.strokeStyle = unwrapColor(point.stroke || "")
                this._drawShape.prevStroke = unwrapColor(point.stroke || "")
            }
            if (this._drawShape.prevLineWidth !== point.lineWidth) {
                ctx.lineWidth = this._virtualCanvas.transformDimensionToCanvas(
                    point.lineWidth || 1
                )
                this._drawShape.prevLineWidth = point.lineWidth || 1
            }
            //ctx.lineWidth = point.lineWidth || 1;
            const x = unwrap(transformed.x)
            const y = unwrap(transformed.y)
            ctx.moveTo(x + r, y)
            ctx.ellipse(x, y, r, r, 0, 0, 2 * Math.PI)
        },
        line: (shape: DecoratedShape, ctx: CanvasRenderingContext2D): void => {
            const line = shape as DecoratedLine
            const range = getRange(line.range, line.points.length)

            if (this._drawShape.prevStroke !== line.stroke) {
                ctx.strokeStyle = unwrapColor(line.stroke || "")
                this._drawShape.prevStroke = unwrapColor(line.stroke || "")
            }
            if (this._drawShape.prevLineWidth !== line.lineWidth) {
                ctx.lineWidth = this._virtualCanvas.transformDimensionToCanvas(
                    line.lineWidth || 1
                )
                this._drawShape.prevLineWidth = line.lineWidth || 1
            }
            if (line.points.length === 0) return

            const firstTransformedPoint = this._virtualCanvas.transformPointToCanvas(
                line.points[range[0]]
            )
            ctx.moveTo(
                unwrap(firstTransformedPoint.x),
                unwrap(firstTransformedPoint.y)
            )
            for (let i = range[0]; i < range[1] + 1; ++i) {
                const transformed = this._virtualCanvas.transformPointToCanvas(
                    line.points[i]
                )
                ctx.lineTo(unwrap(transformed.x), unwrap(transformed.y))
            }
        },
        arc: (shape: DecoratedShape, ctx: CanvasRenderingContext2D): void => {
            const arc = shape as DecoratedArc
            const transformed = this._virtualCanvas.transformPointToCanvas(arc)
            const r = this._virtualCanvas.transformDimensionToCanvas(arc.radius) // get radius from function
            if (this._drawShape.prevFill !== arc.fill) {
                ctx.fillStyle = unwrapColor(arc.fill || "")
                this._drawShape.prevFill = unwrapColor(arc.fill || "")
            }
            if (this._drawShape.prevStroke !== arc.stroke) {
                ctx.strokeStyle = unwrapColor(arc.stroke || "")
                this._drawShape.prevStroke = unwrapColor(arc.stroke || "")
            }
            if (this._drawShape.prevLineWidth !== arc.lineWidth) {
                ctx.lineWidth = this._virtualCanvas.transformDimensionToCanvas(
                    arc.lineWidth || 1
                )
                this._drawShape.prevLineWidth = arc.lineWidth || 1
            }

            const x = unwrap(transformed.x)
            const y = unwrap(transformed.y)
            const arcStart = unwrap(arc.start)
            const arcEnd = unwrap(arc.end)
            ctx.moveTo(x + Math.cos(arcStart) * r, y + Math.sin(arcStart) * r)
            ctx.arc(
                x,
                y,
                r,
                arcStart,
                arcEnd,
                arc.direction === "counter-clockwise"
            )
        }
    }
    /**
     * Override to get real time fps and duration updates
     */
    // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
    public dataListener = (fps: number, runningTime: number): void => {}
}

export default DrawEngine
