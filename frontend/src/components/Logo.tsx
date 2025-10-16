// Octagonal gem logo component - exported for use in the application header
// Includes separate base and top layer exports for testing/development

interface LogoProps {
    width?: number;
    height?: number;
    className?: string;
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

// Render base layer content - simple pinwheel with radial segments
const renderBaseLayer = (centerX: number, centerY: number, outerRadius: number) => {
    const octagonPoints = getOctagonPoints(centerX, centerY, outerRadius);

    return (
        <>
            <rect width="200" height="200" fill="hsl(38, 70%, 35%)" />
            {octagonPoints.map((_, i) => {
                const nextI = (i + 1) % 8;
                const brightness = 35 + (i * 5);
                return (
                    <polygon
                        key={i}
                        points={`${centerX},${centerY} ${octagonPoints[i].join(',')} ${octagonPoints[nextI].join(',')}`}
                        fill={`hsl(38, ${70 + (i % 3) * 5}%, ${brightness}%)`}
                    />
                );
            })}
        </>
    );
};

// Render top layer content - square with corner triangles
const renderTopLayer = (centerX: number, centerY: number, outerRadius: number, centerSquareSize: number) => {
    const octagonPoints = getOctagonPoints(centerX, centerY, outerRadius);

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
            <rect x={square.x} y={square.y} width={square.size} height={square.size} fill="hsl(38, 92%, 76%)" opacity="0.6" />

            <polygon points={`${squareCorners.topLeft.join(',')} ${squareCorners.topRight.join(',')} ${octagonPoints[0].join(',')}`} fill="hsl(38, 95%, 88%)" opacity="0.7" />
            <polygon points={`${squareCorners.topRight.join(',')} ${squareCorners.bottomRight.join(',')} ${octagonPoints[2].join(',')}`} fill="hsl(38, 75%, 58%)" opacity="0.45" />
            <polygon points={`${squareCorners.bottomRight.join(',')} ${squareCorners.bottomLeft.join(',')} ${octagonPoints[4].join(',')}`} fill="hsl(38, 55%, 35%)" opacity="0.38" />
            <polygon points={`${squareCorners.bottomLeft.join(',')} ${squareCorners.topLeft.join(',')} ${octagonPoints[6].join(',')}`} fill="hsl(38, 90%, 80%)" opacity="0.65" />

            <polygon points={`${octagonPoints[7].join(',')} ${octagonPoints[0].join(',')} ${squareCorners.topLeft.join(',')}`} fill="hsl(38, 100%, 98%)" opacity="0.9" />
            <polygon points={`${octagonPoints[6].join(',')} ${octagonPoints[7].join(',')} ${squareCorners.topLeft.join(',')}`} fill="hsl(38, 98%, 90%)" opacity="0.75" />
            <polygon points={`${octagonPoints[0].join(',')} ${octagonPoints[1].join(',')} ${squareCorners.topRight.join(',')}`} fill="hsl(38, 92%, 82%)" opacity="0.65" />
            <polygon points={`${octagonPoints[1].join(',')} ${octagonPoints[2].join(',')} ${squareCorners.topRight.join(',')}`} fill="hsl(38, 80%, 68%)" opacity="0.5" />
            <polygon points={`${octagonPoints[2].join(',')} ${octagonPoints[3].join(',')} ${squareCorners.bottomRight.join(',')}`} fill="hsl(38, 65%, 48%)" opacity="0.42" />
            <polygon points={`${octagonPoints[3].join(',')} ${octagonPoints[4].join(',')} ${squareCorners.bottomRight.join(',')}`} fill="hsl(38, 40%, 18%)" opacity="0.28" />
            <polygon points={`${octagonPoints[4].join(',')} ${octagonPoints[5].join(',')} ${squareCorners.bottomLeft.join(',')}`} fill="hsl(38, 50%, 32%)" opacity="0.35" />
            <polygon points={`${octagonPoints[5].join(',')} ${octagonPoints[6].join(',')} ${squareCorners.bottomLeft.join(',')}`} fill="hsl(38, 70%, 62%)" opacity="0.5" />
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
export const LogoTop = ({ width = 150, height = 150, className = "" }: LogoProps) => {
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

            <g clipPath="url(#octagon-logo-top)">
                {renderTopLayer(centerX, centerY, outerRadius, centerSquareSize)}
            </g>
        </svg>
    );
};

// Combined logo (base + top layers)
export const Logo = ({ width = 150, height = 150, className = "" }: LogoProps) => {
    const centerX = 100;
    const centerY = 100;
    const outerRadius = 90;
    const centerSquareSize = 70;

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

                {/* Top layer */}
                {renderTopLayer(centerX, centerY, outerRadius, centerSquareSize)}
            </g>
        </svg>
    );
};
