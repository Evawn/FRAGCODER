// Temporary test page for Logo component development - displays base, top, and combined layers with synchronized hover effects

import { useState } from 'react';
import { Logo, LogoBase, LogoTop } from '../components/Logo';

export default function LogoTestPage() {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
            <h1 className="text-3xl font-bold mb-12 text-foreground">Logo Component Test</h1>

            <div
                className="flex gap-16 items-center"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Base Layer */}
                <div className="flex flex-col items-center gap-4">
                    <LogoBase
                        width={200}
                        height={200}
                        className={`logo-rotate ${isHovered ? 'rotate-180' : ''}`}
                    />
                    <p className="text-sm text-muted-foreground font-medium">Base Layer</p>
                </div>

                {/* Top Layer */}
                <div className="flex flex-col items-center gap-4">
                    <LogoTop
                        width={200}
                        height={200}
                        className={`logo-rotate ${isHovered ? 'rotate-180' : ''}`}
                    />
                    <p className="text-sm text-muted-foreground font-medium">Top Layer</p>
                </div>

                {/* Combined Logo */}
                <div className="flex flex-col items-center gap-4">
                    <Logo
                        width={200}
                        height={200}
                        className={`logo-rotate ${isHovered ? 'rotate-180' : ''}`}
                    />
                    <p className="text-sm text-muted-foreground font-medium">Combined</p>
                </div>
            </div>

            <p className="mt-12 text-sm text-muted-foreground italic">
                Hover over any logo to see synchronized 180° rotation
            </p>
        </div>
    );
}
