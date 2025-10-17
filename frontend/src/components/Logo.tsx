// Octagonal gem logo component - exported for use in the application header
// Includes separate base and top layer exports for testing/development
// Features gem spectral lighting effect with rotation-based color interpolation

import { useState, useEffect, useRef } from 'react';

interface LogoProps {
    width?: number;
    height?: number;
    className?: string;
    topLayerOpacity?: number;
    duration?: number;           // Animation duration in ms (default: 400)
    easingIntensity?: number;    // Easing curve intensity (default: 3)
    onRotate?: (setTargetAngle: (targetOffset: number) => void) => void;
    constantRotation?: boolean;  // Enable continuous rotation (default: false)
    rotationSpeed?: number;      // Rotation speed in degrees per second (default: 6)
}

// Color interpolation utilities for gem spectral lighting effect
interface HSL {
    h: number;
    s: number;
    l: number;
}

// Easing function with configurable intensity
const easeInOut = (t: number, intensity: number): number => {
    // Clamp t between 0 and 1
    t = Math.max(0, Math.min(1, t));

    if (t < 0.5) {
        return Math.pow(2 * t, intensity) / 2;
    } else {
        return 1 - Math.pow(2 * (1 - t), intensity) / 2;
    }
};

const parseHSL = (hslString: string): HSL => {
    const match = hslString.match(/hsl\((\d+),\s*(\d+)%,\s*([\d.]+)%\)/);
    if (!match) throw new Error(`Invalid HSL string: ${hslString}`);
    return { h: Number(match[1]), s: Number(match[2]), l: Number(match[3]) };
};

const interpolateHSL = (color1: HSL, color2: HSL, t: number): string => {
    const h = color1.h + (color2.h - color1.h) * t;
    const s = color1.s + (color2.s - color1.s) * t;
    const l = color1.l + (color2.l - color1.l) * t;
    return `hsl(${h}, ${s}%, ${l}%)`;
};

const getInterpolatedColor = (colors: string[], angle: number, keyframeCount: number): string => {
    // Normalize angle to 0-360
    const normalizedAngle = ((angle % 360) + 360) % 360;

    // Calculate which keyframe segment we're in
    const degreesPerKeyframe = 360 / keyframeCount;
    const keyframeIndex = Math.floor(normalizedAngle / degreesPerKeyframe);
    const nextKeyframeIndex = (keyframeIndex + 1) % keyframeCount;

    // Calculate interpolation factor within this segment
    const segmentProgress = (normalizedAngle % degreesPerKeyframe) / degreesPerKeyframe;

    // Parse and interpolate colors
    const currentColor = parseHSL(colors[keyframeIndex]);
    const nextColor = parseHSL(colors[nextKeyframeIndex]);

    return interpolateHSL(currentColor, nextColor, segmentProgress);
};

// Shared calculation functions
const getOctagonPoints = (cx: number, cy: number, radius: number) => {
    const points: number[][] = [];
    for (let i = 0; i < 8; i++) {
        const angle = (Math.PI / 4) * i; // 45 degrees per vertex
        const x = cx + radius * Math.cos(angle - Math.PI / 2); // Start from top
        const y = cy + radius * Math.sin(angle - Math.PI / 2);
        points.push([x, y]);
    }
    return points;
};

// Render base layer content - simple pinwheel with radial segments + 45-degree rotated square
const renderBaseLayer = (centerX: number, centerY: number, outerRadius: number, rotationAngle: number = 0) => {
    const octagonPoints = getOctagonPoints(centerX, centerY, outerRadius);
    const innerSquareRadius = 35; // Distance from center to corner of rotated square

    // Calculate 45-degree rotated square vertices
    const innerSquare = [
        [centerX, centerY - innerSquareRadius],           // Top
        [centerX + innerSquareRadius, centerY],           // Right
        [centerX, centerY + innerSquareRadius],           // Bottom
        [centerX - innerSquareRadius, centerY]            // Left
    ];

    // Color keyframes for pinwheel triangles (8 keyframes at 0°, 45°, 90°, etc.)
    // Creates a single bright spectral highlight that rotates around the pinwheel
    const pinwheelColorKeyframes = [
        "hsl(38, 75%, 45%)",  // 0° - medium (rotated from 90°)
        "hsl(38, 70%, 30%)",  // 45° - dark (rotated from 135°)
        "hsl(38, 68%, 10%)",  // 90° - darkest (rotated from 180°)
        "hsl(38, 70%, 20%)",  // 135° - dark (rotated from 225°)
        "hsl(38, 75%, 30%)",  // 180° - medium (rotated from 270°)
        "hsl(38, 80%, 70%)",  // 225° - bright falloff (rotated from 315°)
        "hsl(38, 90%, 100%)",  // 270° - BRIGHT spectral highlight (rotated from 0°)
        "hsl(38, 80%, 70%)"   // 315° - bright falloff (rotated from 45°)
    ];

    // Calculate interpolated colors for each pinwheel triangle based on rotation
    const pinwheelColors = octagonPoints.map((_, i) => {
        // Each triangle's base angle is i * 45 degrees
        const triangleBaseAngle = i * 45;
        return getInterpolatedColor(pinwheelColorKeyframes, rotationAngle + triangleBaseAngle, 8);
    });

    return (
        <g transform={`rotate(${rotationAngle} ${centerX} ${centerY})`}>
            <rect width="200" height="200" fill="hsl(38, 75%, 30%)" />
            {/* Pinwheel radial segments with interpolated colors */}
            {octagonPoints.map((_, i) => {
                const nextI = (i + 1) % 8;
                return (
                    <polygon
                        key={i}
                        points={`${centerX},${centerY} ${octagonPoints[i].join(',')} ${octagonPoints[nextI].join(',')}`}
                        fill={pinwheelColors[i]}
                    />
                );
            })}
            {/* 45-degree rotated central square on top */}
            {/* <polygon
                points={innerSquare.map(p => p.join(',')).join(' ')}
                fill="hsl(38, 92%, 36%)"
            /> */}
        </g>
    );
};

// Render top layer content - square with corner triangles and spectral lighting
const renderTopLayer = (centerX: number, centerY: number, outerRadius: number, centerSquareSize: number, rotationAngle: number = 0) => {
    const octagonPoints = getOctagonPoints(centerX, centerY, outerRadius);
    centerSquareSize = 80; // Override for combined logo to be slightly larger

    const square = {
        x: centerX - centerSquareSize / 2,
        y: centerY - centerSquareSize / 2,
        size: centerSquareSize
    };

    const squareCorners = {
        topLeft: [square.x, square.y],
        topRight: [square.x + square.size, square.y],
        bottomRight: [square.x + square.size, square.y + square.size],
        bottomLeft: [square.x, square.y + square.size]
    };

    // Color keyframes for side triangles (4 keyframes at 0°, 90°, 180°, 270°)
    const sideTriangleColors = [
        "hsl(38, 80%, 65.5%)",  // Top - 0°
        "hsl(38, 90%, 60%)",    // Right - 90°
        "hsl(38, 75%, 40.25%)", // Bottom - 180°
        "hsl(38, 100%, 85.5%)"   // Left - 270°
    ];

    // Color keyframes for corner triangles (8 keyframes at 0°, 45°, 90°, etc.)
    const cornerTriangleColors = [
        "hsl(38, 100%, 100%)",  // 0°
        "hsl(38, 70%, 70%)",    // 45°
        "hsl(38, 92%, 40%)",    // 90°
        "hsl(38, 60%, 30.5%)",  // 135°
        "hsl(38, 65%, 20.5%)",  // 180°
        "hsl(38, 40%, 35%)",     // 225°
        "hsl(38, 50%, 50.5%)",  // 270°
        "hsl(38, 70%, 80%)"     // 315°
    ];

    // Calculate colors based on rotation angle
    // Each triangle's color is offset by its static position, so as the layer rotates,
    // each triangle cycles through the color keyframes as if lit by a fixed light source
    const sideColors = [
        getInterpolatedColor(sideTriangleColors, rotationAngle + 0, 4),   // Top triangle
        getInterpolatedColor(sideTriangleColors, rotationAngle + 90, 4),  // Right triangle
        getInterpolatedColor(sideTriangleColors, rotationAngle + 180, 4), // Bottom triangle
        getInterpolatedColor(sideTriangleColors, rotationAngle + 270, 4)  // Left triangle
    ];

    const cornerColors = [
        getInterpolatedColor(cornerTriangleColors, rotationAngle + 0, 8),    // Top-left corner (octagon point 7-0)
        getInterpolatedColor(cornerTriangleColors, rotationAngle + 315, 8),  // Top-left corner (octagon point 6-7)
        getInterpolatedColor(cornerTriangleColors, rotationAngle + 45, 8),   // Top-right corner (octagon point 0-1)
        getInterpolatedColor(cornerTriangleColors, rotationAngle + 90, 8),   // Top-right corner (octagon point 1-2)
        getInterpolatedColor(cornerTriangleColors, rotationAngle + 135, 8),  // Bottom-right corner (octagon point 2-3)
        getInterpolatedColor(cornerTriangleColors, rotationAngle + 180, 8),  // Bottom-right corner (octagon point 3-4)
        getInterpolatedColor(cornerTriangleColors, rotationAngle + 225, 8),  // Bottom-left corner (octagon point 4-5)
        getInterpolatedColor(cornerTriangleColors, rotationAngle + 270, 8)   // Bottom-left corner (octagon point 5-6)
    ];

    return (
        <g transform={`rotate(${rotationAngle} ${centerX} ${centerY})`}>
            {/* Central square - static color */}
            <rect x={square.x} y={square.y} width={square.size} height={square.size} fill="hsl(38, 100%, 75.5%)" />

            {/* Side triangles - interpolated colors */}
            <polygon points={`${squareCorners.topLeft.join(',')} ${squareCorners.topRight.join(',')} ${octagonPoints[0].join(',')}`} fill={sideColors[0]} />
            <polygon points={`${squareCorners.topRight.join(',')} ${squareCorners.bottomRight.join(',')} ${octagonPoints[2].join(',')}`} fill={sideColors[1]} />
            <polygon points={`${squareCorners.bottomRight.join(',')} ${squareCorners.bottomLeft.join(',')} ${octagonPoints[4].join(',')}`} fill={sideColors[2]} />
            <polygon points={`${squareCorners.bottomLeft.join(',')} ${squareCorners.topLeft.join(',')} ${octagonPoints[6].join(',')}`} fill={sideColors[3]} />

            {/* Corner triangles - interpolated colors */}
            <polygon points={`${octagonPoints[7].join(',')} ${octagonPoints[0].join(',')} ${squareCorners.topLeft.join(',')}`} fill={cornerColors[0]} />
            <polygon points={`${octagonPoints[6].join(',')} ${octagonPoints[7].join(',')} ${squareCorners.topLeft.join(',')}`} fill={cornerColors[1]} />
            <polygon points={`${octagonPoints[0].join(',')} ${octagonPoints[1].join(',')} ${squareCorners.topRight.join(',')}`} fill={cornerColors[2]} />
            <polygon points={`${octagonPoints[1].join(',')} ${octagonPoints[2].join(',')} ${squareCorners.topRight.join(',')}`} fill={cornerColors[3]} />
            <polygon points={`${octagonPoints[2].join(',')} ${octagonPoints[3].join(',')} ${squareCorners.bottomRight.join(',')}`} fill={cornerColors[4]} />
            <polygon points={`${octagonPoints[3].join(',')} ${octagonPoints[4].join(',')} ${squareCorners.bottomRight.join(',')}`} fill={cornerColors[5]} />
            <polygon points={`${octagonPoints[4].join(',')} ${octagonPoints[5].join(',')} ${squareCorners.bottomLeft.join(',')}`} fill={cornerColors[6]} />
            <polygon points={`${octagonPoints[5].join(',')} ${octagonPoints[6].join(',')} ${squareCorners.bottomLeft.join(',')}`} fill={cornerColors[7]} />
        </g>
    );
};

// Base layer only - octagonal gem with 45-degree rotated central square
export const LogoBase = ({ width = 150, height = 150, className = "", duration = 400, easingIntensity = 3, onRotate }: LogoProps) => {
    const [rotationAngle, setRotationAngle] = useState(0);
    const [targetAngleOffset, setTargetAngleOffset] = useState(0);
    const animationFrameRef = useRef<number | null>(null);
    const centerX = 100;
    const centerY = 100;
    const outerRadius = 90;

    // Expose setTargetAngleOffset via onRotate callback
    useEffect(() => {
        if (onRotate) {
            onRotate(setTargetAngleOffset);
        }
    }, [onRotate]);

    // Animate to target angle when it changes
    useEffect(() => {
        // Cancel any ongoing animation
        if (animationFrameRef.current !== null) {
            cancelAnimationFrame(animationFrameRef.current);
        }

        const startAngle = rotationAngle;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeInOut(progress, easingIntensity);

            // Interpolate from current angle to target offset
            const currentAngle = startAngle + (targetAngleOffset - startAngle) * easedProgress;
            setRotationAngle(currentAngle);

            if (progress < 1) {
                animationFrameRef.current = requestAnimationFrame(animate);
            } else {
                animationFrameRef.current = null;
            }
        };

        // Only animate if target is different from current
        if (Math.abs(targetAngleOffset - rotationAngle) > 0.1) {
            animationFrameRef.current = requestAnimationFrame(animate);
        }

        return () => {
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [targetAngleOffset, duration, easingIntensity]);

    const octagonPoints = getOctagonPoints(centerX, centerY, outerRadius);
    const octagonString = octagonPoints.map(p => `${p[0]},${p[1]}`).join(' ');

    return (
        <svg width={width} height={height} viewBox="0 0 200 200" className={className}>
            <defs>
                <clipPath id="octagon-logo-base">
                    <polygon points={octagonString} transform={`rotate(${rotationAngle} ${centerX} ${centerY})`} />
                </clipPath>
            </defs>

            <g clipPath="url(#octagon-logo-base)">
                {renderBaseLayer(centerX, centerY, outerRadius, rotationAngle)}
            </g>
        </svg>
    );
};

// Top layer only - square with corner triangles
export const LogoTop = ({ width = 150, height = 150, className = "", topLayerOpacity = 0.6, duration = 400, easingIntensity = 3, onRotate }: LogoProps) => {
    const [rotationAngle, setRotationAngle] = useState(0);
    const [targetAngleOffset, setTargetAngleOffset] = useState(0);
    const animationFrameRef = useRef<number | null>(null);
    const centerX = 100;
    const centerY = 100;
    const outerRadius = 90;
    const centerSquareSize = 70;

    // Expose setTargetAngleOffset via onRotate callback
    useEffect(() => {
        if (onRotate) {
            onRotate(setTargetAngleOffset);
        }
    }, [onRotate]);

    // Animate to target angle when it changes
    useEffect(() => {
        // Cancel any ongoing animation
        if (animationFrameRef.current !== null) {
            cancelAnimationFrame(animationFrameRef.current);
        }

        const startAngle = rotationAngle;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeInOut(progress, easingIntensity);

            // Interpolate from current angle to target offset
            const currentAngle = startAngle + (targetAngleOffset - startAngle) * easedProgress;
            setRotationAngle(currentAngle);

            if (progress < 1) {
                animationFrameRef.current = requestAnimationFrame(animate);
            } else {
                animationFrameRef.current = null;
            }
        };

        // Only animate if target is different from current
        if (Math.abs(targetAngleOffset - rotationAngle) > 0.1) {
            animationFrameRef.current = requestAnimationFrame(animate);
        }

        return () => {
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [targetAngleOffset, duration, easingIntensity]);

    const octagonPoints = getOctagonPoints(centerX, centerY, outerRadius);
    const octagonString = octagonPoints.map(p => `${p[0]},${p[1]}`).join(' ');

    return (
        <svg width={width} height={height} viewBox="0 0 200 200" className={className}>
            <defs>
                <clipPath id="octagon-logo-top">
                    <polygon points={octagonString} transform={`rotate(${rotationAngle} ${centerX} ${centerY})`} />
                </clipPath>
            </defs>

            <g clipPath="url(#octagon-logo-top)" opacity={topLayerOpacity}>
                {renderTopLayer(centerX, centerY, outerRadius, centerSquareSize, rotationAngle)}
            </g>
        </svg>
    );
};

// Combined logo (base + top layers)
export const Logo = ({ width = 150, height = 150, className = "", topLayerOpacity = 0.9, duration = 400, easingIntensity = 3, onRotate, constantRotation = false, rotationSpeed = 6 }: LogoProps) => {
    const [rotationAngle, setRotationAngle] = useState(0);
    const [targetAngleOffset, setTargetAngleOffset] = useState(0);
    const animationFrameRef = useRef<number | null>(null);
    const lastFrameTimeRef = useRef<number | null>(null);
    const centerX = 100;
    const centerY = 100;
    const outerRadius = 90;
    const centerSquareSize = 80;

    // Expose setTargetAngleOffset via onRotate callback
    useEffect(() => {
        if (onRotate) {
            onRotate(setTargetAngleOffset);
        }
    }, [onRotate]);

    // Constant rotation mode - continuous RAF loop
    useEffect(() => {
        if (!constantRotation) return;

        let currentRotation = 0;
        lastFrameTimeRef.current = Date.now();

        const animate = () => {
            const now = Date.now();
            const deltaTime = (now - (lastFrameTimeRef.current || now)) / 1000; // Convert to seconds
            lastFrameTimeRef.current = now;

            currentRotation = (currentRotation + rotationSpeed * deltaTime) % 360;
            setRotationAngle(currentRotation);

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };
    }, [constantRotation, rotationSpeed]);

    // Animate to target angle when it changes (only when not in constant rotation mode)
    useEffect(() => {
        if (constantRotation) return; // Skip if in constant rotation mode

        // Cancel any ongoing animation
        if (animationFrameRef.current !== null) {
            cancelAnimationFrame(animationFrameRef.current);
        }

        const startAngle = rotationAngle;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeInOut(progress, easingIntensity);

            // Interpolate from current angle to target offset
            const currentAngle = startAngle + (targetAngleOffset - startAngle) * easedProgress;
            setRotationAngle(currentAngle);

            if (progress < 1) {
                animationFrameRef.current = requestAnimationFrame(animate);
            } else {
                animationFrameRef.current = null;
            }
        };

        // Only animate if target is different from current
        if (Math.abs(targetAngleOffset - rotationAngle) > 0.1) {
            animationFrameRef.current = requestAnimationFrame(animate);
        }

        return () => {
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [targetAngleOffset, duration, easingIntensity, constantRotation]);

    const octagonPoints = getOctagonPoints(centerX, centerY, outerRadius);
    const octagonString = octagonPoints.map(p => `${p[0]},${p[1]}`).join(' ');

    return (
        <svg width={width} height={height} viewBox="0 0 200 200" className={className}>
            <defs>
                <clipPath id="octagon-logo">
                    <polygon points={octagonString} transform={`rotate(${rotationAngle} ${centerX} ${centerY})`} />
                </clipPath>
            </defs>

            <g clipPath="url(#octagon-logo)">
                {/* Base layer with rotation */}
                {renderBaseLayer(centerX, centerY, outerRadius, rotationAngle)}

                {/* Top layer with uniform opacity and spectral lighting */}
                <g opacity={topLayerOpacity}>
                    {renderTopLayer(centerX, centerY, outerRadius, centerSquareSize, rotationAngle)}
                </g>
            </g>
        </svg>
    );
};
