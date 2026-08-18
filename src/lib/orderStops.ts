// src/lib/orderStops.ts
// 정류장을 노선 순서대로 배열한다.
// 이 지역 농어촌 노선은 편마다 경유지가 제각각(변형 수십 가지)이라 하나의 고정 순서가 없다.
// → 각 정류장이 경로에서 차지하는 "평균 정규화 위치(0~1)"로 정렬하면
//   시점 쪽 정류장이 앞, 종점 쪽이 뒤로 안정적으로 배치된다.
import type { BusData } from "../types";

export function orderStops(data: BusData[]): string[] {
    const acc = new Map<string, { sum: number; n: number }>();

    for (const d of data) {
        const stops = (d.route || [])
            .map((r) => r.stop)
            .filter((s): s is string => !!s);
        const L = stops.length;

        stops.forEach((s, i) => {
            const ratio = L > 1 ? i / (L - 1) : 0; // 단일 정류장 경로는 0
            const a = acc.get(s) || { sum: 0, n: 0 };
            a.sum += ratio;
            a.n += 1;
            acc.set(s, a);
        });
    }

    // 평균 위치 오름차순. 동점이면 최초 등장 순서 유지(Map은 삽입순, JS sort는 안정 정렬).
    return [...acc.entries()]
        .map(([stop, a]) => ({ stop, pos: a.n ? a.sum / a.n : 0 }))
        .sort((x, y) => x.pos - y.pos)
        .map((e) => e.stop);
}
