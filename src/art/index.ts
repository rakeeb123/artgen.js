import circleArtGenerator from "../functions/circles";
import circlesGen2 from "../functions/circles2";
import linesGen from "../functions/lines";
import linesGen2 from "../functions/lines2";
import circlesGen3 from "../functions/circles3";
import particlesGen from "../functions/particles";
import particlesGen2 from "../functions/particles2";
import particlesGen3 from "../functions/particles3";
import circlesGen4 from "../functions/circles4";
import circlesGen5 from "../functions/circles5";

export const circles = circleArtGenerator({
    colorRange: {
        r: [[0, 100], [200, 255]],
        g: [100,255],
        b: [[0,0], [100, 150]],
        a: [0.5,0.8]
    },
    radius: [[2,5], [2,5], [3,7], [8,20]]
});

export const circles2 = circlesGen2();

export const lines = linesGen();

export const lines2 = linesGen2();

export const circles3 = circlesGen3();

export const particles = particlesGen();

export const particles2 = particlesGen2();

export const particles3 = particlesGen3();

export const circles4 = circlesGen4();

export const circles5 = circlesGen5();