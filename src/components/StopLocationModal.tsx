// src/components/StopLocationModal.tsx
// 선택 정류장의 위치만 작은 카카오 지도로 띄우는 모달.
import React, { useEffect, useRef, useState } from "react";

interface Props {
    stop: string;
    region: string;      // 현재 방면(json 파일명, 소문자) → node_id 파일 선택
    open: boolean;
    onClose: () => void;
}

const nodeIdJson = (region: string) =>
    region.includes("masan") ? "/masan_nodeId.json" : "/haman_nodeId.json";

export const StopLocationModal: React.FC<Props> = ({ stop, region, open, onClose }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const [coord, setCoord] = useState<{ lat: number; lng: number } | null>(null);
    const [status, setStatus] = useState<"loading" | "ok" | "none">("loading");

    // 좌표 조회: 이름 → node_id(masan/haman) → 좌표(busLocation)
    useEffect(() => {
        if (!open || !stop) return;
        let alive = true;
        setStatus("loading");
        setCoord(null);
        (async () => {
            try {
                const [nid, loc] = await Promise.all([
                    fetch(nodeIdJson(region), { cache: "force-cache" }).then((r) => r.json()),
                    fetch("/busLocation.json", { cache: "force-cache" }).then((r) => r.json()),
                ]);
                const n = Array.isArray(nid)
                    ? nid.find((x: { stop?: string }) => (x?.stop || "").trim() === stop.trim())
                    : null;
                const l =
                    n && Array.isArray(loc)
                        ? loc.find((x: { node_id?: string }) => x.node_id === (n as { node_id?: string }).node_id)
                        : null;
                if (!alive) return;
                if (l) {
                    setCoord({ lat: (l as any).latitude, lng: (l as any).longitude });
                    setStatus("ok");
                } else {
                    setStatus("none");
                }
            } catch {
                if (alive) setStatus("none");
            }
        })();
        return () => {
            alive = false;
        };
    }, [open, stop, region]);

    // 카카오 지도 초기화 (SDK가 늦게 로드돼도 준비될 때까지 대기)
    useEffect(() => {
        if (!open || !coord) return;
        let cancelled = false;
        let tries = 0;
        const w = window as any;
        const tryInit = () => {
            if (cancelled) return;
            if (w.kakao && w.kakao.maps && w.kakao.maps.load) {
                w.kakao.maps.load(() => {
                    if (cancelled || !mapRef.current) return;
                    const center = new w.kakao.maps.LatLng(coord.lat, coord.lng);
                    const map = new w.kakao.maps.Map(mapRef.current, { center, level: 3 });

                    // 은은한 펄스(뒤)
                    const pulse = document.createElement("div");
                    pulse.className = "map-pulse";
                    new w.kakao.maps.CustomOverlay({
                        position: center,
                        content: pulse,
                        xAnchor: 0.5,
                        yAnchor: 0.5,
                        zIndex: 1,
                        map,
                    });

                    // 초록 테마 핀(앞)
                    const pinSvg =
                        '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="46" viewBox="0 0 36 46">' +
                        '<path d="M18 0C8.06 0 0 8.06 0 18c0 12.5 18 28 18 28s18-15.5 18-28C36 8.06 27.94 0 18 0z" fill="#10b981"/>' +
                        '<circle cx="18" cy="18" r="7.5" fill="#fff"/>' +
                        '<circle cx="18" cy="18" r="3.6" fill="#065f46"/></svg>';
                    const img = new w.kakao.maps.MarkerImage(
                        "data:image/svg+xml;charset=utf-8," + encodeURIComponent(pinSvg),
                        new w.kakao.maps.Size(36, 46),
                        { offset: new w.kakao.maps.Point(18, 46) }
                    );
                    new w.kakao.maps.Marker({ position: center, image: img, zIndex: 2, map });

                    setTimeout(() => map.relayout && map.relayout(), 60);
                });
                return;
            }
            if (tries++ < 40) setTimeout(tryInit, 150); // 최대 ~6초 대기
        };
        tryInit();
        return () => {
            cancelled = true;
        };
    }, [open, coord]);

    // ESC 닫기
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
                    <span className="flex items-center gap-1.5 font-semibold text-green-950">
                        <svg viewBox="0 0 24 24" className="h-4 w-4 text-green-700" fill="none" aria-hidden="true">
                            <path d="M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                            <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        {stop} 위치
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="닫기"
                        className="text-xl leading-none text-stone-400 hover:text-stone-600"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-3">
                    {status === "ok" ? (
                        <div ref={mapRef} className="h-64 w-full rounded-xl bg-stone-100" />
                    ) : (
                        <div className="grid h-64 place-items-center rounded-xl bg-stone-50 text-sm text-stone-400">
                            {status === "loading" ? "위치 불러오는 중…" : "이 정류장은 위치 정보가 없어요"}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
