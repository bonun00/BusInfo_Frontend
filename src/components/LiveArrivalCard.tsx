// src/components/LiveArrivalCard.tsx
// 실시간 도착 카드 — LIVE 뱃지 + 틱틱 카운트다운 + "N초 전 갱신"으로 진짜 실시간 느낌.
import React, { useEffect, useState } from "react";
import type { RouteInfo } from "../types";
import type { LiveStatus } from "../hooks/useLiveArrivals";

export interface IncomingBus {
    routeNo: string;
    arrPrevStationCnt: number;
    remainSec: number;
    arriveAtMs: number;        // 도착 예정 절대 시각(ms)
    route: RouteInfo[];
}

interface Props {
    buses: IncomingBus[];
    status: LiveStatus;
    boardingStop: string;
    updatedAt?: number;        // 마지막 갱신 시각(ms)
    onShowLocation?: () => void;
}

const LocationButton: React.FC<{ onClick?: () => void }> = ({ onClick }) =>
    onClick ? (
        <button
            type="button"
            onClick={onClick}
            className="flex shrink-0 items-center gap-1 rounded-full border border-stone-300 px-2.5 py-1 text-sm text-stone-700 hover:bg-stone-50 active:scale-95 transition"
        >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-green-700" fill="none" aria-hidden="true">
                <path d="M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="2" />
            </svg>
            위치
        </button>
    ) : null;

const LiveBadge: React.FC = () => (
    <span className="flex items-center gap-1 text-xs font-bold tracking-wide text-red-600">
        <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
        LIVE
    </span>
);

const mmss = (sec: number): string => {
    if (sec <= 0) return "곧 도착";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
};
const mins = (sec: number): string => {
    if (sec <= 0) return "곧 도착";
    const m = Math.round(sec / 60);
    return m <= 0 ? "곧 도착" : `${m}분 후`;
};
const distLabel = (n: number): string =>
    n <= 0 ? "승차 정류장 진입" : `${n}정거장 전`;

export const LiveArrivalCard: React.FC<Props> = ({
    buses,
    status,
    boardingStop,
    updatedAt,
    onShowLocation,
}) => {
    // 1초마다 리렌더 → 카운트다운·"N초 전"이 틱틱 움직임
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    if (status === "unsupported") return null;

    const statusText =
        status === "loading"
            ? "실시간 도착 확인 중…"
            : status === "error"
                ? "실시간 정보를 불러오지 못했어요"
                : buses.length === 0
                    ? "지금 오는 실시간 버스가 없어요"
                    : null;

    if (statusText) {
        return (
            <div className="rounded-xl border border-stone-100 bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-base text-stone-600">
                        <span
                            className={
                                "inline-block h-2.5 w-2.5 rounded-full " +
                                (status === "loading" ? "animate-pulse bg-emerald-400" : "bg-stone-400")
                            }
                        />
                        {statusText}
                    </div>
                    <LocationButton onClick={onShowLocation} />
                </div>
            </div>
        );
    }

    const [hero, next] = buses;
    const heroRemain = Math.max(0, Math.round((hero.arriveAtMs - now) / 1000));
    const imminent = hero.arrPrevStationCnt <= 1 || heroRemain <= 90;
    const secAgo = updatedAt ? Math.max(0, Math.round((now - updatedAt) / 1000)) : null;

    return (
        <div className="glow-card shadow-sm">
            <div className="glow-card-inner px-4 py-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                        <LiveBadge />
                        <span className="text-sm font-medium text-stone-600">
                            실시간 도착 · {boardingStop}
                        </span>
                    </div>
                    <LocationButton onClick={onShowLocation} />
                </div>

                {/* 가장 가까운 버스 — 틱틱 카운트다운 */}
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="shrink-0 rounded-md bg-green-900 px-2.5 py-1 text-base font-bold text-white">
                        {hero.routeNo}
                    </span>
                    <span
                        className={
                            "text-3xl font-extrabold tabular-nums " +
                            (imminent ? "text-amber-600" : "text-emerald-700")
                        }
                    >
                        {mmss(heroRemain)}
                        {heroRemain > 0 && <span className="ml-0.5 text-lg font-bold"> 후</span>}
                    </span>
                    <span className="text-base font-medium text-stone-600">· {distLabel(hero.arrPrevStationCnt)}</span>
                </div>

                {/* 다음 버스 한 대만 간단히 */}
                {next && (
                    <div className="mt-1.5 text-sm text-stone-500">
                        다음 {next.routeNo} · {mins(Math.max(0, Math.round((next.arriveAtMs - now) / 1000)))}
                    </div>
                )}

                {/* 실시간 갱신 표시 */}
                <div className="mt-2 flex items-center gap-1 text-xs text-stone-500">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    실시간 자동 갱신
                    {secAgo != null && ` · ${secAgo <= 2 ? "방금" : `${secAgo}초 전`} 업데이트`}
                </div>

                {/* 오차 안내 — 도착 예정은 어디까지나 예측값 */}
                <p className="mt-1.5 border-t border-stone-100 pt-1.5 text-sm leading-snug text-stone-500">
                    ※ 교통 상황에 따라 실제 도착 시간과 차이가 있을 수 있어요.
                </p>
            </div>
        </div>
    );
};
