import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "./hooks/useQuery";
import { useBusData } from "./hooks/useBusData";
import { buildRouteGraph } from "./lib/routeGraph";
import { Header } from "./components/Header";
import { Filter } from "./components/Filter";
import { BusList } from "./components/BusList";

const BusTime: React.FC = () => {
    const query = useQuery();
    const navigate = useNavigate();
    const jsonFile =
        query.get("json") ||
        localStorage.getItem("lastDirectionFile") ||
        "tomasan_V1.json";

    const currentDirFile = jsonFile.includes("tohaman")
        ? "tohaman_V1.json"
        : "tomasan_V1.json";
    // 화살표가 오른쪽(→)이면 창원·마산으로 가는 방향(tomasan)
    const isToMasan = currentDirFile === "tomasan_V1.json";

    const {
        loading,
        data,
        busNumbers,
        selectedBusNumber,
        setSelectedBusNumber,
        selectedLocation,
        setSelectedLocation,
        onlyUpcoming,
        setOnlyUpcoming,
        filteredData,
    } = useBusData(jsonFile);

    const [isCompact, setIsCompact] = useState(false);
    const [expandedRow, setExpandedRow] = useState<number | null>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);

    // 노선 분기 그래프 (113·250 실제 경로 구조)
    const routeGraph = useMemo(() => buildRouteGraph(data), [data]);

    // 최근 선택 정류장 (방면별 · 최대 3개)
    const [recentStops, setRecentStops] = useState<string[]>([]);
    useEffect(() => {
        try {
            const raw = localStorage.getItem(`recentStops:${jsonFile}`);
            setRecentStops(raw ? JSON.parse(raw) : []);
        } catch {
            setRecentStops([]);
        }
    }, [jsonFile]);

    const selectStop = (stop: string) => {
        setSelectedLocation(stop);
        setExpandedRow(null);
        setRecentStops((prev) => {
            const next = [stop, ...prev.filter((s) => s !== stop)].slice(0, 3);
            try {
                localStorage.setItem(`recentStops:${jsonFile}`, JSON.stringify(next));
            } catch { /* ignore */ }
            return next;
        });
    };

    // 노선 선택 UI를 없앴으므로 항상 113·250 모두 표시되도록 고정
    useEffect(() => {
        if (busNumbers.length > 0 && selectedBusNumber.length !== busNumbers.length) {
            setSelectedBusNumber(busNumbers);
        }
    }, [busNumbers, selectedBusNumber, setSelectedBusNumber]);

    const goMap = () => navigate("/map");

    // 방향은 아래 화살표 토글이 담당 → 헤더는 앱 정체성만 (중복 제거)
    const title = "함안·마산 버스 시간표";

    const switchDirection = (file: string) => {
        if (file === currentDirFile) return;
        setExpandedRow(null);
        navigate({ search: `?json=${file}` });
    };

    useEffect(() => {
        localStorage.setItem("lastDirectionFile", currentDirFile);
    }, [currentDirFile]);

    useEffect(() => {
        const target = sentinelRef.current;
        if (!target) return;

        const obs = new IntersectionObserver(
            (entries) => {
                const e = entries[0];
                const topPassed = e.boundingClientRect.top < -24 || e.intersectionRatio < 1;
                setIsCompact(topPassed);
            },
            {
                root: null,
                threshold: 0.001,
                rootMargin: "-24px 0px 0px 0px",
            }
        );
        obs.observe(target);
        return () => obs.disconnect();
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-b from-stone-50 to-green-50/20">
            <Header
                isCompact={isCompact}
                title={title}
                goMap={goMap}
            />
            <div className="max-w-4xl mx-auto px-4 pt-3">
                <button
                    type="button"
                    onClick={() =>
                        switchDirection(isToMasan ? "tohaman_V1.json" : "tomasan_V1.json")
                    }
                    aria-label="버스 진행 방향 전환"
                    className="flex w-full items-center justify-center gap-5 px-4 py-2 transition active:scale-[0.99]"
                >
                    <span
                        className={
                            "text-lg tracking-tight transition-colors duration-300 " +
                            (isToMasan
                                ? "text-stone-500"
                                : "text-green-900 font-bold")
                        }
                    >
                        삼칠·대산
                    </span>

                    <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className={
                            "h-9 w-9 shrink-0 text-green-700 transition-transform duration-500 ease-out " +
                            (isToMasan ? "rotate-0" : "rotate-180")
                        }
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>

                    <span
                        className={
                            "text-lg tracking-tight transition-colors duration-300 " +
                            (isToMasan
                                ? "text-green-900 font-bold"
                                : "text-stone-500")
                        }
                    >
                        창원·마산
                    </span>
                </button>
            </div>
            <div ref={sentinelRef} aria-hidden="true" className="h-0.5 w-full" />
            <Filter
                isCompact={isCompact}
                selectedLocation={selectedLocation}
                routeGraph={routeGraph}
                recentStops={recentStops}
                onSelectStop={selectStop}
            />
            <BusList
                loading={loading}
                filteredData={filteredData}
                data={data}
                selectedBusNumber={selectedBusNumber}
                selectedLocation={selectedLocation}
                setSelectedBusNumber={setSelectedBusNumber}
                setSelectedLocation={setSelectedLocation}
                onlyUpcoming={onlyUpcoming}
                setOnlyUpcoming={setOnlyUpcoming}
                expandedRow={expandedRow}
                setExpandedRow={setExpandedRow}
            />
        </div>
    );
};

export default BusTime;
