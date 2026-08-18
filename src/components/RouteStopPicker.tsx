// src/components/RouteStopPicker.tsx
// 정류장을 노선 순서대로 가로로 늘어놓은 라인. 점을 탭해서 선택. 선택 정류장은 자동으로 화면 중앙에.
import React, { useEffect, useRef } from "react";

interface Props {
    stops: string[];
    selected: string;
    onSelect: (stop: string) => void;
}

export const RouteStopPicker: React.FC<Props> = ({ stops, selected, onSelect }) => {
    const selRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (selRef.current) {
            selRef.current.scrollIntoView({
                behavior: "smooth",
                inline: "center",
                block: "nearest",
            });
        }
    }, [selected, stops]);

    if (!stops.length) return null;

    return (
        <div className="-mx-4 overflow-x-auto px-4 pb-1">
            <div className="inline-flex min-w-max items-start">
                {stops.map((s, i) => {
                    const active = s === selected;
                    const first = i === 0;
                    const last = i === stops.length - 1;
                    return (
                        <button
                            key={s + i}
                            ref={active ? selRef : undefined}
                            type="button"
                            onClick={() => onSelect(s)}
                            aria-pressed={active}
                            aria-label={s}
                            title={s}
                            className="flex w-16 shrink-0 flex-col items-center pt-1 active:scale-95 transition"
                        >
                            <div className="flex w-full items-center">
                                <span className={"h-0.5 flex-1 " + (first ? "bg-transparent" : "bg-stone-300")} />
                                <span
                                    className={
                                        "shrink-0 rounded-full border-2 transition-all " +
                                        (active
                                            ? "h-4 w-4 border-green-700 bg-green-700"
                                            : "h-3 w-3 border-stone-300 bg-white")
                                    }
                                />
                                <span className={"h-0.5 flex-1 " + (last ? "bg-transparent" : "bg-stone-300")} />
                            </div>
                            <span
                                className={
                                    "mt-1 line-clamp-2 text-center text-[11px] leading-tight " +
                                    (active ? "font-bold text-green-900" : "text-stone-500")
                                }
                            >
                                {s}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
