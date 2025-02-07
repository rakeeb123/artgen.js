const artgen = document.getElementById("artgen")
const drawEngine = new window.ArtGen.DrawEngine(test, artgen)

let lastN = []

drawEngine.dataListener = (fps, duration) => {
    const div = document.getElementById("fps-indicator")

    if (div) {
        const fpsLabel = document.getElementById("fps-label")
        const durationLabel = document.getElementById("duration-label")
        lastN.push(fps)
        if (lastN.length > 50) lastN = lastN.slice(1)
        if (fpsLabel)
            fpsLabel.innerHTML =
                fps.toFixed(2) +
                "fps, avg: " +
                (
                    lastN.reduce((acc, num) => acc + num, 0) / lastN.length
                ).toFixed(0) +
                "fps"
        if (durationLabel) durationLabel.innerHTML = duration.toFixed(0) + "ms"
    }
}

// Button
const button = document.getElementById("start-button")
button.onclick = () => start()

button.className = "hidden"
setTimeout(() => start(), 1000)

function start() {
    drawEngine.start()
    button.className = button.className + " hidden"
}
