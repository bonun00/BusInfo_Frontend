// src/lib/routeGraph.ts
// 주요 노선을 "깨끗한 등뼈"로, 시골 우회 정류장은 갈래로 표현하는 분기 그래프.
// - 등뼈(spine): 가장 굵은 간선을 따라 만든 실제 주요 노선 (에이스A→기공A→칠원→…→마산역)
// - col: 등뼈 순서 기준. 갈래 정류장은 연결 지점 근처로.
// - row: 등뼈=0, 갈래는 위/아래.
import type { BusData } from "../types";

export interface GraphNode {
    stop: string;
    col: number;
    row: number;
}
export interface GraphEdge {
    a: string;
    b: string;
    w: number;
    trunk: boolean;
}
export interface RouteGraph {
    nodes: GraphNode[];
    edges: GraphEdge[];
    cols: number;
    minRow: number;
    maxRow: number;
    byStop: Record<string, GraphNode>;
}

export function buildRouteGraph(data: BusData[]): RouteGraph {
    const wOut = new Map<string, Map<string, number>>();
    const wIn = new Map<string, Map<string, number>>();
    const nodesSet = new Set<string>();

    for (const d of data) {
        const stops = (d.route || []).map((r) => r.stop).filter((s): s is string => !!s);
        stops.forEach((s) => nodesSet.add(s));
        for (let i = 1; i < stops.length; i++) {
            const p = stops[i - 1];
            const q = stops[i];
            if (!wOut.has(p)) wOut.set(p, new Map());
            wOut.get(p)!.set(q, (wOut.get(p)!.get(q) || 0) + 1);
            if (!wIn.has(q)) wIn.set(q, new Map());
            wIn.get(q)!.set(p, (wIn.get(q)!.get(p) || 0) + 1);
        }
    }

    // ── 1. 등뼈: 가장 굵은 간선에서 시작해 양방향으로 가장 굵은 이웃을 따라 확장 ──
    const allEdges: { a: string; b: string; w: number }[] = [];
    for (const [a, m] of wOut) for (const [b, w] of m) allEdges.push({ a, b, w });
    allEdges.sort((x, y) => y.w - x.w);

    const inSpine = new Set<string>();
    let spine: string[] = [];
    if (allEdges.length) {
        const seed = allEdges[0];
        spine = [seed.a, seed.b];
        inSpine.add(seed.a);
        inSpine.add(seed.b);
        let end = seed.b;
        // 앞으로
        for (;;) {
            let best: string | null = null;
            let bw = -1;
            for (const [b, w] of wOut.get(end) || new Map()) {
                if (!inSpine.has(b) && w > bw) { bw = w; best = b; }
            }
            if (!best) break;
            spine.push(best);
            inSpine.add(best);
            end = best;
        }
        let start = seed.a;
        // 뒤로
        for (;;) {
            let best: string | null = null;
            let bw = -1;
            for (const [a, w] of wIn.get(start) || new Map()) {
                if (!inSpine.has(a) && w > bw) { bw = w; best = a; }
            }
            if (!best) break;
            spine.unshift(best);
            inSpine.add(best);
            start = best;
        }
    }

    // ── 2. col: 등뼈 순서 고정, 갈래는 가장 굵게 연결된 이웃 옆으로 ──
    const GAP = 3;
    const colKey = new Map<string, number>();
    spine.forEach((s, i) => colKey.set(s, i * GAP));

    const nonSpine = [...nodesSet].filter((s) => !inSpine.has(s));
    for (let pass = 0; pass < 6; pass++) {
        for (const s of nonSpine) {
            if (colKey.has(s)) continue;
            let bestS: string | null = null, bws = -1;
            for (const [b, w] of wOut.get(s) || new Map()) {
                if (colKey.has(b) && w > bws) { bws = w; bestS = b; }
            }
            let bestP: string | null = null, bwp = -1;
            for (const [a, w] of wIn.get(s) || new Map()) {
                if (colKey.has(a) && w > bwp) { bwp = w; bestP = a; }
            }
            if (bestS && bws >= bwp) colKey.set(s, (colKey.get(bestS) ?? 0) - 1);
            else if (bestP) colKey.set(s, (colKey.get(bestP) ?? 0) + 1);
        }
    }
    for (const s of nodesSet) if (!colKey.has(s)) colKey.set(s, 0);

    const finalOrder = [...nodesSet].sort((a, b) => (colKey.get(a) ?? 0) - (colKey.get(b) ?? 0));
    const col = new Map<string, number>();
    finalOrder.forEach((s, i) => col.set(s, i));

    // ── 3. row: 등뼈=0, 갈래는 체인 유지 + 빈 행 재사용 ──
    const row = new Map<string, number>();
    spine.forEach((s) => row.set(s, 0));

    const REUSE_GAP = 2;
    const branchRows: { r: number; tail: string; lastCol: number }[] = [];
    const usedR = new Set<number>([0]);
    const altSeq = [1, -1, 2, -2, 3, -3, 4, -4, 5, -5];
    const nextAlt = () => {
        for (const r of altSeq) if (!usedR.has(r)) return r;
        return usedR.size;
    };

    const nonSpineByCol = nonSpine.slice().sort((a, b) => (col.get(a) ?? 0) - (col.get(b) ?? 0));
    for (const s of nonSpineByCol) {
        const c = col.get(s) ?? 0;
        const ext = branchRows.find((br) => wOut.get(br.tail)?.has(s));
        if (ext) { row.set(s, ext.r); ext.tail = s; ext.lastCol = c; continue; }
        const free = branchRows
            .filter((br) => c - br.lastCol >= REUSE_GAP)
            .sort((a, b) => Math.abs(a.r) - Math.abs(b.r))[0];
        if (free) { row.set(s, free.r); free.tail = s; free.lastCol = c; continue; }
        const r = nextAlt();
        usedR.add(r);
        branchRows.push({ r, tail: s, lastCol: c });
        row.set(s, r);
    }

    // ── 결과 ──
    const spineEdge = new Set<string>();
    for (let i = 1; i < spine.length; i++) spineEdge.add(spine[i - 1] + " " + spine[i]);

    const nodes: GraphNode[] = finalOrder.map((s) => ({
        stop: s,
        col: col.get(s) ?? 0,
        row: row.get(s) ?? 0,
    }));
    const byStop: Record<string, GraphNode> = {};
    nodes.forEach((n) => { byStop[n.stop] = n; });

    const edges: GraphEdge[] = allEdges.map((e) => ({
        a: e.a,
        b: e.b,
        w: e.w,
        trunk: spineEdge.has(e.a + " " + e.b),
    }));

    let minRow = 0, maxRow = 0;
    nodes.forEach((n) => { minRow = Math.min(minRow, n.row); maxRow = Math.max(maxRow, n.row); });

    return { nodes, edges, cols: nodes.length, minRow, maxRow, byStop };
}
