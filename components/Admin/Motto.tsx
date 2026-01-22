import React from 'react';
import { Heart, Sparkles } from 'lucide-react';

const Motto: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-12 rounded-3xl shadow-2xl text-white relative overflow-hidden">
                {/* Repeating background text pattern */}
                <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
                    <div className="flex flex-wrap gap-8 p-4 transform -rotate-12">
                        {Array.from({ length: 50 }).map((_, i) => (
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
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>

                <div className="relative z-10">
                    <div className="flex items-center justify-center mb-8">
                        <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
                            <Sparkles size={48} className="text-yellow-300" />
                        </div>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-black text-center mb-6 tracking-tight leading-tight">
                        IN GOD WE TRUST
                    </h1>

                    <div className="flex items-center justify-center gap-3 mb-6">
                        <div className="h-1 w-16 bg-white/40 rounded-full"></div>
                        <Heart size={24} className="text-red-300 fill-red-300" />
                        <div className="h-1 w-16 bg-white/40 rounded-full"></div>
                    </div>

                    <p className="text-2xl md:text-3xl font-bold text-center text-white/90 leading-relaxed">
                        NOTHING IS IMPOSSIBLE<br />UNDER HIS HANDS
                    </p>
                </div>
            </div>

            {/* Additional inspirational section */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <div className="max-w-3xl mx-auto text-center">
                    <h3 className="text-xl font-black text-slate-800 mb-4">Our Foundation</h3>
                    <p className="text-slate-600 leading-relaxed font-medium">
                        This motto serves as the cornerstone of our business philosophy. With faith as our guide
                        and determination as our tool, we believe that every challenge is an opportunity,
                        and every goal is within reach when we trust in divine providence.
                    </p>
                </div>
            </div>

            {/* Developer signature */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Developed by</p>
                        <p className="text-lg font-black text-slate-800">INNOCENT MUSTAPHA</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Contact</p>
                        <a href="mailto:innocentmustapha36@gmail.com" className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">
                            innocentmustapha36@gmail.com
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Motto;
