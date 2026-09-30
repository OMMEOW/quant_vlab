"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
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
import { Activity, Target, CheckCircle2, XCircle, RefreshCcw, Info, Database } from "lucide-react";
import * as ss from "simple-statistics";
import jStat from "jstat";

// ─── Sampling helper (same as Mod 3/8) ─────────────────────────────────────────

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

export const Exp9ZTest = () => {
    const { dataset, selectedColumns } = useLabStore();
    const [selectedVar, setSelectedVar] = useState<string>("");
    const [mu0, setMu0] = useState<string>("0");
    const [popSigma, setPopSigma] = useState<string>("");
    const [alpha, setAlpha] = useState<string>("0.05");
    const [sampleSize, setSampleSize] = useState<number>(30); // Default to 30 for Z-test
    const [samplingMethod, setSamplingMethod] = useState<string>("random");
    const [drawnSample, setDrawnSample] = useState<Record<string, unknown>[] | null>(null);
    const [sampleKey, setSampleKey] = useState(0);

    const numericalHeaders = useMemo(() => {
        if (!dataset) return [];
        return selectedColumns.filter(h => {
            const sample = dataset.slice(0, 20).map(r => r[h]).filter(v => v !== null && v !== undefined && v !== "");
            return sample.length > 0 && sample.every(v => !isNaN(Number(v)));
        });
    }, [dataset, selectedColumns]);

    // Autofill Population SD when variable changes
    useEffect(() => {
        if (selectedVar && dataset) {
            const values = dataset.map(r => Number(r[selectedVar])).filter(v => !isNaN(v));
            if (values.length > 1) {
                const sd = ss.standardDeviation(values);
                setPopSigma(sd.toFixed(4));
            }
        }
    }, [selectedVar, dataset]);

    const handleDraw = useCallback(() => {
        if (!dataset) return;
        const count = Math.min(dataset.length, sampleSize);
        const s = drawSample(samplingMethod, dataset, count, selectedColumns);
        setDrawnSample(s);
        setSampleKey(k => k + 1);
    }, [dataset, selectedColumns, sampleSize, samplingMethod]);

    const zTestResults = useMemo(() => {
        if (!selectedVar || !popSigma) return null;
        const source = drawnSample ?? dataset;
        if (!source) return null;

        const values = source.map(r => Number(r[selectedVar])).filter(v => !isNaN(v));
        if (values.length < 2) return null;

        const n = values.length;
        const xBar = ss.mean(values);
        const sigma = parseFloat(popSigma) || 1;
        const hypMu = parseFloat(mu0) || 0;
        const sigLevel = parseFloat(alpha) || 0.05;

        // SE for Z-test uses population sigma
        const se = sigma / Math.sqrt(n);
        const zStat = (xBar - hypMu) / se;
        
        // Two-tailed p-value
        const pVal = 2 * (1 - (jStat.normal.cdf(Math.abs(zStat), 0, 1) as number));
        const rejected = pVal < sigLevel;

        // Critical value at alpha/2
        const zCrit = jStat.normal.inv(1 - sigLevel / 2, 0, 1) as number;

        // Confidence Interval
        const ciLow = xBar - zCrit * se;
        const ciHigh = xBar + zCrit * se;

        // Curve Data for Standard Normal (0,1)
        const curveData: { x: number; y: number; tailY?: number }[] = [];
        for (let i = -45; i <= 45; i++) {
            const xVal = i / 10;
            const yVal = jStat.normal.pdf(xVal, 0, 1) as number;
            const res: { x: number; y: number; tailY?: number } = { x: xVal, y: yVal };
            
            // Rejection regions
            if (xVal <= -zCrit || xVal >= zCrit) {
                res.tailY = yVal;
            }
            curveData.push(res);
        }

        return {
            zStat: zStat.toFixed(4),
            zStatNum: zStat,
            pVal: pVal.toFixed(6),
            rejected,
            xBar: xBar.toFixed(4),
            sigma: sigma.toFixed(4),
            n,
            zCrit: zCrit.toFixed(4),
            zCritNum: zCrit,
            ciLow: ciLow.toFixed(4),
            ciHigh: ciHigh.toFixed(4),
            curveData,
            method: METHOD_LABELS[samplingMethod],
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedVar, drawnSample, dataset, mu0, popSigma, alpha, sampleKey]);

    if (!dataset) return null;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* ── Config Panel ── */}
                <Card className="lg:col-span-1 border-none bg-white/40 dark:bg-slate-900/40 backdrop-blur-md shadow-lg h-fit">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                             <Activity className="h-4 w-4 text-primary" />
                             Z-Inference Setup
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Test Variable</Label>
                            <Select value={selectedVar} onValueChange={(v) => setSelectedVar(v || "")}>
                                <SelectTrigger className="h-12 bg-white dark:bg-slate-800 rounded-xl">
                                    <SelectValue placeholder="Select Variable" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {numericalHeaders.map(h => <SelectItem key={h} value={h} className="rounded-lg">{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Sampling controls */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Sampling Method</Label>
                            <Select value={samplingMethod} onValueChange={(v) => setSamplingMethod(v || "random")}>
                                <SelectTrigger className="h-12 bg-white dark:bg-slate-800 rounded-xl">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="random" className="rounded-lg">Simple Random</SelectItem>
                                    <SelectItem value="stratified" className="rounded-lg">Stratified</SelectItem>
                                    <SelectItem value="systematic" className="rounded-lg">Systematic</SelectItem>
                                    <SelectItem value="cluster" className="rounded-lg">Cluster</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Sample Size (n)</Label>
                                <span className="text-xs font-bold text-primary">{sampleSize}</span>
                            </div>
                            <Slider
                                value={[sampleSize]}
                                onValueChange={val => setSampleSize(Array.isArray(val) ? val[0] : val)}
                                min={30}
                                max={Math.min(dataset.length, 200)}
                                step={1}
                                className="py-2"
                            />
                            <div className="text-[9px] text-muted-foreground leading-tight italic space-y-1">
                                <p>* Z-tests are designed for large samples (n ≥ 30).</p>
                                <p>Current range: 30 to {Math.min(dataset.length, 200)}.</p>
                            </div>
                        </div>

                        <Button onClick={handleDraw} className="w-full h-11 rounded-xl font-bold shadow-md shadow-primary/10 flex items-center gap-2">
                            <RefreshCcw className="h-4 w-4 font-bold" />
                            Draw Z-Sample
                        </Button>

                         <div className="space-y-2 pt-2 border-t border-muted">
                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Population σ (Autofilled)</Label>
                            <div className="relative">
                                <Input 
                                    type="number" 
                                    value={popSigma} 
                                    onChange={(e) => setPopSigma(e.target.value)} 
                                    className="h-12 bg-white dark:bg-slate-800 rounded-xl pr-10"
                                    placeholder="σ calculated from data"
                                />
                                <Database className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40 pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Hypothesized Mean (μ₀)</Label>
                            <Input 
                                type="number" 
                                value={mu0} 
                                onChange={(e) => setMu0(e.target.value)} 
                                className="h-12 bg-white dark:bg-slate-800 rounded-xl"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Alpha (α)</Label>
                            <Select value={alpha} onValueChange={(v) => setAlpha(v || "0.05")}>
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
                    </CardContent>
                </Card>

                {/* ── Results Panel ── */}
                <Card className="lg:col-span-3 border-none bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-2xl overflow-hidden min-h-[550px]">
                    <CardHeader className="flex flex-row items-center justify-between pb-8">
                        <div>
                            <CardTitle className="text-2xl font-black bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">One-Sample Z-Test</CardTitle>
                            <CardDescription>
                                Testing H₀: μ = {mu0} vs H₁: μ ≠ {mu0} · Known σ = {popSigma}
                                {drawnSample && <span className="ml-2 font-semibold text-primary">· Sample drawn via {METHOD_LABELS[samplingMethod]}</span>}
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        {zTestResults ? (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                     <div className="p-8 rounded-[3rem] bg-slate-900 text-slate-100 shadow-2xl border border-slate-700/50 flex flex-col justify-center">
                                         <div className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">z-Statistic</div>
                                         <div className="text-5xl font-black tracking-tight tabular-nums">{zTestResults.zStat}</div>
                                         <div className="text-[10px] text-slate-500 mt-2 italic font-medium">Critical range: ±{zTestResults.zCrit}</div>
                                    </div>
                                    <div className="p-8 rounded-[3rem] bg-white dark:bg-slate-800 shadow-lg border border-border/40 flex flex-col justify-center">
                                         <div className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest">p-Value</div>
                                         <div className="text-5xl font-black tracking-tight tabular-nums">{zTestResults.pVal}</div>
                                         <div className="text-[10px] text-muted-foreground mt-2 italic font-medium">Alpha ({alpha}) threshold</div>
                                    </div>
                                     <div className={`p-8 rounded-[3rem] shadow-xl border animate-in zoom-in duration-500 flex flex-col justify-center ${zTestResults.rejected ? 'bg-red-50 dark:bg-red-950/30 border-red-200' : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200'}`}>
                                         <div className={`flex items-center gap-2 mb-2 font-black uppercase text-[10px] ${zTestResults.rejected ? 'text-red-700' : 'text-emerald-700'}`}>
                                            {zTestResults.rejected ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                                            Decision
                                         </div>
                                         <div className={`text-2xl font-black tracking-tighter ${zTestResults.rejected ? 'text-red-700' : 'text-emerald-700'}`}>
                                            {zTestResults.rejected ? "Reject H₀" : "Accept H₀"}
                                         </div>
                                         <p className="text-[10px] mt-2 opacity-70 leading-tight">
                                            {zTestResults.rejected 
                                                ? `The result is statistically significant since p < ${alpha}.`
                                                : `Evidence is not sufficient to reject H₀ at α = ${alpha}.`}
                                         </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-6 rounded-[2rem] bg-primary/5 border border-primary/10">
                                        <div className="text-[10px] font-black uppercase text-primary tracking-widest mb-1">Confidence Interval for μ</div>
                                        <div className="text-2xl font-black tabular-nums">[{zTestResults.ciLow}, {zTestResults.ciHigh}]</div>
                                        <p className="text-[10px] text-muted-foreground mt-1">Based on {Math.round((1-parseFloat(alpha))*100)}% reliability level</p>
                                    </div>
                                    <div className="p-6 rounded-[2rem] bg-muted/30 border border-border/20">
                                        <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Sample Statistics</div>
                                        <div className="flex gap-4">
                                            <div><span className="text-[10px] block font-bold text-muted-foreground uppercase opacity-60">n</span><span className="font-bold">{zTestResults.n}</span></div>
                                            <div><span className="text-[10px] block font-bold text-muted-foreground uppercase opacity-60">x̄</span><span className="font-bold">{zTestResults.xBar}</span></div>
                                            <div><span className="text-[10px] block font-bold text-muted-foreground uppercase opacity-60">σ</span><span className="font-bold">{zTestResults.sigma}</span></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-1">
                                        <div className="text-xs font-black uppercase text-muted-foreground tracking-widest">Normal Distribution with Rejection Regions</div>
                                        <Info className="h-4 w-4 text-muted-foreground/40 cursor-help" />
                                    </div>
                                    <div className="h-[280px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={zTestResults.curveData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="normalDist" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="rejectTail" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.1)" />
                                                <XAxis 
                                                    dataKey="x" type="number" domain={[-4.5, 4.5]} 
                                                    axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 10}}
                                                />
                                                <YAxis hide />
                                                <Tooltip 
                                                    contentStyle={{ borderRadius: '16px', border: 'none', background: 'rgba(255, 255, 255, 0.95)', fontSize: 11 }}
                                                    formatter={(v: any, name: any) => [Number(v).toFixed(4), name === "tailY" ? "Rejection Area" : "Density"]}
                                                />
                                                <Area type="monotone" dataKey="y" stroke="hsl(var(--primary))" fill="url(#normalDist)" fillOpacity={1} strokeWidth={2} connectNulls={true} />
                                                <Area type="monotone" dataKey="tailY" stroke="#ef4444" fill="url(#rejectTail)" fillOpacity={1} strokeWidth={0} connectNulls={false} />
                                                
                                                <ReferenceLine 
                                                    x={zTestResults.zCritNum} stroke="#ef4444" strokeDasharray="4 4" 
                                                    label={{ position: 'top', value: 'Endpoint', fill: '#ef4444', fontSize: 9, fontWeight: 'bold' }} 
                                                />
                                                <ReferenceLine 
                                                    x={-zTestResults.zCritNum} stroke="#ef4444" strokeDasharray="4 4" 
                                                    label={{ position: 'top', value: 'Endpoint', fill: '#ef4444', fontSize: 9, fontWeight: 'bold' }} 
                                                />
                                                <ReferenceLine 
                                                    x={zTestResults.zStatNum} stroke={zTestResults.rejected ? "#dc2626" : "#16a34a"} 
                                                    strokeWidth={3} 
                                                    label={{ position: 'insideTopRight', value: `z=${zTestResults.zStat}`, fill: zTestResults.rejected ? "#dc2626" : "#16a34a", fontSize: 12, fontWeight: '900' }} 
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </>
                        ) : (
                                <div className="h-[400px] flex flex-col items-center justify-center text-center space-y-6">
                                    <div className="p-10 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400">
                                        <Target className="h-12 w-12" />
                                    </div>
                                    <h4 className="text-xl font-bold">Parameters Awaiting</h4>
                                    <p className="text-sm text-muted-foreground max-w-xs">Configuring the population standard deviation (σ) is required for a Z-Test calculation. Select a variable to autofill σ.</p>
                                </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
