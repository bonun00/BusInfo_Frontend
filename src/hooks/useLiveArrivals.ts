// src/hooks/useLiveArrivals.ts
// 승차 정류장으로 오는 실시간 버스 목록을 반환 (도착정보 폴링 1회로 카드·경로가 공유).
// 새 API 없이 기존 /api/bus?nodeId= 재사용. 15초 갱신.
import { useCallback, useEffect, useRef, useState } from "react";

const isProdHost =
    typeof window !== "undefined" &&
    !/^(localhost|127\.0\.0\.1)$/i.test(location.hostname);

let API_BASE = import.meta.env.VITE_BUS_API_BASE || "/api";
if (isProdHost && /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(API_BASE)) {
    API_BASE = "/api";
}

const nodeIdJsonByRegion = (region: string) =>
    region.includes("masan") ? "/masan_nodeId.json" : "/haman_nodeId.json";

const num = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
};

export type LiveStatus =
    | "idle"
    | "loading"
    | "ok"
    | "none"
    | "error"
    | "unsupported";

export interface LiveArrival {
    routeNo: string;
    arrPrevStationCnt: number; // 승차 정류장 기준 몇 정거장 전
    remainSec: number;         // 도착까지 남은 초 (스냅샷)
    arriveAtMs: number;        // 도착 예정 절대 시각(ms) → 실시간 카운트다운용
}

export function useLiveArrivals(region: string, boardingStop: string) {
    const [nodeId, setNodeId] = useState<string | null>(null);
    const [resolving, setResolving] = useState(true);
    const [arrivals, setArrivals] = useState<LiveArrival[]>([]);
    const [status, setStatus] = useState<LiveStatus>("idle");
    const [updatedAt, setUpdatedAt] = useState<number>(0); // 마지막 성공 갱신 시각(ms)
    const abortRef = useRef<AbortController | null>(null);

    // 정류장 이름 → node_id 해석 (시간표 이름과 파일 이름이 다르면 실패 = unsupported)
    useEffect(() => {
        let alive = true;
        setResolving(true);
        setNodeId(null);
        if (!boardingStop) {
            setResolving(false);
            return;
        }
        (async () => {
            try {
                const res = await fetch(nodeIdJsonByRegion(region), { cache: "force-cache" });
                const list = await res.json();
                const found = Array.isArray(list)
                    ? list.find((x: { stop?: string }) => (x?.stop || "").trim() === boardingStop.trim())
                    : null;
                if (alive) {
                    setNodeId((found as { node_id?: string })?.node_id || null);
                    setResolving(false);
                }
            } catch {
                if (alive) {
                    setNodeId(null);
                    setResolving(false);
                }
            }
        })();
        return () => {
            alive = false;
        };
    }, [region, boardingStop]);

    const fetchArrivals = useCallback(async () => {
        if (!nodeId) return;
        abortRef.current?.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        try {
            const res = await fetch(
                `${API_BASE}/bus?nodeId=${encodeURIComponent(nodeId)}`,
                { signal: ctrl.signal }
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const raw = await res.json();
            const list: Array<Record<string, unknown>> = Array.isArray(raw)
                ? raw
                : raw
                    ? [raw]
                    : [];

            const mapped: LiveArrival[] = list
                .map((x) => {
                    const exp = num(x.expireAt ?? x.expire_at);
                    const arriveAtMs = Number.isFinite(exp)
                        ? exp
                        : Date.now() + Math.max(0, num(x.arrTime ?? x.arrtime) || 0) * 1000;
                    const remain = Math.max(0, Math.round((arriveAtMs - Date.now()) / 1000));
                    const prev = num(x.arrPrevStationCnt ?? x.arrprevstationcnt);
                    return {
                        routeNo: String(x.routeNo ?? x.routeno ?? ""),
                        arrPrevStationCnt: Number.isFinite(prev) ? prev : 0,
                        remainSec: remain,
                        arriveAtMs,
                    };
                })
                .filter((a) => a.routeNo);

            // 가까운 순(정거장 수 → 남은 초)
            mapped.sort(
                (a, b) =>
                    a.arrPrevStationCnt - b.arrPrevStationCnt || a.remainSec - b.remainSec
            );

            setArrivals(mapped);
            setUpdatedAt(Date.now());
            setStatus(mapped.length ? "ok" : "none");
        } catch (e) {
            if ((e as { name?: string })?.name === "AbortError") return;
            setStatus("error");
        }
    }, [nodeId]);

    useEffect(() => {
        if (!boardingStop) {
            setStatus("idle");
            setArrivals([]);
            return;
        }
        if (resolving) {
            setStatus("loading");
            return;
        }
        if (!nodeId) {
            setStatus("unsupported");
            setArrivals([]);
            return;
        }
        setStatus("loading");
        setArrivals([]);
        fetchArrivals();
        const id = setInterval(fetchArrivals, 15000);
        return () => {
            clearInterval(id);
            abortRef.current?.abort();
        };
    }, [nodeId, resolving, boardingStop, fetchArrivals]);

    return { arrivals, status, updatedAt };
}
