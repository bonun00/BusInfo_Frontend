// src/components/RouteMapPicker.tsx
// 실제 노선 분기 구조를 SVG로 그린 정류장 선택기. 점을 탭하면 선택.
import React, { useEffect, useRef, useState } from "react";
import type { RouteGraph } from "../lib/routeGraph";

interface Props {
    graph: RouteGraph;
    selected: string;
    onSelect: (stop: string) => void;
}

// 두 손가락 확대/축소 범위 (처음 열었을 때가 최대 — 축소만 가능)
const MIN_SCALE = 0.5;
const MAX_SCALE = 0.75;
const DEFAULT_SCALE = MAX_SCALE;
const clampScale = (v: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, v));

// 어르신 가독성을 위해 글씨·간격·탭 영역을 키운 값
const COL_W = 118;
const ROW_H = 66;
const PAD_X = 36;
const PAD_TOP = 30;
const PAD_BOTTOM = 44;

export const RouteMapPicker: React.FC<Props> = ({ graph, selected, onSelect }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(DEFAULT_SCALE);
    const scaleRef = useRef(DEFAULT_SCALE);
    scaleRef.current = scale;

    const { nodes, edges, cols, minRow, maxRow, byStop } = graph;

    const x = (col: number) => PAD_X + col * COL_W;
    const y = (rowV: number) => PAD_TOP + (rowV - minRow) * ROW_H;
    const width = PAD_X * 2 + Math.max(0, cols - 1) * COL_W;
    const height = PAD_TOP + (maxRow - minRow) * ROW_H + PAD_BOTTOM;

    // 선택 정류장을 가로 중앙으로 스크롤
    useEffect(() => {
        const n = byStop[selected];
        const el = scrollRef.current;
        if (!n || !el) return;
        const target = x(n.col) * scaleRef.current - el.clientWidth / 2;
        el.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
    }, [selected, byStop]);

    // 두 손가락 확대/축소 (한 손가락은 기존 가로 스크롤 그대로)
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        let startDist = 0;
        let startScale = 1;
        const distOf = (t: TouchList) =>
            Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

        const onStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                startDist = distOf(e.touches);
                startScale = scaleRef.current;
            }
        };
        const onMove = (e: TouchEvent) => {
            if (e.touches.length !== 2 || startDist <= 0) return;
            e.preventDefault(); // 페이지 전체가 확대되는 것 방지
            setScale(clampScale(startScale * (distOf(e.touches) / startDist)));
        };
        const onEnd = (e: TouchEvent) => {
            if (e.touches.length < 2) startDist = 0;
        };

        el.addEventListener("touchstart", onStart, { passive: true });
        el.addEventListener("touchmove", onMove, { passive: false });
        el.addEventListener("touchend", onEnd);
        el.addEventListener("touchcancel", onEnd);
        return () => {
            el.removeEventListener("touchstart", onStart);
            el.removeEventListener("touchmove", onMove);
            el.removeEventListener("touchend", onEnd);
            el.removeEventListener("touchcancel", onEnd);
        };
    }, []);

    if (!nodes.length) return null;

    const zoomBy = (f: number) => setScale((s) => clampScale(s * f));

    return (
        <div>
            <div className="mb-1 flex items-center justify-end gap-1.5">
                <button
                    type="button"
                    onClick={() => zoomBy(1 / 1.25)}
                    disabled={scale <= MIN_SCALE}
                    aria-label="노선도 축소"
                    className="h-8 w-8 rounded-full border border-stone-200 text-lg font-bold text-stone-600 transition active:scale-95 disabled:opacity-30"
                >
                    −
                </button>
                <button
                    type="button"
                    onClick={() => zoomBy(1.25)}
                    disabled={scale >= MAX_SCALE}
                    aria-label="노선도 확대"
                    className="h-8 w-8 rounded-full border border-stone-200 text-lg font-bold text-stone-600 transition active:scale-95 disabled:opacity-30"
                >
                    +
                </button>
            </div>

            <div
                ref={scrollRef}
                className="-mx-4 overflow-x-auto px-4 pb-1"
                style={{ touchAction: "pan-x pan-y" }}
            >
                <svg
                    width={width * scale}
                    height={height * scale}
                    viewBox={`0 0 ${width} ${height}`}
                    className="block"
                    role="group"
                    aria-label="노선도 정류장 선택 (두 손가락으로 확대·축소)"
                >
                {/* 간선 (직각 꺾임) */}
                {edges.map((e, i) => {
                    const a = byStop[e.a];
                    const b = byStop[e.b];
                    if (!a || !b) return null;
                    const xa = x(a.col), ya = y(a.row), xb = x(b.col), yb = y(b.row);
                    // 같은 행이면 수평 직선, 행이 다르면 수평→수직→수평(직각)
                    const mxp = (xa + xb) / 2;
                    const d =
                        ya === yb
                            ? `M ${xa} ${ya} L ${xb} ${yb}`
                            : `M ${xa} ${ya} L ${mxp} ${ya} L ${mxp} ${yb} L ${xb} ${yb}`;
                    return (
                        <path
                            key={i}
                            d={d}
                            fill="none"
                            stroke={e.trunk ? "#15803d" : "#d6d3d1"}
                            strokeWidth={e.trunk ? 3 : 1.5}
                            strokeLinejoin="miter"
                            strokeLinecap="round"
                        />
                    );
                })}

                {/* 노드 + 이름 */}
                {nodes.map((n) => {
                    const active = n.stop === selected;
                    const nx = x(n.col);
                    const ny = y(n.row);
                    return (
                        <g
                            key={n.stop}
                            className="cursor-pointer"
                            onClick={() => onSelect(n.stop)}
                            role="button"
                            aria-label={n.stop}
                            aria-pressed={active}
                        >
                            {/* 넓은 탭 영역 */}
                            <circle cx={nx} cy={ny} r={24} fill="transparent" />
                            <circle
                                cx={nx}
                                cy={ny}
                                r={active ? 10 : 7}
                                fill={active ? "#15803d" : "#ffffff"}
                                stroke={active ? "#15803d" : "#a8a29e"}
                                strokeWidth={2.5}
                            />
                            <text
                                x={nx}
                                y={ny + 29}
                                textAnchor="middle"
                                fontSize={18}
                                fontWeight={active ? 700 : 500}
                                fill={active ? "#14532d" : "#57534e"}
                            >
                                {n.stop.length > 6 ? n.stop.slice(0, 6) + "…" : n.stop}
                            </text>
                        </g>
                    );
                })}
                </svg>
            </div>
        </div>
    );
};
