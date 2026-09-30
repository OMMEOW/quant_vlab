"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useLabStore } from "@/store/useLabStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
    AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Activity, Database, CheckCircle2, XCircle, RefreshCcw } from "lucide-react";
import * as ss from "simple-statistics";
import jStat from "jstat";

// ─── Sampling helper (same as Mod 3) ─────────────────────────────────────────

const drawSample = (
    method: string,
    dataset: Record<string, unknown>[],
    count: number,
    headers: string[]
): Record<string, unknown>[] => {
    if (method === "random") {
        return [...dataset].sort(() => 0.5 - Math.random()).slice(0, count);
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
        Object.values(strata).forEach(items => {
            const n = Math.max(1, Math.round((count / dataset.length) * items.length));
            out.push(...[...items].sort(() => 0.5 - Math.random()).slice(0, n));
        });
        return out.slice(0, count);
    }
    if (method === "systematic") {
        const k = Math.max(1, Math.floor(dataset.length / count));
        const start = Math.floor(Math.random() * k);
        const out: Record<string, unknown>[] = [];
        for (let i = start; i < dataset.length && out.length < count; i += k) out.push(dataset[i]);
        return out;
    }
    if (method === "cluster") {
        const key = headers[0];
        const clusters: Record<string, Record<string, unknown>[]> = {};
        dataset.forEach(row => {
            const k = row[key]?.toString() || "Unknown";
            if (!clusters[k]) clusters[k] = [];
            clusters[k].push(row);
        });
        const out: Record<string, unknown>[] = [];
        for (const k of Object.keys(clusters).sort(() => 0.5 - Math.random())) {
            if (out.length >= count) break;
            out.push(...clusters[k]);
        }
        return out.slice(0, count);
    }
    return [];
};

const METHOD_LABELS: Record<string, string> = {
    random: "Simple Random (SRS)",
    stratified: "Stratified",
    systematic: "Systematic (Every k-th)",
    cluster: "Cluster",
};

// ─── Main component ───────────────────────────────────────────────────────────

export const Exp8TTest = () => {
    const { dataset, selectedColumns } = useLabStore();
    const [selectedVar, setSelectedVar] = useState<string>("");
    const [mu0, setMu0] = useState<string>("0");
    const [alpha, setAlpha] = useState<string>("0.05");
    const [sampleSize, setSampleSize] = useState<number>(20);
    const [samplingMethod, setSamplingMethod] = useState<string>("random");
    // Drawn sample — null means "use full dataset", array means sampled
    const [drawnSample, setDrawnSample] = useState<Record<string, unknown>[] | null>(null);
    const [sampleKey, setSampleKey] = useState(0); // bump to force re-draw UI

    const numericalHeaders = useMemo(() => {
        if (!dataset) return [];
        return selectedColumns.filter(h => {
            const sample = dataset.slice(0, 20).map(r => r[h]).filter(v => v !== null && v !== undefined && v !== "");
            return sample.length > 0 && sample.every(v => !isNaN(Number(v)));
        });
    }, [dataset, selectedColumns]);

    // Draw sample on button click
    const handleDraw = useCallback(() => {
        if (!dataset) return;
        const count = Math.min(sampleSize, 30, dataset.length);
        const s = drawSample(samplingMethod, dataset, count, selectedColumns);
        setDrawnSample(s);
        setSampleKey(k => k + 1);
    }, [dataset, selectedColumns, sampleSize, samplingMethod]);

    // T-test runs on the drawn sample
    const tTestResults = useMemo(() => {
        if (!selectedVar) return null;
        const source = drawnSample ?? dataset;
        if (!source || source.length < 2) return null;

        const values = source
            .map(r => Number(r[selectedVar]))
            .filter(v => !isNaN(v));
        if (values.length < 2) return null;

        const n = values.length;
        const xBar = ss.mean(values);
        const s = ss.standardDeviation(values);
        const se = s / Math.sqrt(n);
        const hypMu = parseFloat(mu0) || 0;
        const sigLevel = parseFloat(alpha) || 0.05;

        const tStat = (xBar - hypMu) / se;
        const df = n - 1;

        const pVal = 2 * (1 - (jStat.studentt.cdf(Math.abs(tStat), df) as number));
        const rejected = pVal < sigLevel;
        const tCrit = jStat.studentt.inv(1 - sigLevel / 2, df) as number;

        const ciLow = xBar - tCrit * se;
        const ciHigh = xBar + tCrit * se;

        const curveData: { x: number; y: number; tailY?: number }[] = [];
        for (let i = -45; i <= 45; i++) {
            const xVal = i / 10;
            const yVal = jStat.studentt.pdf(xVal, df) as number;
            const result: { x: number; y: number; tailY?: number } = { x: xVal, y: yVal };

            // If x is in the rejection region (outside ±t_crit), set tailY
            if (xVal <= -tCrit || xVal >= tCrit) {
                result.tailY = yVal;
            }

            curveData.push(result);
        }

        return {
            tStat: tStat.toFixed(4),
            tStatNum: tStat,
            pVal: pVal.toFixed(6),
            rejected,
            xBar: xBar.toFixed(4),
            s: s.toFixed(4),
            se: se.toFixed(4),
            n,
            df,
            tCrit: tCrit.toFixed(4),
            tCritNum: tCrit,
            ciLow: ciLow.toFixed(4),
            ciHigh: ciHigh.toFixed(4),
            curveData,
            method: METHOD_LABELS[samplingMethod],
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedVar, drawnSample, dataset, mu0, alpha, sampleKey]);

    if (!dataset) return null;

    const effectiveSampleSize = Math.min(sampleSize, 30, dataset.length);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* ── Config Panel ── */}
                <Card className="lg:col-span-1 border-none bg-white/40 dark:bg-slate-900/40 backdrop-blur-md shadow-lg h-fit">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Activity className="h-4 w-4 text-primary" />
                            Hypothesis Config
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {/* Variable */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Test Variable</Label>
                            <Select value={selectedVar} onValueChange={val => setSelectedVar(val || "")}>
                                <SelectTrigger className="h-12 bg-white dark:bg-slate-800 rounded-xl">
                                    <SelectValue placeholder="Select Variable" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {numericalHeaders.map(h => <SelectItem key={h} value={h} className="rounded-lg">{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Sampling technique */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Sampling Technique</Label>
                            <Select value={samplingMethod} onValueChange={val => setSamplingMethod(val || "random")}>
                                <SelectTrigger className="h-12 bg-white dark:bg-slate-800 rounded-xl">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="random" className="rounded-lg">Simple Random (SRS)</SelectItem>
                                    <SelectItem value="stratified" className="rounded-lg">Stratified</SelectItem>
                                    <SelectItem value="systematic" className="rounded-lg">Systematic (Every k-th)</SelectItem>
                                    <SelectItem value="cluster" className="rounded-lg">Cluster</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Sample size slider — max 30 */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Sample Size</Label>
                                <span className="text-xs text-muted-foreground font-medium">max 30</span>
                            </div>
                            <Slider
                                value={[sampleSize]}
                                onValueChange={val => setSampleSize(Array.isArray(val) ? val[0] : val)}
                                min={2} max={30} step={1}
                                className="cursor-pointer"
                            />
                            <div className="flex items-center justify-between">
                                <span className="text-2xl font-black text-primary">{effectiveSampleSize}</span>
                                <span className="text-xs text-muted-foreground">observations</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground space-y-1">
                                <p>n ≤ 30: T-test is appropriate.</p>
                                <p>For n greater than 30, use Z-test (mod 9).</p>
                            </div>
                        </div>

                        {/* Draw sample button */}
                        <Button
                            onClick={handleDraw}
                            className="w-full h-12 rounded-2xl font-bold shadow-md shadow-primary/20 flex items-center gap-2"
                        >
                            <RefreshCcw className="h-4 w-4" />
                            Draw Sample
                        </Button>

                        {drawnSample && (
                            <p className="text-[10px] text-center text-muted-foreground">
                                Sample drawn: <span className="font-bold text-primary">{drawnSample.length} rows</span> via {METHOD_LABELS[samplingMethod]}
                            </p>
                        )}

                        {/* Hypothesis params */}
                        <div className="space-y-2 pt-2 border-t border-muted">
                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Hypothesized Mean (μ₀)</Label>
                            <Input
                                type="number"
                                value={mu0}
                                onChange={e => setMu0(e.target.value)}
                                className="h-12 bg-white dark:bg-slate-800 rounded-xl"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Significance (α)</Label>
                            <Select value={alpha} onValueChange={val => setAlpha(val || "0.05")}>
                                <SelectTrigger className="h-12 bg-white dark:bg-slate-800 rounded-xl">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="0.01" className="rounded-lg">0.01 (99% Conf)</SelectItem>
                                    <SelectItem value="0.05" className="rounded-lg">0.05 (95% Conf)</SelectItem>
                                    <SelectItem value="0.10" className="rounded-lg">0.10 (90% Conf)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Sample summary pills */}
                        {tTestResults && (
                            <div className="pt-2 space-y-2 border-t border-muted">
                                <Label className="text-[10px] font-black uppercase text-primary tracking-widest">Sample Summary</Label>
                                {[
                                    ["n", tTestResults.n],
                                    ["x̄", tTestResults.xBar],
                                    ["s", tTestResults.s],
                                    ["SE", tTestResults.se],
                                    ["df", tTestResults.df],
                                    ["t-crit (±)", tTestResults.tCrit],
                                ].map(([k, v]) => (
                                    <div key={String(k)} className="flex justify-between items-center p-3 rounded-xl bg-primary/5 border border-primary/10">
                                        <span className="text-xs font-bold text-muted-foreground">{k}</span>
                                        <span className="text-sm font-black text-primary tabular-nums">{v}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ── Results Panel ── */}
                <Card className="lg:col-span-3 border-none bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-2xl overflow-hidden min-h-[550px]">
                    <CardHeader className="flex flex-row items-center justify-between pb-8">
                        <div>
                            <CardTitle className="text-2xl font-black bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                One-Sample T-Test
                            </CardTitle>
                            <CardDescription>
                                H₀: μ = {mu0} &nbsp;·&nbsp; H₁: μ ≠ {mu0} &nbsp;·&nbsp; Two-tailed &nbsp;·&nbsp; α = {alpha}
                                {drawnSample && (
                                    <span className="ml-2 text-primary font-semibold">
                                        · {drawnSample.length} obs via {METHOD_LABELS[samplingMethod]}
                                    </span>
                                )}
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        {tTestResults ? (
                            <>
                                {/* Key stats */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="p-6 rounded-[2rem] bg-slate-900 text-slate-100 shadow-xl border border-slate-700/50">
                                        <div className="text-[10px] font-black uppercase text-slate-400 mb-1">t-Statistic</div>
                                        <div className="text-4xl font-black tracking-tighter tabular-nums">{tTestResults.tStat}</div>
                                        <div className="text-[10px] text-slate-500 mt-2">Critical ±{tTestResults.tCrit}</div>
                                    </div>
                                    <div className="p-6 rounded-[2rem] bg-white dark:bg-slate-800 shadow-lg border border-border/40">
                                        <div className="text-[10px] font-black uppercase text-muted-foreground mb-1">p-Value (two-tailed)</div>
                                        <div className="text-4xl font-black tracking-tighter tabular-nums">{tTestResults.pVal}</div>
                                        <div className="text-[10px] text-muted-foreground mt-2">α = {alpha}</div>
                                    </div>
                                    <div className={`p-6 rounded-[2rem] shadow-lg border animate-in zoom-in duration-300 ${tTestResults.rejected
                                            ? "bg-red-50 dark:bg-red-950/30 border-red-200"
                                            : "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200"
                                        }`}>
                                        <div className={`flex items-center gap-2 mb-2 font-black uppercase text-[10px] ${tTestResults.rejected ? "text-red-700" : "text-emerald-700"
                                            }`}>
                                            {tTestResults.rejected ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                                            Decision
                                        </div>
                                        <div className={`text-xl font-black tracking-tight ${tTestResults.rejected ? "text-red-700" : "text-emerald-700"
                                            }`}>
                                            {tTestResults.rejected ? "Reject H₀" : "Accept H₀"}
                                        </div>
                                        <p className="text-[10px] mt-2 opacity-80 leading-tight">
                                            {tTestResults.rejected
                                                ? `p = ${tTestResults.pVal} < α (${alpha}). Statistically significant.`
                                                : `p = ${tTestResults.pVal} ≥ α (${alpha}). Insufficient evidence.`}
                                        </p>
                                    </div>
                                </div>

                                {/* Confidence Interval */}
                                <div className="p-5 rounded-2xl bg-primary/5 border border-primary/15">
                                    <div className="text-[10px] font-black uppercase text-primary tracking-widest mb-2">
                                        {Math.round((1 - parseFloat(alpha)) * 100)}% Confidence Interval for μ
                                    </div>
                                    <div className="text-2xl font-black tabular-nums text-foreground">
                                        [{tTestResults.ciLow}, {tTestResults.ciHigh}]
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {parseFloat(mu0) >= parseFloat(tTestResults.ciLow) && parseFloat(mu0) <= parseFloat(tTestResults.ciHigh)
                                            ? `μ₀ = ${mu0} lies within this interval → consistent with H₀`
                                            : `μ₀ = ${mu0} falls outside this interval → inconsistent with H₀`}
                                    </p>
                                </div>

                                {/* T-distribution curve */}
                                <div>
                                    <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-3">
                                        t-Distribution (df = {tTestResults.df}) with Critical Regions
                                    </div>
                                    <div className="h-[230px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={tTestResults.curveData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="tDist" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="rejectedGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.1)" />
                                                <XAxis
                                                    dataKey="x" type="number" domain={[-4.5, 4.5]}
                                                    tickFormatter={(v: number) => v.toFixed(1)}
                                                    fontSize={10} axisLine={false} tickLine={false}
                                                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                                                />
                                                <YAxis hide />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: "14px", border: "none", background: "rgba(255,255,255,0.95)", fontSize: 11 }}
                                                    formatter={(v: any, name: any) => [
                                                        (v as number).toFixed(4),
                                                        name === "tailY" ? "Rejected Area" : "Density"
                                                    ]}
                                                    labelFormatter={(x: any) => `t = ${Number(x).toFixed(2)}`}
                                                />
                                                {/* Main distribution area */}
                                                <Area type="monotone" dataKey="y" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#tDist)" connectNulls={true} />

                                                {/* Rejection regions (tails) */}
                                                <Area type="monotone" dataKey="tailY" stroke="#ef4444" strokeWidth={0} fill="url(#rejectedGrad)" connectNulls={false} />

                                                <ReferenceLine
                                                    x={tTestResults.tCritNum}
                                                    stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 4"
                                                    label={{ value: "Endpoint", position: "insideTopRight", fontSize: 9, fill: "#ef4444", fontWeight: "bold" }}
                                                />
                                                <ReferenceLine
                                                    x={-tTestResults.tCritNum}
                                                    stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 4"
                                                    label={{ value: "Endpoint", position: "insideTopLeft", fontSize: 9, fill: "#ef4444", fontWeight: "bold" }}
                                                />
                                                <ReferenceLine
                                                    x={tTestResults.tStatNum}
                                                    stroke={tTestResults.rejected ? "#dc2626" : "#16a34a"}
                                                    strokeWidth={2.5}
                                                    label={{
                                                        value: `t=${tTestResults.tStat}`,
                                                        position: "top",
                                                        fontSize: 11, fontWeight: "900",
                                                        fill: tTestResults.rejected ? "#dc2626" : "#16a34a",
                                                    }}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="h-[400px] flex flex-col items-center justify-center text-center space-y-6">
                                <div className="p-8 bg-primary/5 rounded-full text-primary/20">
                                    <Database className="h-16 w-16" />
                                </div>
                                <h4 className="text-xl font-bold">Inference Not Started</h4>
                                <p className="text-sm text-muted-foreground max-w-xs">
                                    Select a variable, draw a sample (n ≤ 30), and set your hypothesis parameters.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
