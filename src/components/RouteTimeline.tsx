// src/components/RouteTimeline.tsx
// 운행 경로(정류장 목록) 타임라인.
// status는 상위(BusList)의 useLiveArrivals에서 받아 실시간 상태 문구만 표시.
import React from "react";
import type { RouteInfo } from "../types";
import type { LiveArrival, LiveStatus } from "../hooks/useLiveArrivals";

interface Props {
    route: RouteInfo[];
    selectedLocation: string;      // 승차 정류장
    pos: LiveArrival | null;       // 이 노선의 가장 가까운 버스
    status: LiveStatus;
}

export const RouteTimeline: React.FC<Props> = ({
    route,
    selectedLocation,
    pos,
    status,
}) => {
    const statusLine =
        status === "loading"
            ? "실시간 위치 확인 중…"
            : status === "error"
                ? "실시간 정보를 불러오지 못했어요"
                : status === "none" || (status === "ok" && !pos)
                    ? "지금 오는 실시간 버스가 없어요 (운행 종료·미운행)"
                    : status === "unsupported"
                        ? "이 정류장은 실시간 위치 정보를 지원하지 않아요"
                        : null;

    return (
        <div>
            {statusLine && (
                <div className="mb-2 flex items-center gap-1.5 text-xs text-stone-500">
                    <span
                        className={
                            "inline-block h-2 w-2 rounded-full " +
                            (status === "loading" ? "animate-pulse bg-emerald-400" : "bg-stone-300")
                        }
                    />
                    {statusLine}
                </div>
            )}

            {route.map((stop, i) => {
                const isBoarding = stop.stop === selectedLocation;
                const isLast = i === route.length - 1;

                return (
                    <React.Fragment key={i}>
                        {/* 정류장 */}
                        <div className="flex gap-3">
                            <span className="w-11 shrink-0 pt-0.5 text-right text-sm tabular-nums text-stone-500">
                                {stop.time}
                            </span>
                            <div className="flex flex-col items-center">
                                <span
                                    className={
                                        "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full " +
                                        (isBoarding
                                            ? "bg-green-700"
                                            : isLast
                                                ? "bg-red-600"
                                                : "border-2 border-stone-300 bg-white")
                                    }
                                />
                                {!isLast && <span className="my-0.5 w-0.5 grow bg-stone-200" />}
                            </div>
                            <div className={"min-w-0 " + (isLast ? "pb-0" : "pb-4")}>
                                <span
                                    className={
                                        "text-sm " +
                                        (isBoarding || isLast
                                            ? "font-medium text-stone-900"
                                            : "text-stone-600")
                                    }
                                >
                                    {stop.stop}
                                </span>
                                {isBoarding && (
                                    <span className="ml-1.5 text-[11px] text-green-700">승차</span>
                                )}
                                {isLast && (
                                    <span className="ml-1.5 text-[11px] text-red-600">종점</span>
                                )}
                            </div>
                        </div>
                    </React.Fragment>
                );
            })}
        </div>
    );
};
