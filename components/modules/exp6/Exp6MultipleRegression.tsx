"use client";

import React, { useState, useMemo } from "react";
import { useLabStore } from "@/store/useLabStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import MultivariateLinearRegression from "ml-regression-multivariate-linear";
import { Calculator, Layers, Target, ArrowRight } from "lucide-react";
import {
    ComposedChart, Scatter, Line,
    BarChart, Bar, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt4 = (n: number) => parseFloat(n.toFixed(4));

// ─── Chart tooltip style ──────────────────────────────────────────────────────

const tipStyle = {
    borderRadius: "14px",
    border: "none",
    boxShadow: "0 8px 20px -4px rgb(0 0 0 / 0.12)",
    background: "rgba(255,255,255,0.96)",
    backdropFilter: "blur(10px)",
    fontSize: 12,
};

// ─── Main component ───────────────────────────────────────────────────────────

export const Exp6MultipleRegression = () => {
    const { dataset, selectedColumns } = useLabStore();
    const [yVar, setYVar] = useState<string>("");
    const [selectedXVars, setSelectedXVars] = useState<string[]>([]);

    const numericalHeaders = useMemo(() => {
        if (!dataset) return [];
        return selectedColumns.filter(h => {
            const sample = dataset.slice(0, 10).map(r => r[h]).filter(v => v !== null && v !== undefined);
            return sample.every(v => typeof v === "number");
        });
    }, [dataset, selectedColumns]);

    const toggleXVar = (h: string) =>
        setSelectedXVars(prev => prev.includes(h) ? prev.filter(v => v !== h) : [...prev, h]);

    // ── Model computation ─────────────────────────────────────────────────────
    const modelResults = useMemo(() => {
        if (!dataset || !yVar || selectedXVars.length === 0) return null;
        try {
            const X = dataset.map(row => selectedXVars.map(x => row[x] as number));
            const Y = dataset.map(row => [row[yVar] as number]);
            const mlr = new MultivariateLinearRegression(X, Y);
            const w = mlr.weights;

            const intercept = w[w.length - 1][0];
            const slopes = selectedXVars.map((x, i) => ({ name: x, value: w[i][0] }));
            const terms = slopes.map(s => `${fmt4(s.value)} × ${s.name}`);
            const equation = `${yVar} = ${fmt4(intercept)} + ${terms.join(" + ")}`;

            // Predicted & residuals for each row
            const predictions = dataset.map(row => {
                const xRow = selectedXVars.map(x => row[x] as number);
                const pred = intercept + slopes.reduce((s, sl, i) => s + sl.value * xRow[i], 0);
                const actual = row[yVar] as number;
                return { actual, predicted: fmt4(pred), residual: fmt4(actual - pred) };
            }).filter(r => !isNaN(r.actual) && !isNaN(r.predicted));

            // R²
            const meanY = predictions.reduce((s, r) => s + r.actual, 0) / predictions.length;
            const ssTot = predictions.reduce((s, r) => s + (r.actual - meanY) ** 2, 0);
            const ssRes = predictions.reduce((s, r) => s + r.residual ** 2, 0);
            const r2 = 1 - ssRes / ssTot;

            // Actual vs Predicted points (sample max 200 for perf)
            const avpData = predictions.slice(0, 200).map(r => ({ actual: r.actual, predicted: r.predicted }));
            const minVal = Math.min(...avpData.map(p => Math.min(p.actual, p.predicted)));
            const maxVal = Math.max(...avpData.map(p => Math.max(p.actual, p.predicted)));

            // Residual vs Predicted
            const residData = predictions.slice(0, 200).map(r => ({ predicted: r.predicted, residual: r.residual }));

            // Coefficient chart
            const coefData = [
                { name: "Intercept", value: fmt4(intercept) },
                ...slopes.map(s => ({ name: s.name, value: fmt4(s.value) })),
            ];

            return {
                equation,
                intercept: fmt4(intercept),
                slopes,
                r2: fmt4(r2),
                avpData,
                diagLine: [{ actual: minVal, predicted: minVal }, { actual: maxVal, predicted: maxVal }],
                residData,
                coefData,
            };
        } catch (e) {
            console.error(e);
            return null;
        }
    }, [dataset, yVar, selectedXVars]);

    if (!dataset) return null;

    const r2Color = modelResults
        ? modelResults.r2 >= 0.7 ? "text-emerald-600"
          : modelResults.r2 >= 0.5 ? "text-amber-600"
          : "text-rose-600"
        : "";

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* ── Model Inputs Panel ── */}
                <Card className="lg:col-span-1 border-none bg-white/40 dark:bg-slate-900/40 backdrop-blur-md shadow-lg h-fit">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Layers className="h-4 w-4 text-primary" />
                            Model Inputs
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Target (Y)</Label>
                            <Select value={yVar} onValueChange={val => { setYVar(val || ""); setSelectedXVars(prev => prev.filter(x => x !== val)); }}>
                                <SelectTrigger className="h-12 bg-white dark:bg-slate-800 rounded-xl">
                                    <SelectValue placeholder="Select Target" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {numericalHeaders.map(h => <SelectItem key={h} value={h} className="rounded-lg">{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Predictors (X)</Label>
                            <ScrollArea className="h-[250px] pr-4">
                                <div className="space-y-2 pt-1">
                                    {numericalHeaders.filter(h => h !== yVar).map(h => (
                                        <button
                                            key={h}
                                            onClick={() => toggleXVar(h)}
                                            className={`w-full p-4 rounded-xl text-left transition-all duration-300 border font-bold flex items-center justify-between group ${
                                                selectedXVars.includes(h)
                                                    ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                                                    : "bg-white dark:bg-slate-800 border-border/40 text-muted-foreground hover:border-primary/50"
                                            }`}
                                        >
                                            <span className="text-sm truncate w-3/4">{h}</span>
                                            {selectedXVars.includes(h)
                                                ? <Target className="h-4 w-4" />
                                                : <div className="h-4 w-4 border-2 border-muted group-hover:border-primary rounded-full transition-colors" />}
                                        </button>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Equation & Coefficients ── */}
                <Card className="lg:col-span-3 border-none bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-2xl overflow-hidden min-h-[500px]">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-2xl font-black bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                Multi-Variable Model
                            </CardTitle>
                            <CardDescription>
                                Predicting <span className="font-semibold text-foreground">{yVar || "target"}</span> using {selectedXVars.length} predictor{selectedXVars.length !== 1 ? "s" : ""}
                            </CardDescription>
                        </div>
                        <div className="p-4 bg-primary/10 rounded-2xl">
                            <Calculator className="h-6 w-6 text-primary" />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-8 p-10">
                        {modelResults ? (
                            <>
                                {/* Equation */}
                                <div className="space-y-3 animate-in slide-in-from-top-2 duration-400">
                                    <Label className="text-xs font-black uppercase text-primary tracking-widest">Regression Equation</Label>
                                    <div className="p-8 rounded-[2rem] bg-slate-900 text-slate-100 font-mono text-base leading-relaxed shadow-2xl border border-slate-700/50 overflow-x-auto">
                                        {modelResults.equation}
                                    </div>
                                </div>

                                {/* R² + Intercept row */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-5 rounded-2xl bg-muted/30 border border-border/20 space-y-1">
                                        <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">R² Score</div>
                                        <div className={`text-4xl font-black tabular-nums ${r2Color}`}>{modelResults.r2}</div>
                                        <div className="text-xs text-muted-foreground">Variance explained</div>
                                    </div>
                                    <div className="p-5 rounded-2xl bg-muted/30 border border-border/20 space-y-1">
                                        <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Intercept (β₀)</div>
                                        <div className="text-4xl font-black tabular-nums">{modelResults.intercept}</div>
                                        <div className="text-xs text-muted-foreground">Baseline value</div>
                                    </div>
                                </div>

                                {/* Coefficient rows */}
                                <div className="space-y-3">
                                    <Label className="text-xs font-black uppercase text-muted-foreground tracking-widest">Coefficients</Label>
                                    <div className="space-y-2">
                                        {modelResults.slopes.map((s, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/20">
                                                <span className="text-sm font-bold text-muted-foreground">{s.name}</span>
                                                <div className="flex items-center gap-3">
                                                    <ArrowRight className="h-3 w-3 text-primary" />
                                                    <span className={`text-lg font-black tabular-nums ${s.value >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                                        {fmt4(s.value)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="h-[350px] flex flex-col items-center justify-center text-center space-y-6">
                                <div className="p-8 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] text-slate-400">
                                    <Layers className="h-12 w-12" />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-xl font-bold">Construct Your Model</h4>
                                    <p className="text-sm text-muted-foreground max-w-xs">
                                        Define a target variable (Y) and select one or more predictor variables (X) from the panel on the left.
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ── Diagnostic Charts (shown only when model is ready) ── */}
            {modelResults && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-600">

                    {/* 1 — Actual vs Predicted */}
                    <Card className="lg:col-span-2 border-none bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-2xl overflow-hidden">
                        <CardHeader>
                            <CardTitle className="text-lg font-black">Actual vs Predicted</CardTitle>
                            <CardDescription>Points near the diagonal line indicate accurate predictions</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[360px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                                    <defs>
                                        <linearGradient id="m6lineGrad" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground)/0.08)" />
                                    <XAxis
                                        type="number" dataKey="actual" name="Actual"
                                        fontSize={11} axisLine={false} tickLine={false}
                                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                                        label={{ value: `Actual ${yVar}`, position: "insideBottom", offset: -12, fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                                    />
                                    <YAxis
                                        type="number" dataKey="predicted" name="Predicted"
                                        fontSize={11} axisLine={false} tickLine={false}
                                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                                        label={{ value: `Predicted ${yVar}`, angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                                    />
                                    <Tooltip
                                        contentStyle={tipStyle}
                                        formatter={(v: unknown, name: string) => [v, name === "predicted" ? `Predicted ${yVar}` : `Actual ${yVar}`]}
                                    />
                                    {/* Perfect prediction diagonal */}
                                    <Line
                                        data={modelResults.diagLine}
                                        type="linear" dataKey="predicted"
                                        stroke="url(#m6lineGrad)" strokeWidth={2}
                                        strokeDasharray="6 3" dot={false} activeDot={false}
                                    />
                                    {/* Data scatter */}
                                    <Scatter
                                        data={modelResults.avpData}
                                        fill="hsl(var(--primary))" fillOpacity={0.5}
                                        stroke="hsl(var(--primary))" strokeWidth={1}
                                        r={3.5}
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* 2 — Coefficient Bar Chart */}
                    <Card className="border-none bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-2xl overflow-hidden">
                        <CardHeader>
                            <CardTitle className="text-lg font-black">Coefficient Magnitudes</CardTitle>
                            <CardDescription>Positive (green) / Negative (red) effect on {yVar}</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[360px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={modelResults.coefData}
                                    layout="vertical"
                                    margin={{ top: 10, right: 20, bottom: 10, left: 10 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--muted-foreground)/0.08)" />
                                    <XAxis type="number" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                                    <YAxis type="category" dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))" }} width={80} />
                                    <Tooltip contentStyle={tipStyle} formatter={(v: unknown) => [v, "Coefficient"]} />
                                    <ReferenceLine x={0} stroke="hsl(var(--muted-foreground)/0.3)" strokeWidth={1} />
                                    <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={22}>
                                        {modelResults.coefData.map((entry, idx) => (
                                            <Cell
                                                key={idx}
                                                fill={entry.value >= 0 ? "hsl(142.1 76.2% 36.3%)" : "hsl(346.8 77.2% 49.8%)"}
                                                fillOpacity={0.8}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* 3 — Residuals vs Predicted */}
                    <Card className="lg:col-span-3 border-none bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-2xl overflow-hidden">
                        <CardHeader>
                            <CardTitle className="text-lg font-black">Residuals vs Predicted</CardTitle>
                            <CardDescription>Random scatter around zero indicates a well-fitted model (no systematic bias)</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={modelResults.residData} margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground)/0.08)" />
                                    <XAxis
                                        dataKey="predicted" type="number" name={`Predicted ${yVar}`}
                                        fontSize={11} axisLine={false} tickLine={false}
                                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                                        label={{ value: `Predicted ${yVar}`, position: "insideBottom", offset: -12, fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                                    />
                                    <YAxis
                                        dataKey="residual" type="number" name="Residual"
                                        fontSize={11} axisLine={false} tickLine={false}
                                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                                        label={{ value: "Residual", angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                                    />
                                    <ReferenceLine y={0} stroke="hsl(var(--primary))" strokeWidth={1.5} strokeDasharray="4 4" />
                                    <Tooltip
                                        contentStyle={tipStyle}
                                        formatter={(v: unknown, name: string) => [v, name === "residual" ? "Residual" : `Predicted ${yVar}`]}
                                    />
                                    <Scatter
                                        data={modelResults.residData}
                                        fill="hsl(var(--primary))" fillOpacity={0.45}
                                        stroke="hsl(var(--primary))" strokeWidth={0.5}
                                        r={3}
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};
