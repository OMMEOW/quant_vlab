"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useLabStore } from "@/store/useLabStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { RefreshCcw, LayoutDashboard, Database, Info, Wand2, TrendingUp, Hash, Minus } from "lucide-react";
import { toast } from "sonner";

// ─── Population stat helpers ──────────────────────────────────────────────────

const calcMean = (nums: number[]) =>
    nums.length ? parseFloat((nums.reduce((s, v) => s + v, 0) / nums.length).toFixed(4)) : null;

const calcMedian = (nums: number[]) => {
    if (!nums.length) return null;
    const sorted = [...nums].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
        ? parseFloat(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(4))
        : sorted[mid];
};

const calcMode = (vals: (string | number)[]) => {
    if (!vals.length) return null;
    const freq: Record<string, number> = {};
    vals.forEach(v => { const k = String(v); freq[k] = (freq[k] || 0) + 1; });
    const maxFreq = Math.max(...Object.values(freq));
    const modes = Object.entries(freq).filter(([, f]) => f === maxFreq).map(([k]) => k);
    return { values: modes.slice(0, 3), freq: maxFreq };
};

// ─── Stat card ────────────────────────────────────────────────────────────────

const StatCard = ({
    label, value, sub, icon, color,
}: {
    label: string; value: string | null; sub?: string;
    icon: React.ReactNode; color: string;
}) => (
    <div className={`relative overflow-hidden p-6 rounded-3xl border ${color} bg-white/60 dark:bg-slate-900/40 backdrop-blur-md shadow-lg`}>
        <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
                <p className="text-3xl font-black tracking-tighter text-foreground truncate">
                    {value ?? <span className="text-muted-foreground/40 text-lg">—</span>}
                </p>
                {sub && <p className="text-xs text-muted-foreground font-medium">{sub}</p>}
            </div>
            <div className="p-3 rounded-2xl bg-primary/10 text-primary shrink-0">
                {icon}
            </div>
        </div>
    </div>
);

// ─── Types ───────────────────────────────────────────────────────────────────

type MethodStats = {
    method: string;
    label: string;
    n: number;
    mean: number;
    sd: number;
    se: number;
};

const METHOD_LABELS: Record<string, string> = {
    random: "Simple Random (SRS)",
    stratified: "Stratified",
    systematic: "Systematic",
    cluster: "Cluster",
};

type SamplingMetadata = {
    indices?: number[];
    strata?: Record<string, number>;
    k?: number;
    start?: number;
    clustersPicked?: string[];
    totalClusters?: number;
};

// ─── Pure sampling helper ─────────────────────────────────────────────────────

const drawSample = (
    method: string,
    dataset: Record<string, unknown>[],
    count: number,
    headers: string[]
): { data: Record<string, unknown>[], metadata: SamplingMetadata } => {
    if (method === "random") {
        const indexed = dataset.map((d, i) => ({ ...d, _idx: i }));
        const shuffled = [...indexed].sort(() => 0.5 - Math.random());
        const sliced = shuffled.slice(0, count);
        return {
            data: sliced,
            metadata: { indices: sliced.map(d => d._idx as number).slice(0, 10) }
        };
    }
    if (method === "stratified") {
        const key = headers[0];
        const strata: Record<string, Record<string, unknown>[]> = {};
        dataset.forEach(row => {
            const k = row[key]?.toString() || "Unknown";
            if (!strata[k]) strata[k] = [];
            strata[k].push(row);
        });
        const out: Record<string, unknown>[] = [];
        const strataCounts: Record<string, number> = {};
        Object.entries(strata).forEach(([name, items]) => {
            const n = Math.max(1, Math.floor((count / dataset.length) * items.length));
            out.push(...[...items].sort(() => 0.5 - Math.random()).slice(0, n));
            strataCounts[name] = n;
        });
        return { data: out, metadata: { strata: strataCounts } };
    }
    if (method === "systematic") {
        const kValue = Math.max(1, Math.floor(dataset.length / count));
        const startValue = Math.floor(Math.random() * kValue);
        const out: Record<string, unknown>[] = [];
        for (let i = startValue; i < dataset.length && out.length < count; i += kValue) {
            out.push(dataset[i]);
        }
        return { data: out, metadata: { k: kValue, start: startValue } };
    }
    if (method === "cluster") {
        const key = headers[0];
        const clusters: Record<string, Record<string, unknown>[]> = {};
        dataset.forEach(row => {
            const k2 = row[key]?.toString() || "Unknown";
            if (!clusters[k2]) clusters[k2] = [];
            clusters[k2].push(row);
        });
        const out: Record<string, unknown>[] = [];
        const picked: string[] = [];
        const total = Object.keys(clusters).length;
        for (const k3 of Object.keys(clusters).sort(() => 0.5 - Math.random())) {
            if (out.length >= count) break;
            out.push(...clusters[k3]);
            picked.push(k3);
        }
        return { data: out, metadata: { clustersPicked: picked, totalClusters: total } };
    }
    return { data: [], metadata: {} };
};


// ─── Main component ───────────────────────────────────────────────────────────

export const Exp3Sampling = () => {
    const { dataset, selectedColumns } = useLabStore();
    const [sampleSize, setSampleSize] = useState(20);
    const [samplingMethod, setSamplingMethod] = useState("random");
    const [sampleResults, setSampleResults] = useState<Record<string, unknown>[]>([]);
    const [activeMetadata, setActiveMetadata] = useState<SamplingMetadata | null>(null);
    const [statColumn, setStatColumn] = useState<string>("");
    const [strataColumn, setStrataColumn] = useState<string>("");
    const [allMethodStats, setAllMethodStats] = useState<MethodStats[]>([]);

    // Sync column selections with available headers
    React.useEffect(() => {
        if (selectedColumns.length > 0) {
            if (!statColumn || !selectedColumns.includes(statColumn)) setStatColumn(selectedColumns[0]);
            if (!strataColumn || !selectedColumns.includes(strataColumn)) setStrataColumn(selectedColumns[0]);
        }
    }, [selectedColumns, dataset]);

    const popStats = useMemo(() => {
        if (!dataset || !statColumn) return null;
        const rawVals = dataset.map(row => row[statColumn]).filter(v => v !== null && v !== undefined && v !== "");
        const numericVals = rawVals.map(v => Number(v)).filter(v => !isNaN(v));
        const isNumeric = numericVals.length === rawVals.length;
        return {
            mean: isNumeric ? calcMean(numericVals) : null,
            median: isNumeric ? calcMedian(numericVals) : null,
            modeResult: calcMode(rawVals as (string | number)[]),
            isNumeric,
            n: rawVals.length
        };
    }, [dataset, statColumn]);

    const sampleStats = useMemo(() => {
        if (!sampleResults.length || !statColumn) return null;
        const rawVals = sampleResults.map(row => row[statColumn]).filter(v => v !== null && v !== undefined && v !== "");
        const numericVals = rawVals.map(v => Number(v)).filter(v => !isNaN(v));
        if (!numericVals.length) return null;
        const n = numericVals.length;
        const mean = numericVals.reduce((s, v) => s + v, 0) / n;

        // Return null/0 for SD if n < 2 to avoid NaN
        const variance = n > 1
            ? numericVals.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1)
            : 0;
        const sd = Math.sqrt(variance);

        return {
            mean: +mean.toFixed(4),
            sd: +sd.toFixed(4),
            se: n > 0 ? +(sd / Math.sqrt(n)).toFixed(4) : 0,
            n
        };
    }, [sampleResults, statColumn]);

    const runSampling = useCallback(() => {
        if (!dataset) return;
        const count = Math.max(1, Math.floor((sampleSize / 100) * dataset.length));

        // Pass the correct column for methods that need it
        const configCols = (samplingMethod === 'stratified' || samplingMethod === 'cluster')
            ? [strataColumn, ...selectedColumns.filter(c => c !== strataColumn)]
            : selectedColumns;

        const { data: sampledData, metadata } = drawSample(samplingMethod, dataset, count, configCols);
        setSampleResults(sampledData);
        setActiveMetadata(metadata);

        const stats: MethodStats[] = [];
        for (const m of ["random", "stratified", "systematic", "cluster"]) {
            const { data: s } = drawSample(m, dataset, count, configCols);
            const numVals = s.map(r => Number(r[statColumn])).filter(v => !isNaN(v) && v !== null);
            if (numVals.length >= 1) {
                const n = numVals.length;
                const mean = numVals.reduce((a, v) => a + v, 0) / n;
                const variance = n > 1 ? numVals.reduce((a, v) => a + (v - mean) ** 2, 0) / (n - 1) : 0;
                const sd = Math.sqrt(variance);
                stats.push({ method: m, label: METHOD_LABELS[m], n, mean: +mean.toFixed(4), sd: +sd.toFixed(4), se: +(sd / Math.sqrt(n)).toFixed(4) });
            }
        }
        setAllMethodStats(stats);
        toast.success(`Generated ${sampledData.length} samples via ${samplingMethod}`);
    }, [dataset, sampleSize, samplingMethod, selectedColumns, statColumn, strataColumn]);

    if (!dataset) return null;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Card className="border-none bg-white/40 dark:bg-slate-900/40 backdrop-blur-md shadow-lg">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-xl font-black bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Population Statistics</CardTitle>
                            <CardDescription>Metrics for the full dataset</CardDescription>
                        </div>
                        <div className="space-y-4">
                            <Label>Population Variable (Metrics)</Label>
                            <Select value={statColumn} onValueChange={val => setStatColumn(val ?? "")}>
                                <SelectTrigger className="h-12 bg-white dark:bg-slate-800 rounded-xl shadow-sm w-full sm:w-64">
                                    <SelectValue placeholder="Select variable" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {selectedColumns.map(h => <SelectItem key={h} value={h} className="rounded-lg">{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatCard label="Population Mean (μ)" value={popStats?.mean != null ? String(popStats.mean) : null} sub={popStats?.isNumeric ? `n = ${popStats.n}` : "Numeric required"} icon={<TrendingUp className="h-5 w-5" />} color="border-blue-200/60" />
                        <StatCard label="Population Median" value={popStats?.median != null ? String(popStats.median) : null} sub={popStats?.isNumeric ? "Middle value" : "Numeric required"} icon={<Minus className="h-5 w-5" />} color="border-violet-200/60" />
                        <StatCard label="Population Mode" value={popStats?.modeResult?.values.join(", ") || null} sub={popStats?.modeResult ? `Freq: ${popStats.modeResult.freq}` : undefined} icon={<Hash className="h-5 w-5" />} color="border-emerald-200/60" />
                    </div>
                </CardContent>
            </Card>

            {sampleStats && (
                <Card className="border-none bg-gradient-to-br from-primary/5 to-primary/0 border border-primary/10 backdrop-blur-md shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-xl font-black">Sample Statistics <span className="text-[10px] font-black uppercase bg-primary/10 px-2.5 py-1 rounded-full ml-2">n = {sampleStats.n}</span></CardTitle>
                        <CardDescription>Computed via {METHOD_LABELS[samplingMethod]} on {statColumn}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <StatCard label="Sample Mean (x̄)" value={String(sampleStats.mean)} sub={`Pop μ: ${popStats?.mean ?? "—"}`} icon={<TrendingUp className="h-5 w-5" />} color="border-primary/30" />
                            <StatCard label="Sample Std Dev (s)" value={String(sampleStats.sd)} sub="Bessel's correction" icon={<Minus className="h-5 w-5" />} color="border-amber-300/50" />
                            <StatCard label="Standard Error (SE)" value={String(sampleStats.se)} sub="SE = s / √n" icon={<Hash className="h-5 w-5" />} color="border-rose-300/50" />
                        </div>
                    </CardContent>
                </Card>
            )}

            {allMethodStats.length > 0 && (
                <Card className="border-none bg-white/50 dark:bg-slate-900/50 backdrop-blur-md shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-xl font-black">Comparison</CardTitle>
                        <CardDescription>SE comparison across all methods</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader><TableRow><TableHead>Method</TableHead><TableHead className="text-right">n</TableHead><TableHead className="text-right">Mean</TableHead><TableHead className="text-right">SE</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {allMethodStats.map(row => (
                                    <TableRow key={row.method} className={row.method === samplingMethod ? "bg-primary/5" : ""}>
                                        <TableCell><span className="font-bold">{row.label}</span></TableCell>
                                        <TableCell className="text-right">{row.n}</TableCell>
                                        <TableCell className="text-right">{row.mean}</TableCell>
                                        <TableCell className="text-right font-black">{row.se}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <Card className="lg:col-span-1 border-none bg-white/40 dark:bg-slate-900/40 backdrop-blur-md shadow-lg h-fit">
                    <CardHeader><CardTitle className="text-lg">Configuration</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-3">
                            <Label>Sample Size ({sampleSize}%)</Label>
                            <Slider
                                value={[sampleSize]}
                                onValueChange={val => setSampleSize(Array.isArray(val) ? val[0] : val)}
                                max={100}
                                min={5}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Technique</Label>
                            <Select value={samplingMethod} onValueChange={val => setSamplingMethod(val ?? "random")}>
                                <SelectTrigger className="h-12 bg-white dark:bg-slate-800 rounded-xl"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="random" className="rounded-lg">Simple Random</SelectItem>
                                    <SelectItem value="stratified" className="rounded-lg">Stratified</SelectItem>
                                    <SelectItem value="systematic" className="rounded-lg">Systematic</SelectItem>
                                    <SelectItem value="cluster" className="rounded-lg">Cluster</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {(samplingMethod === "stratified" || samplingMethod === "cluster") && (
                            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                                <Label>{samplingMethod === "stratified" ? "Strata Column" : "Cluster Column"}</Label>
                                <Select value={strataColumn} onValueChange={val => setStrataColumn(val ?? "")}>
                                    <SelectTrigger className="h-11 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                                        <SelectValue placeholder="Select column" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {selectedColumns.map(h => <SelectItem key={h} value={h} className="rounded-lg">{h}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <p className="text-[10px] text-muted-foreground italic">Groups data by unique values in this column for {samplingMethod} logic.</p>
                            </div>
                        )}

                        <Button
                            onClick={runSampling}
                            disabled={!statColumn || ((samplingMethod === "stratified" || samplingMethod === "cluster") && !strataColumn)}
                            className="w-full h-12 rounded-xl shadow-md hover:shadow-lg transition-all"
                        >
                            <RefreshCcw className="h-4 w-4 mr-2" />
                            Draw Sample
                        </Button>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-3 border-none bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-2xl overflow-hidden min-h-[400px]">
                    <CardHeader className="flex flex-row items-center justify-between border-b">
                        <CardTitle className="text-2xl font-black">Sample Output</CardTitle>
                        <div className="bg-primary/10 px-3 py-1 rounded-lg text-sm font-bold">{sampleResults.length} rows</div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {sampleResults.length > 0 ? (
                            <div className="flex flex-col">
                                <div className="p-6 bg-primary/5 border-b space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Wand2 className="h-4 w-4 text-primary" />
                                        <span className="text-xs font-black text-primary uppercase tracking-[0.2em]">Selection Methodology Detail</span>
                                    </div>
                                    <div className="text-sm">
                                        {samplingMethod === "random" && activeMetadata?.indices && (
                                            <div className="space-y-2">
                                                <p className="text-muted-foreground font-medium italic">Random number generator picked the following specific row indices:</p>
                                                <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                                                    {activeMetadata.indices.map(idx => (
                                                        <span key={idx} className="px-2 py-0.5 bg-white rounded border border-primary/20">{idx}</span>
                                                    ))}
                                                    <span className="opacity-50">...and others</span>
                                                </div>
                                            </div>
                                        )}
                                        {samplingMethod === "stratified" && activeMetadata?.strata && (
                                            <div className="space-y-3">
                                                <p className="text-muted-foreground font-medium italic">Data was partitioned by "{strataColumn}". Proportional allocation resulted in:</p>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                    {Object.entries(activeMetadata.strata).slice(0, 12).map(([n, c]) => (
                                                        <div key={n} className="p-3 bg-white rounded-2xl border border-primary/10 shadow-sm flex justify-between items-center">
                                                            <div className="text-[10px] truncate max-w-[80px] font-black uppercase text-muted-foreground">{n}</div>
                                                            <div className="font-black text-primary">n={c}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {samplingMethod === "systematic" && (
                                            <div className="p-4 rounded-2xl bg-white border border-primary/10 shadow-sm flex items-center gap-8">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Interval (k)</p>
                                                    <p className="text-2xl font-black text-primary">Every {activeMetadata?.k}-th row</p>
                                                </div>
                                                <div className="h-10 w-px bg-muted" />
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Random Start</p>
                                                    <p className="text-2xl font-black text-primary">Row #{activeMetadata?.start}</p>
                                                </div>
                                            </div>
                                        )}
                                        {samplingMethod === "cluster" && activeMetadata?.clustersPicked && (
                                            <div className="space-y-3">
                                                <p className="text-muted-foreground font-medium italic">Selected {activeMetadata.clustersPicked.length} intact clusters from {activeMetadata.totalClusters} total groups in "{strataColumn}":</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {activeMetadata.clustersPicked.map(c => (
                                                        <span key={c} className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase rounded-lg border border-primary/20">{c}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <ScrollArea className="w-full h-[400px]">
                                    <Table>
                                        <TableHeader><TableRow>{selectedColumns.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
                                        <TableBody>
                                            {sampleResults.slice(0, 15).map((row, i) => (
                                                <TableRow key={i}>{selectedColumns.map(h => <TableCell key={h}>{String(row[h] ?? "")}</TableCell>)}</TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    <ScrollBar orientation="horizontal" />
                                </ScrollArea>
                            </div>
                        ) : (
                            <div className="p-20 text-center text-muted-foreground">Select parameters and draw to see results.</div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
