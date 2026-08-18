import React from 'react';

interface HeaderProps {
    isCompact: boolean;
    title: string;
    goMap: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isCompact, title, goMap }) => {
    return (
        <header className="sticky top-0 z-30 backdrop-blur bg-white/95 border-b border-stone-100 shadow-sm transition-all">
            <div
                className={`max-w-4xl mx-auto px-4 flex items-center justify-between transition-all ${
                    isCompact ? "py-2" : "py-4"
                }`}
            >
                <div className="flex items-center gap-3">
                    <button
                        onClick={goMap}
                        className="mr-2 px-3 py-1.5 rounded-lg border border-stone-200 text-green-900 hover:bg-stone-50 hover:shadow-sm active:scale-95 transition inline-flex items-center gap-1.5"
                        aria-label="내 주변 정류장 지도"
                        title="내 주변 정류장"
                    >
                        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden="true">
                            <path d="M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11z" stroke="currentColor"
                                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        <span className="text-sm font-medium">내 주변</span>
                    </button>
                    <h1
                        className={`font-extrabold text-green-950 tracking-tight transition-all ${
                            isCompact ? "text-base md:text-lg" : "text-lg md:text-xl"
                        }`}
                    >
                        {title}
                    </h1>
                </div>
            </div>
        </header>
    );
};
