import React, { useEffect, useState } from 'react';
import { Heart, Sparkles } from 'lucide-react';

interface MottoSplashProps {
    onComplete: () => void;
}

const MottoSplash: React.FC<MottoSplashProps> = ({ onComplete }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onComplete();
        }, 2000);

        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center animate-in fade-in duration-300">
            {/* Repeating background text pattern */}
            <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
                <div className="flex flex-wrap gap-8 p-4 transform -rotate-12">
                    {Array.from({ length: 80 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-2 whitespace-nowrap">
                            <span className="text-sm font-bold">business is records</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="opacity-60">
                                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                            </svg>
                        </div>
                    ))}
                </div>
            </div>

            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>

            <div className="relative z-10 text-center px-8 max-w-4xl animate-in zoom-in-95 duration-500">
                <div className="flex items-center justify-center mb-8">
                    <div className="bg-white/20 p-6 rounded-3xl backdrop-blur-sm animate-pulse">
                        <Sparkles size={64} className="text-yellow-300" />
                    </div>
                </div>

                <h1 className="text-5xl md:text-6xl font-black text-white mb-6 tracking-tight leading-tight">
                    IN GOD WE TRUST
                </h1>

                <div className="flex items-center justify-center gap-4 mb-6">
                    <div className="h-1 w-24 bg-white/40 rounded-full"></div>
                    <Heart size={32} className="text-red-300 fill-red-300" />
                    <div className="h-1 w-24 bg-white/40 rounded-full"></div>
                </div>

                <p className="text-3xl md:text-4xl font-bold text-white/90 leading-relaxed">
                    NOTHING IS IMPOSSIBLE<br />UNDER HIS HANDS
                </p>
            </div>
        </div>
    );
};

export default MottoSplash;
