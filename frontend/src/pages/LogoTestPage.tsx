// Temporary test page for Logo component development - displays base, top, and combined layers with controllable rotation

import { useState, useRef } from 'react';
import { Logo, LogoBase, LogoTop } from '../components/Logo';

export default function LogoTestPage() {
    const [topLayerOpacity, setTopLayerOpacity] = useState(0.9);
    const [targetAngle, setTargetAngle] = useState(180);
    const [duration, setDuration] = useState(400);
    const [easingIntensity, setEasingIntensity] = useState(3);

    // Store setTargetAngle functions from each logo component
    const logoBaseRotateRef = useRef<((targetOffset: number) => void) | null>(null);
    const logoTopRotateRef = useRef<((targetOffset: number) => void) | null>(null);
    const logoRotateRef = useRef<((targetOffset: number) => void) | null>(null);

    const handleRotateAll = () => {
        if (logoBaseRotateRef.current) logoBaseRotateRef.current(targetAngle);
        if (logoTopRotateRef.current) logoTopRotateRef.current(targetAngle);
        if (logoRotateRef.current) logoRotateRef.current(targetAngle);
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
            <h1 className="text-3xl font-bold mb-12 text-foreground">Logo Component Test</h1>

            <div className="flex gap-16 items-center">
                {/* Base Layer */}
                <div className="flex flex-col items-center gap-4">
                    <LogoBase
                        width={200}
                        height={200}
                        duration={duration}
                        easingIntensity={easingIntensity}
                        onRotate={(setTarget) => { logoBaseRotateRef.current = setTarget; }}
                    />
                    <p className="text-sm text-muted-foreground font-medium">Base Layer</p>
                </div>

                {/* Top Layer */}
                <div className="flex flex-col items-center gap-4">
                    <LogoTop
                        width={200}
                        height={200}
                        topLayerOpacity={topLayerOpacity}
                        duration={duration}
                        easingIntensity={easingIntensity}
                        onRotate={(setTarget) => { logoTopRotateRef.current = setTarget; }}
                    />
                    <p className="text-sm text-muted-foreground font-medium">Top Layer</p>
                </div>

                {/* Combined Logo */}
                <div className="flex flex-col items-center gap-4">
                    <Logo
                        width={200}
                        height={200}
                        topLayerOpacity={topLayerOpacity}
                        duration={duration}
                        easingIntensity={easingIntensity}
                        onRotate={(setTarget) => { logoRotateRef.current = setTarget; }}
                    />
                    <p className="text-sm text-muted-foreground font-medium">Combined</p>
                </div>
            </div>

            <div className="mt-12 flex flex-col items-center gap-4">
                <div className="flex items-center gap-4">
                    <label htmlFor="opacity-slider" className="text-sm text-foreground font-medium w-40">
                        Top Layer Opacity:
                    </label>
                    <input
                        id="opacity-slider"
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={topLayerOpacity}
                        onChange={(e) => setTopLayerOpacity(parseFloat(e.target.value))}
                        className="w-64"
                    />
                    <span className="text-sm text-muted-foreground font-mono w-16">
                        {topLayerOpacity.toFixed(2)}
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    <label htmlFor="target-angle-slider" className="text-sm text-foreground font-medium w-40">
                        Target Angle:
                    </label>
                    <input
                        id="target-angle-slider"
                        type="range"
                        min="0"
                        max="360"
                        step="45"
                        value={targetAngle}
                        onChange={(e) => setTargetAngle(parseFloat(e.target.value))}
                        className="w-64"
                    />
                    <span className="text-sm text-muted-foreground font-mono w-16">
                        {targetAngle}°
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    <label htmlFor="duration-slider" className="text-sm text-foreground font-medium w-40">
                        Duration:
                    </label>
                    <input
                        id="duration-slider"
                        type="range"
                        min="50"
                        max="1000"
                        step="10"
                        value={duration}
                        onChange={(e) => setDuration(parseFloat(e.target.value))}
                        className="w-64"
                    />
                    <span className="text-sm text-muted-foreground font-mono w-16">
                        {duration}ms
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    <label htmlFor="easing-slider" className="text-sm text-foreground font-medium w-40">
                        Easing Intensity:
                    </label>
                    <input
                        id="easing-slider"
                        type="range"
                        min="1"
                        max="4"
                        step="0.1"
                        value={easingIntensity}
                        onChange={(e) => setEasingIntensity(parseFloat(e.target.value))}
                        className="w-64"
                    />
                    <span className="text-sm text-muted-foreground font-mono w-16">
                        {easingIntensity.toFixed(1)}
                    </span>
                </div>

                <button
                    onClick={handleRotateAll}
                    className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                    Rotate All
                </button>

                <p className="text-sm text-muted-foreground italic">
                    Configure rotation parameters and click "Rotate All" to animate
                </p>
            </div>
        </div>
    );
}
