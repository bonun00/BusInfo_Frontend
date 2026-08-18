import React, { useEffect, useMemo, useState } from 'react';
import type { BusData, RouteInfo } from '../types';
import { RouteTimeline } from './RouteTimeline';
import { LiveArrivalCard, type IncomingBus } from './LiveArrivalCard';
import { StopLocationModal } from './StopLocationModal';
import { useLiveArrivals } from '../hooks/useLiveArrivals';

interface BusListProps {
    loading: boolean;
    filteredData: any[];
    data: BusData[];
    selectedBusNumber: string[];
    selectedLocation: string;
    setSelectedBusNumber: (busNumbers: string[]) => void;
    setSelectedLocation: (location: string) => void;
    onlyUpcoming: boolean;
    setOnlyUpcoming: (v: boolean) => void;
    expandedRow: number | null;
    setExpandedRow: (row: number | null) => void;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

// 노선별 색 (113 초록 · 250 파랑 · 그 외 보라)
// Tailwind는 동적 클래스명을 못 읽으므로 완성된 문자열로 둔다
const ROUTE_TONES: Record<string, { idle: string; next: string; label: string }> = {
    "113": {
        idle: "bg-green-50 text-green-800 hover:bg-green-100",
        next: "bg-green-900 text-white font-bold",
        label: "text-green-700",
    },
    "250": {
        idle: "bg-sky-50 text-sky-900 hover:bg-sky-100",
        next: "bg-sky-900 text-white font-bold",
        label: "text-sky-700",
    },
};
const OTHER_TONE = {
    idle: "bg-purple-50 text-purple-900 hover:bg-purple-100",
    next: "bg-purple-900 text-white font-bold",
    label: "text-purple-700",
};
const toneOf = (prefix: string) => ROUTE_TONES[prefix] ?? OTHER_TONE;

const toMin = (t: string): number => {
    const [h, m] = (t || "").split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return Number.POSITIVE_INFINITY;
    return h * 60 + m;
};

export const BusList: React.FC<BusListProps> = ({
    loading,
    filteredData,
    data,
    selectedBusNumber,
    selectedLocation,
    setSelectedBusNumber,
    setSelectedLocation,
    onlyUpcoming,
    setOnlyUpcoming,
    expandedRow,
    setExpandedRow,
}) => {
    // 현재 시각: "다음 차" 강조와 지난 시각 흐림 처리를 위해 30초마다 갱신
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(id);
    }, []);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const nowLabel = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

    // 정류장 위치 모달
    const [mapOpen, setMapOpen] = useState(false);

    const handleChipClick = (index: number) => {
        setExpandedRow(expandedRow === index ? null : index);
    };

    const getRegionFromQuery = () => {
        const sp = new URLSearchParams(location.search);
        return (sp.get("json") || "").toLowerCase();
    };

    // 현재 화면에 보이는 노선들 (칩 표기 + 헤더 즐겨찾기 판단에 사용)
    const viewPrefixes = useMemo(
        () => Array.from(new Set(filteredData.map((r) => r.busNumber.split("-")[0]))),
        [filteredData]
    );
    const showRoute = viewPrefixes.length > 1;

    // 승차 정류장 실시간 도착 (카드 + 경로가 공유하는 단일 폴링)
    const region = getRegionFromQuery();
    const { arrivals, status: liveStatus, updatedAt } = useLiveArrivals(region, selectedLocation);

    // 노선별 대표 경로 (미니 진행바용) — 승차 정류장을 지나는 편에서 추출
    const routeByPrefix = useMemo(() => {
        const m: Record<string, RouteInfo[]> = {};
        for (const d of data) {
            const p = d.busNumber.split("-")[0];
            if (m[p]) continue;
            if (d.route?.some((r) => r.stop === selectedLocation)) m[p] = d.route;
        }
        return m;
    }, [data, selectedLocation]);

    // 선택 노선으로 오는 실시간 버스 목록 (가까운 순)
    const incomingBuses = useMemo<IncomingBus[]>(() => {
        const out: IncomingBus[] = [];
        for (const a of arrivals) {
            const p = selectedBusNumber.find((pref) => a.routeNo.startsWith(pref));
            if (!p) continue;
            const route = routeByPrefix[p];
            if (!route) continue;
            out.push({
                routeNo: p,
                arrPrevStationCnt: a.arrPrevStationCnt,
                remainSec: a.remainSec,
                arriveAtMs: a.arriveAtMs,
                route,
            });
        }
        return out;
    }, [arrivals, selectedBusNumber, routeByPrefix]);

    // filteredData는 시간 오름차순 정렬됨 → 첫 미래편이 "다음 차"
    const nextIdx = useMemo(
        () => filteredData.findIndex((r) => toMin(r.time) >= nowMin),
        [filteredData, nowMin]
    );
    const nextLabel = nextIdx >= 0 ? filteredData[nextIdx].time : null;

    // 시(hour) 단위로 묶어 시간표 격자를 구성
    const groups = useMemo(() => {
        const gs: { hour: string; items: { row: any; idx: number }[] }[] = [];
        filteredData.forEach((row, idx) => {
            const hour = (row.time || "").slice(0, 2);
            let g = gs[gs.length - 1];
            if (!g || g.hour !== hour) {
                g = { hour, items: [] };
                gs.push(g);
            }
            g.items.push({ row, idx });
        });
        return gs;
    }, [filteredData]);

    return (
        <main className="max-w-4xl mx-auto px-4 py-6">
            {loading ? (
                <div className="w-full space-y-3">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-14 rounded-xl bg-stone-100 animate-pulse" />
                    ))}
                </div>
            ) : !selectedLocation ? (
                <div className="text-center py-16">
                    <p className="text-green-950 font-bold text-lg">정류장을 선택해 주세요.</p>
                    <p className="text-stone-600 text-base mt-1.5">위 노선도에서 정류장을 누르면 시간표가 나와요.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <h3 className="truncate text-xl font-bold text-green-950">
                        {selectedLocation} 버스 시간표
                    </h3>

                    {/* 실시간 도착 카드 (오른쪽 위치 버튼 → 지도 모달) */}
                    <LiveArrivalCard
                        buses={incomingBuses}
                        status={liveStatus}
                        boardingStop={selectedLocation}
                        updatedAt={updatedAt}
                        onShowLocation={() => setMapOpen(true)}
                    />

                    <StopLocationModal
                        stop={selectedLocation}
                        region={region}
                        open={mapOpen}
                        onClose={() => setMapOpen(false)}
                    />

                    {/* 실시간 ↔ 시간표 구분 */}
                    <div className="flex items-center gap-3 pt-1">
                        <span className="h-px flex-1 bg-stone-200" />
                        <div className="flex flex-col items-center leading-tight">
                            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                Timetable
                            </span>
                            <span className="text-lg font-semibold text-stone-700">정규 운행 시간표</span>
                        </div>
                        <span className="h-px flex-1 bg-stone-200" />
                    </div>

                    {/* 시간 요약 박스 전체가 '지금 이후만' 토글 */}
                    <button
                        type="button"
                        onClick={() => setOnlyUpcoming(!onlyUpcoming)}
                        aria-pressed={onlyUpcoming}
                        title="눌러서 현재 시간 이후 버스만 보기"
                        className={
                            "flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-left shadow-sm transition active:scale-[0.99] " +
                            (onlyUpcoming
                                ? "border-green-800 bg-green-50"
                                : "border-stone-100 bg-white hover:bg-stone-50")
                        }
                    >
                        <span className="min-w-0 truncate text-lg text-stone-700">
                            지금{" "}
                            <strong className="text-green-900 font-bold tabular-nums">{nowLabel}</strong>
                            {nextLabel ? (
                                <>
                                    {" · 다음 "}
                                    <strong className="text-green-900 font-bold tabular-nums">{nextLabel}</strong>
                                </>
                            ) : (
                                <span className="text-stone-500"> · 오늘 운행 종료</span>
                            )}
                        </span>
                        <span
                            className={
                                "flex shrink-0 items-center gap-1 text-base font-medium " +
                                (onlyUpcoming ? "text-green-800" : "text-stone-500")
                            }
                        >
                            <span
                                className={
                                    "inline-block h-2 w-2 rounded-full " +
                                    (onlyUpcoming ? "bg-green-600" : "bg-stone-300")
                                }
                            />
                            지금 이후만
                        </span>
                    </button>

                    {filteredData.length === 0 ? (
                        <div className="py-8 text-center text-stone-600">
                            <p className="font-semibold text-lg">표시할 버스가 없어요.</p>
                            <p className="mt-1 text-base">'지금 이후만'을 해제해 보세요.</p>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-stone-100 bg-white shadow-sm divide-y divide-stone-100">
                        {groups.map((g) => {
                            const allPast =
                                nextIdx < 0 ? true : g.items.every((it) => it.idx < nextIdx);
                            const expandedInGroup =
                                expandedRow != null &&
                                g.items.some((it) => it.idx === expandedRow);

                            return (
                                <div key={g.hour}>
                                    <div className="flex gap-3 px-4 py-3">
                                        <span
                                            className={
                                                "w-11 shrink-0 pt-2.5 text-2xl font-bold tabular-nums " +
                                                (allPast ? "text-stone-400" : "text-green-900")
                                            }
                                        >
                                            {g.hour}
                                        </span>
                                        <div className="flex flex-wrap gap-2">
                                            {g.items.map(({ row, idx }) => {
                                                const prefix = row.busNumber.split("-")[0];
                                                const isPast = nextIdx >= 0 && idx < nextIdx;
                                                const isNext = idx === nextIdx;
                                                const isOpen = expandedRow === idx;

                                                const rt = toneOf(prefix);
                                                const tone = isNext
                                                    ? rt.next
                                                    : isPast
                                                        ? "bg-stone-100 text-stone-400"
                                                        : rt.idle;

                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleChipClick(idx)}
                                                        aria-expanded={isOpen}
                                                        className={
                                                            "relative inline-flex items-center rounded-lg px-4 py-3 text-2xl tabular-nums transition active:scale-95 " +
                                                            tone +
                                                            (isOpen
                                                                ? " ring-2 ring-green-700 ring-offset-1"
                                                                : "")
                                                        }
                                                    >
                                                        {showRoute && (
                                                            <span
                                                                className={
                                                                    "mr-1.5 text-sm font-medium " +
                                                                    (isNext
                                                                        ? "text-white/90"
                                                                        : isPast
                                                                            ? "text-stone-400"
                                                                            : rt.label)
                                                                }
                                                            >
                                                                {prefix}
                                                            </span>
                                                        )}
                                                        {row.time}
                                                        {isNext && (
                                                            <span className="absolute -top-3 -right-2 rounded-full bg-amber-400 px-2.5 py-0.5 text-sm font-bold text-amber-950">
                                                                다음
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {expandedInGroup && expandedRow != null && (() => {
                                        const row = filteredData[expandedRow];
                                        const prefix = row.busNumber.split("-")[0];

                                        return (
                                            <div className="border-t border-stone-100 bg-stone-50/70 px-4 py-4">
                                                <div className="mb-3 text-lg font-semibold text-green-900 tabular-nums">
                                                    {row.time} · {row.busNumber}번 운행 경로
                                                </div>

                                                <RouteTimeline
                                                    route={row.route}
                                                    selectedLocation={selectedLocation}
                                                    pos={
                                                        arrivals.find((a) =>
                                                            a.routeNo.startsWith(prefix)
                                                        ) ?? null
                                                    }
                                                    status={liveStatus}
                                                />
                                            </div>
                                        );
                                    })()}
                                </div>
                            );
                        })}
                    </div>
                    )}
                </div>
            )}
        </main>
    );
};
