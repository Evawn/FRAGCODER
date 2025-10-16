import React from 'react';

const OctagonalGemLogo = () => {
    // Configuration parameters
    const centerX = 100;
    const centerY = 100;
    const outerRadius = 90;
    const centerSquareSize = 70;

    // Calculate regular octagon vertices
    const getOctagonPoints = (cx, cy, radius) => {
        const points = [];
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI / 4) * i; // 45 degrees per vertex
            const x = cx + radius * Math.cos(angle - Math.PI / 2); // Start from top
            const y = cy + radius * Math.sin(angle - Math.PI / 2);
            points.push([x, y]);
        }
        return points;
    };

    // Get octagon vertices
    const octagonPoints = getOctagonPoints(centerX, centerY, outerRadius);
    const octagonString = octagonPoints.map(p => `${p[0]},${p[1]}`).join(' ');

    // Center square for top layer
    const square = {
        x: centerX - centerSquareSize / 2,
        y: centerY - centerSquareSize / 2,
        size: centerSquareSize
    };

    // Top layer square corners
    const squareCorners = {
        topLeft: [square.x, square.y],
        topRight: [square.x + square.size, square.y],
        bottomRight: [square.x + square.size, square.y + square.size],
        bottomLeft: [square.x, square.y + square.size]
    };

    // Base layer - pinwheel-radial design
    const BaseLayer = () => (
        <svg width= "150" height = "150" viewBox = "0 0 200 200" className = "drop-shadow-lg" >
            <defs>
            <clipPath id="octagon-base" >
                <polygon points={ octagonString } />
                    </clipPath>
                    </defs>

                    < g clipPath = "url(#octagon-base)" >
                        <rect width="200" height = "200" fill = "hsl(38, 70%, 35%)" />

                            {/* 8 triangular facets radiating from center */ }
    {
        octagonPoints.map((point, i) => {
            const nextI = (i + 1) % 8;
            // Create gradient from darkest (0) to brightest (4) and back to dark (7)
            // This puts darkest at top, brightest at bottom
            const brightness = i <= 4 ? 30 + (i * 12) : 30 + ((8 - i) * 12);
            const saturation = 80 + (i % 2) * 5;
            return (
                <polygon 
              key= { i }
            points = {`${centerX},${centerY} ${octagonPoints[i].join(',')} ${octagonPoints[nextI].join(',')}`
        }
              fill = {`hsl(38, ${saturation}%, ${brightness}%)`}
            />
          );
        })}
</g>
    </svg>
  );

// Top layer - translucent overlay with highlights
const TopLayer = () => (
    <svg width= "150" height = "150" viewBox = "0 0 200 200" className = "drop-shadow-lg" >
        <defs>
        <clipPath id="octagon-top" >
            <polygon points={ octagonString } />
                </clipPath>
                </defs>

                < g clipPath = "url(#octagon-top)" >
                    <rect width="200" height = "200" fill = "transparent" />

                        {/* Center square */ }
                        < rect
x = { square.x }
y = { square.y }
width = { square.size }
height = { square.size }
fill = "hsl(38, 92%, 76%)"
opacity = "0.6"
    />

    {/* Triangles from square edges to outer points */ }
    < polygon
points = {`${squareCorners.topLeft.join(',')} ${squareCorners.topRight.join(',')} ${octagonPoints[0].join(',')}`}
fill = "hsl(38, 95%, 88%)"
opacity = "0.7"
    />
    <polygon 
          points={ `${squareCorners.topRight.join(',')} ${squareCorners.bottomRight.join(',')} ${octagonPoints[2].join(',')}` }
fill = "hsl(38, 75%, 58%)"
opacity = "0.45"
    />
    <polygon 
          points={ `${squareCorners.bottomRight.join(',')} ${squareCorners.bottomLeft.join(',')} ${octagonPoints[4].join(',')}` }
fill = "hsl(38, 55%, 35%)"
opacity = "0.38"
    />
    <polygon 
          points={ `${squareCorners.bottomLeft.join(',')} ${squareCorners.topLeft.join(',')} ${octagonPoints[6].join(',')}` }
fill = "hsl(38, 90%, 80%)"
opacity = "0.65"
    />

    {/* Triangles from outer edges to square corners */ }
    < polygon
points = {`${octagonPoints[7].join(',')} ${octagonPoints[0].join(',')} ${squareCorners.topLeft.join(',')}`}
fill = "hsl(38, 100%, 98%)"
opacity = "0.9"
    />
    <polygon 
          points={ `${octagonPoints[6].join(',')} ${octagonPoints[7].join(',')} ${squareCorners.topLeft.join(',')}` }
fill = "hsl(38, 98%, 90%)"
opacity = "0.75"
    />
    <polygon 
          points={ `${octagonPoints[0].join(',')} ${octagonPoints[1].join(',')} ${squareCorners.topRight.join(',')}` }
fill = "hsl(38, 92%, 82%)"
opacity = "0.65"
    />
    <polygon 
          points={ `${octagonPoints[1].join(',')} ${octagonPoints[2].join(',')} ${squareCorners.topRight.join(',')}` }
fill = "hsl(38, 80%, 68%)"
opacity = "0.5"
    />
    <polygon 
          points={ `${octagonPoints[2].join(',')} ${octagonPoints[3].join(',')} ${squareCorners.bottomRight.join(',')}` }
fill = "hsl(38, 65%, 48%)"
opacity = "0.42"
    />
    <polygon 
          points={ `${octagonPoints[3].join(',')} ${octagonPoints[4].join(',')} ${squareCorners.bottomRight.join(',')}` }
fill = "hsl(38, 40%, 18%)"
opacity = "0.28"
    />
    <polygon 
          points={ `${octagonPoints[4].join(',')} ${octagonPoints[5].join(',')} ${squareCorners.bottomLeft.join(',')}` }
fill = "hsl(38, 50%, 32%)"
opacity = "0.35"
    />
    <polygon 
          points={ `${octagonPoints[5].join(',')} ${octagonPoints[6].join(',')} ${squareCorners.bottomLeft.join(',')}` }
fill = "hsl(38, 70%, 62%)"
opacity = "0.5"
    />
    </g>
    </svg>
  );

// Combined layers
const CombinedLogo = () => (
    <svg width= "150" height = "150" viewBox = "0 0 200 200" className = "drop-shadow-lg" >
        <defs>
        <clipPath id="octagon-combined" >
            <polygon points={ octagonString } />
                </clipPath>
                </defs>

{/* Base layer */ }
<g clipPath="url(#octagon-combined)" >
    <rect width="200" height = "200" fill = "hsl(38, 70%, 35%)" />
        {
            octagonPoints.map((point, i) => {
                const nextI = (i + 1) % 8;
                const brightness = 35 + (i * 5);
                return (
                    <polygon 
              key= { i }
                points = {`${centerX},${centerY} ${octagonPoints[i].join(',')} ${octagonPoints[nextI].join(',')}`
            }
              fill = {`hsl(38, ${70 + (i % 3) * 5}%, ${brightness}%)`}
        />
          );
        })}
</g>

{/* Top layer */ }
<g clipPath="url(#octagon-combined)" >
    <rect 
          x={ square.x }
y = { square.y }
width = { square.size }
height = { square.size }
fill = "hsl(38, 92%, 76%)"
opacity = "0.6"
    />

    <polygon 
          points={ `${squareCorners.topLeft.join(',')} ${squareCorners.topRight.join(',')} ${octagonPoints[0].join(',')}` }
fill = "hsl(38, 95%, 88%)"
opacity = "0.7"
    />
    <polygon 
          points={ `${squareCorners.topRight.join(',')} ${squareCorners.bottomRight.join(',')} ${octagonPoints[2].join(',')}` }
fill = "hsl(38, 75%, 58%)"
opacity = "0.45"
    />
    <polygon 
          points={ `${squareCorners.bottomRight.join(',')} ${squareCorners.bottomLeft.join(',')} ${octagonPoints[4].join(',')}` }
fill = "hsl(38, 55%, 35%)"
opacity = "0.38"
    />
    <polygon 
          points={ `${squareCorners.bottomLeft.join(',')} ${squareCorners.topLeft.join(',')} ${octagonPoints[6].join(',')}` }
fill = "hsl(38, 90%, 80%)"
opacity = "0.65"
    />

    <polygon 
          points={ `${octagonPoints[7].join(',')} ${octagonPoints[0].join(',')} ${squareCorners.topLeft.join(',')}` }
fill = "hsl(38, 100%, 98%)"
opacity = "0.9"
    />
    <polygon 
          points={ `${octagonPoints[6].join(',')} ${octagonPoints[7].join(',')} ${squareCorners.topLeft.join(',')}` }
fill = "hsl(38, 98%, 90%)"
opacity = "0.75"
    />
    <polygon 
          points={ `${octagonPoints[0].join(',')} ${octagonPoints[1].join(',')} ${squareCorners.topRight.join(',')}` }
fill = "hsl(38, 92%, 82%)"
opacity = "0.65"
    />
    <polygon 
          points={ `${octagonPoints[1].join(',')} ${octagonPoints[2].join(',')} ${squareCorners.topRight.join(',')}` }
fill = "hsl(38, 80%, 68%)"
opacity = "0.5"
    />
    <polygon 
          points={ `${octagonPoints[2].join(',')} ${octagonPoints[3].join(',')} ${squareCorners.bottomRight.join(',')}` }
fill = "hsl(38, 65%, 48%)"
opacity = "0.42"
    />
    <polygon 
          points={ `${octagonPoints[3].join(',')} ${octagonPoints[4].join(',')} ${squareCorners.bottomRight.join(',')}` }
fill = "hsl(38, 40%, 18%)"
opacity = "0.28"
    />
    <polygon 
          points={ `${octagonPoints[4].join(',')} ${octagonPoints[5].join(',')} ${squareCorners.bottomLeft.join(',')}` }
fill = "hsl(38, 50%, 32%)"
opacity = "0.35"
    />
    <polygon 
          points={ `${octagonPoints[5].join(',')} ${octagonPoints[6].join(',')} ${squareCorners.bottomLeft.join(',')}` }
fill = "hsl(38, 70%, 62%)"
opacity = "0.5"
    />
    </g>
    </svg>
  );

return (
    <div className= "min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-8" >
    <div className="max-w-4xl w-full" >
        <h1 className="text-3xl font-bold text-white mb-8 text-center" >
            Octagonal Gem Logo
                </h1>

                < div className = "flex justify-center items-start gap-8 mb-8" >
                    {/* Base Layer */ }
                    < div className = "flex flex-col items-center gap-3" >
                        <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-center" >
                            <BaseLayer />
                            </div>
                            < div className = "text-center" >
                                <h2 className="text-lg font-semibold text-amber-400" > Base Layer </h2>
                                    < p className = "text-gray-400 text-xs" > Internal facets </p>
                                        </div>
                                        </div>

{/* Top Layer */ }
<div className="flex flex-col items-center gap-3" >
    <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-center" >
        <TopLayer />
        </div>
        < div className = "text-center" >
            <h2 className="text-lg font-semibold text-amber-400" > Top Layer </h2>
                < p className = "text-gray-400 text-xs" > Highlights & reflections </p>
                    </div>
                    </div>

{/* Combined Logo */ }
<div className="flex flex-col items-center gap-3" >
    <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-center" >
        <CombinedLogo />
        </div>
        < div className = "text-center" >
            <h2 className="text-lg font-semibold text-amber-400" > Combined </h2>
                < p className = "text-gray-400 text-xs" > Final logo </p>
                    </div>
                    </div>
                    </div>

{/* Usage note */ }
<div className="bg-gray-700 rounded-lg p-4 text-gray-300" >
    <h3 className="text-base font-semibold text-amber-400 mb-2" > Configuration: </h3>
        < ul className = "space-y-1 text-sm" >
            <li>• <strong>Center: </strong> ({centerX}, {centerY})</li >
                <li>• <strong>Outer radius: </strong> {outerRadius}px (regular octagon)</li >
                    <li>• <strong>Center square: </strong> {centerSquareSize}×{centerSquareSize}px</li >
                        <li>• <strong>Base layer: </strong> Pinwheel-radial design with 8 triangular facets</li >
                            <li>• All points calculated mathematically for easy customization </li>
                                </ul>
                                </div>
                                </div>
                                </div>
  );
};

export default OctagonalGemLogo;