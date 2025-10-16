// Octagonal gem logo component - exported for use in the application header
// Includes separate base and top layer exports for testing/development

interface LogoProps {
    width?: number;
    height?: number;
    className?: string;
    topLayerOpacity?: number;
}

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
const renderBaseLayer = (centerX: number, centerY: number, outerRadius: number) => {
    const octagonPoints = getOctagonPoints(centerX, centerY, outerRadius);
    const innerSquareRadius = 35; // Distance from center to corner of rotated square

    // Calculate 45-degree rotated square vertices
    const innerSquare = [
        [centerX, centerY - innerSquareRadius],           // Top
        [centerX + innerSquareRadius, centerY],           // Right
        [centerX, centerY + innerSquareRadius],           // Bottom
        [centerX - innerSquareRadius, centerY]            // Left
    ];

    return (
        <>
            <rect width="200" height="200" fill="hsl(38, 75%, 30%)" />
            {/* Pinwheel radial segments */}
            {octagonPoints.map((_, i) => {
                const nextI = (i + 1) % 8;
                // Create more dramatic contrast - alternating light/dark like pen strokes
                const brightnessValues = [25, 55, 30, 60, 28, 58, 32, 62];
                const saturationValues = [80, 70, 78, 68, 82, 65, 75, 72];
                return (
                    <polygon
                        key={i}
                        points={`${centerX},${centerY} ${octagonPoints[i].join(',')} ${octagonPoints[nextI].join(',')}`}
                        fill={`hsl(38, ${saturationValues[i]}%, ${brightnessValues[i]}%)`}
                    />
                );
            })}
            {/* 45-degree rotated central square on top */}
            {/* <polygon
                points={innerSquare.map(p => p.join(',')).join(' ')}
                fill="hsl(38, 92%, 36%)"
            /> */}
        </>
    );
};

// Render top layer content - square with corner triangles
const renderTopLayer = (centerX: number, centerY: number, outerRadius: number, centerSquareSize: number) => {
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

    return (
        <>
            <rect x={square.x} y={square.y} width={square.size} height={square.size} fill="hsl(38, 92%, 90.5%)" />

            <polygon points={`${squareCorners.topLeft.join(',')} ${squareCorners.topRight.join(',')} ${octagonPoints[0].join(',')}`} fill="hsl(38, 90%, 80.5%)" />
            <polygon points={`${squareCorners.topRight.join(',')} ${squareCorners.bottomRight.join(',')} ${octagonPoints[2].join(',')}`} fill="hsl(38, 50%, 50%)" />
            <polygon points={`${squareCorners.bottomRight.join(',')} ${squareCorners.bottomLeft.join(',')} ${octagonPoints[4].join(',')}`} fill="hsl(38, 55%, 40.25%)" />
            <polygon points={`${squareCorners.bottomLeft.join(',')} ${squareCorners.topLeft.join(',')} ${octagonPoints[6].join(',')}`} fill="hsl(38, 90%, 85.5%)" />

            <polygon points={`${octagonPoints[7].join(',')} ${octagonPoints[0].join(',')} ${squareCorners.topLeft.join(',')}`} fill="hsl(38, 100%, 100%)" />
            <polygon points={`${octagonPoints[6].join(',')} ${octagonPoints[7].join(',')} ${squareCorners.topLeft.join(',')}`} fill="hsl(38, 98%, 70%)" />
            <polygon points={`${octagonPoints[0].join(',')} ${octagonPoints[1].join(',')} ${squareCorners.topRight.join(',')}`} fill="hsl(38, 92%, 70%)" />
            <polygon points={`${octagonPoints[1].join(',')} ${octagonPoints[2].join(',')} ${squareCorners.topRight.join(',')}`} fill="hsl(38, 60%, 25.5%)" />
            <polygon points={`${octagonPoints[2].join(',')} ${octagonPoints[3].join(',')} ${squareCorners.bottomRight.join(',')}`} fill="hsl(38, 65%, 20.5%)" />
            <polygon points={`${octagonPoints[3].join(',')} ${octagonPoints[4].join(',')} ${squareCorners.bottomRight.join(',')}`} fill="hsl(38, 40%, 0%)" />
            <polygon points={`${octagonPoints[4].join(',')} ${octagonPoints[5].join(',')} ${squareCorners.bottomLeft.join(',')}`} fill="hsl(38, 50%, 17.5%)" />
            <polygon points={`${octagonPoints[5].join(',')} ${octagonPoints[6].join(',')} ${squareCorners.bottomLeft.join(',')}`} fill="hsl(38, 70%, 65%)" />
        </>
    );
};

// Base layer only - octagonal gem with 45-degree rotated central square
export const LogoBase = ({ width = 150, height = 150, className = "" }: LogoProps) => {
    const centerX = 100;
    const centerY = 100;
    const outerRadius = 90;

    const octagonPoints = getOctagonPoints(centerX, centerY, outerRadius);
    const octagonString = octagonPoints.map(p => `${p[0]},${p[1]}`).join(' ');

    return (
        <svg width={width} height={height} viewBox="0 0 200 200" className={className}>
            <defs>
                <clipPath id="octagon-logo-base">
                    <polygon points={octagonString} />
                </clipPath>
            </defs>

            <g clipPath="url(#octagon-logo-base)">
                {renderBaseLayer(centerX, centerY, outerRadius)}
            </g>
        </svg>
    );
};

// Top layer only - square with corner triangles
export const LogoTop = ({ width = 150, height = 150, className = "", topLayerOpacity = 0.6 }: LogoProps) => {
    const centerX = 100;
    const centerY = 100;
    const outerRadius = 90;
    const centerSquareSize = 70;

    const octagonPoints = getOctagonPoints(centerX, centerY, outerRadius);
    const octagonString = octagonPoints.map(p => `${p[0]},${p[1]}`).join(' ');

    return (
        <svg width={width} height={height} viewBox="0 0 200 200" className={className}>
            <defs>
                <clipPath id="octagon-logo-top">
                    <polygon points={octagonString} />
                </clipPath>
            </defs>

            <g clipPath="url(#octagon-logo-top)" opacity={topLayerOpacity}>
                {renderTopLayer(centerX, centerY, outerRadius, centerSquareSize)}
            </g>
        </svg>
    );
};

// Combined logo (base + top layers)
export const Logo = ({ width = 150, height = 150, className = "", topLayerOpacity = 0.9 }: LogoProps) => {
    const centerX = 100;
    const centerY = 100;
    const outerRadius = 90;
    const centerSquareSize = 80;

    const octagonPoints = getOctagonPoints(centerX, centerY, outerRadius);
    const octagonString = octagonPoints.map(p => `${p[0]},${p[1]}`).join(' ');

    return (
        <svg width={width} height={height} viewBox="0 0 200 200" className={className}>
            <defs>
                <clipPath id="octagon-logo">
                    <polygon points={octagonString} />
                </clipPath>
            </defs>

            <g clipPath="url(#octagon-logo)">
                {/* Base layer */}
                {renderBaseLayer(centerX, centerY, outerRadius)}

                {/* Top layer with uniform opacity */}
                <g opacity={topLayerOpacity}>
                    {renderTopLayer(centerX, centerY, outerRadius, centerSquareSize)}
                </g>
            </g>
        </svg>
    );
};
