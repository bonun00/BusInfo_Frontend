import React from 'react';
import { RouteMapPicker } from './RouteMapPicker';
import type { RouteGraph } from '../lib/routeGraph';

interface FilterProps {
    isCompact: boolean;
    selectedLocation: string;
    routeGraph: RouteGraph;        // 노선 분기 그래프
    recentStops: string[];         // 최근 선택 (최대 3개)
    onSelectStop: (stop: string) => void;
}

export const Filter: React.FC<FilterProps> = ({
    isCompact,
    selectedLocation,
    routeGraph,
    recentStops,
    onSelectStop,
}) => {
    return (
        <div
            className={`sticky z-20 border-b border-stone-100 bg-white/90 backdrop-blur transition-all ${
                isCompact ? "py-1.5" : "py-3"
            }`}
            style={{ top: isCompact ? 48 : 64 }}
        >
            <div className="max-w-4xl mx-auto px-4 transition-all">
                {!isCompact && (
                    <label className="mb-2 block text-green-950 text-base font-semibold">정류장</label>
                )}

                {/* 최근 선택 정류장 (최대 3개) */}
                {!isCompact && recentStops.length > 0 && (
                    <div className="mb-2 flex items-center gap-1.5 overflow-x-auto pb-0.5">
                        <span className="shrink-0 text-sm text-stone-500">최근</span>
                        {recentStops.map((s) => {
                            const active = s === selectedLocation;
                            return (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => onSelectStop(s)}
                                    className={
                                        "shrink-0 rounded-full border px-3 py-1.5 text-sm transition active:scale-95 " +
                                        (active
                                            ? "border-green-700 bg-green-50 font-semibold text-green-900"
                                            : "border-stone-200 text-stone-700 hover:bg-stone-50")
                                    }
                                >
                                    {s}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* 노선 분기 그림 정류장 선택기 */}
                <RouteMapPicker
                    graph={routeGraph}
                    selected={selectedLocation}
                    onSelect={onSelectStop}
                />

                {!isCompact && !selectedLocation && (
                    <p className="mt-1.5 text-sm text-green-800/90">
                        정류장을 누르면 113·250 시간표가 함께 떠요.
                    </p>
                )}
            </div>
        </div>
    );
};
