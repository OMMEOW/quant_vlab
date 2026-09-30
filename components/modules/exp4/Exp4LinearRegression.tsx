"use client";

import React, { useState, useMemo } from "react";
import { useLabStore } from "@/store/useLabStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
    ComposedChart,
    Scatter,
    Line,
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend,
} from "recharts";
import { Calculator, TrendingUp, Activity } from "lucide-react";
import * as ss from "simple-statistics";

export const Exp4LinearRegression = () => {
    const { dataset, selectedColumns } = useLabStore();
    const [xVar, setXVar] = useState<string>("");
    const [yVar, setYVar] = useState<string>("");

    const regressionData = useMemo(() => {
        if (!dataset || !xVar || !yVar || xVar === yVar) return null;

        const pairs = dataset
            .map(row => ({ x: Number(row[xVar]), y: Number(row[yVar]) }))
            .filter(p => !isNaN(p.x) && !isNaN(p.y));

        if (pairs.length < 2) return null;

        const dataPoints = pairs.map(p => [p.x, p.y]) as [number, number][];
        const l = ss.linearRegression(dataPoints);
        const lineFn = ss.linearRegressionLine(l);
        const r2 = ss.sampleCorrelation(pairs.map(p => p.x), pairs.map(p => p.y)) ** 2;
        const r = ss.sampleCorrelation(pairs.map(p => p.x), pairs.map(p => p.y));

        // Build regression line: dense points across full X range for smooth rendering
        const minX = Math.min(...pairs.map(p => p.x));
        const maxX = Math.max(...pairs.map(p => p.x));
        const steps = 50;
        const step = (maxX - minX) / steps;
        const linePoints = Array.from({ length: steps + 1 }, (_, i) => {
            const xVal = minX + i * step;
            return { x: xVal, regY: parseFloat(lineFn(xVal).toFixed(4)) };
        });

        // Scatter points keep only x,y — regY undefined so Line series skips them
        const scatterPoints = pairs.map(p => ({ x: p.x, scatterY: p.y }));

        // Merge: all x values combined
        const allX = new Set([...scatterPoints.map(p => p.x), ...linePoints.map(p => p.x)]);
        const merged = [...allX].sort((a, b) => a - b).map(xVal => ({
            x: xVal,
            scatterY: scatterPoints.find(p => p.x === xVal)?.scatterY,
            regY: parseFloat(lineFn(xVal).toFixed(4)),
        }));

        return {
            merged,
            scatterPoints,
            linePoints,
            equation: `ŷ = ${l.m.toFixed(4)}x ${l.b >= 0 ? "+" : "−"} ${Math.abs(l.b).toFixed(4)}`,
            slope: l.m.toFixed(4),
            intercept: l.b.toFixed(4),
            r2: r2.toFixed(4),
            r: r.toFixed(4),
        };
    }, [dataset, xVar, yVar]);

    if (!dataset) return null;

    const r2Val = regressionData ? parseFloat(regressionData.r2) : null;
    const fitLabel =
        r2Val === null ? "" :
        r2Val >= 0.9 ? "Excellent fit" :
        r2Val >= 0.7 ? "Good fit" :
        r2Val >= 0.5 ? "Moderate fit" :
        "Weak fit";

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* ── Model Setup Panel ── */}
                <Card className="lg:col-span-1 border-none bg-white/40 dark:bg-slate-900/40 backdrop-blur-md shadow-lg h-fit">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Calculator className="h-4 w-4 text-primary" />
                            Model Setup
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                Independent Variable (X)
                            </Label>
                            <Select value={xVar} onValueChange={val => setXVar(val || "")}>
                                <SelectTrigger className="h-12 bg-white dark:bg-slate-800 rounded-xl">
                                    <SelectValue placeholder="Select X Variable" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {selectedColumns.map(h => <SelectItem key={h} value={h} className="rounded-lg">{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                Dependent Variable (Y)
                            </Label>
                            <Select value={yVar} onValueChange={val => setYVar(val || "")}>
                                <SelectTrigger className="h-12 bg-white dark:bg-slate-800 rounded-xl">
                                    <SelectValue placeholder="Select Y Variable" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {selectedColumns.map(h => <SelectItem key={h} value={h} className="rounded-lg">{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {regressionData && (
                            <div className="pt-2 space-y-3">
                                {/* Equation */}
                                <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
                                    <div className="text-[10px] font-black uppercase text-primary mb-1 tracking-widest">
                                        Regression Equation
                                    </div>
                                    <div className="text-sm font-mono font-bold text-primary">
                                        {regressionData.equation}
                                    </div>
                                </div>

                                {/* Coefficients */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800">
                                        <div className="text-[9px] font-black uppercase text-muted-foreground mb-1">Slope (m)</div>
                                        <div className="text-base font-black tabular-nums">{regressionData.slope}</div>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800">
                                        <div className="text-[9px] font-black uppercase text-muted-foreground mb-1">Intercept (b)</div>
                                        <div className="text-base font-black tabular-nums">{regressionData.intercept}</div>
                                    </div>
                                </div>

                                {/* Metrics */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800">
                                        <div className="text-[9px] font-black uppercase text-muted-foreground mb-1">R² Score</div>
                                        <div className="text-base font-black tabular-nums">{regressionData.r2}</div>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800">
                                        <div className="text-[9px] font-black uppercase text-muted-foreground mb-1">Pearson r</div>
                                        <div className="text-base font-black tabular-nums">{regressionData.r}</div>
                                    </div>
                                </div>

                                {/* Fit quality badge */}
                                <div className={`p-3 rounded-2xl text-center text-xs font-black uppercase tracking-widest ${
                                    r2Val! >= 0.7
                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                        : r2Val! >= 0.5
                                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                                        : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                                }`}>
                                    {fitLabel}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ── Chart Viewport ── */}
                <Card className="lg:col-span-3 border-none bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-2xl overflow-hidden min-h-[550px]">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-2xl font-black bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                Regression Analysis
                            </CardTitle>
                            <CardDescription>
                                Scatter plot with fitted regression line · {xVar || "X"} → {yVar || "Y"}
                            </CardDescription>
                        </div>
                        <TrendingUp className="h-8 w-8 text-primary/40" />
                    </CardHeader>
                    <CardContent className="h-[450px]">
                        {regressionData ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={regressionData.merged} margin={{ top: 20, right: 30, bottom: 30, left: 20 }}>
                                    <defs>
                                        <linearGradient id="regLineGrad" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="hsl(var(--muted-foreground)/0.1)"
                                        vertical={false}
                                    />
                                    <XAxis
                                        type="number"
                                        dataKey="x"
                                        name={xVar}
                                        fontSize={11}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                                        label={{ value: xVar, position: "insideBottom", offset: -12, fontSize: 12, fontWeight: "bold", fill: "hsl(var(--muted-foreground))" }}
                                    />
                                    <YAxis
                                        fontSize={11}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                                        label={{ value: yVar, angle: -90, position: "insideLeft", offset: 10, fontSize: 12, fontWeight: "bold", fill: "hsl(var(--muted-foreground))" }}
                                    />
                                    <Tooltip
                                        cursor={{ strokeDasharray: "3 3", stroke: "hsl(var(--primary)/0.3)" }}
                                        contentStyle={{
                                            borderRadius: "16px",
                                            border: "none",
                                            boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                                            background: "rgba(255,255,255,0.95)",
                                            backdropFilter: "blur(10px)",
                                        }}
                                        formatter={(val: unknown, name: string) => {
                                            if (name === "scatterY") return [val, yVar];
                                            if (name === "regY") return [val, "Predicted ŷ"];
                                            return [val, name];
                                        }}
                                        labelFormatter={(x: unknown) => `${xVar}: ${x}`}
                                    />
                                    <Legend
                                        verticalAlign="top"
                                        align="right"
                                        formatter={(value: string) =>
                                            value === "scatterY" ? "Data Points" : "Regression Line"
                                        }
                                        wrapperStyle={{ fontSize: 12, fontWeight: "bold" }}
                                    />

                                    {/* Scatter: actual data points */}
                                    <Scatter
                                        dataKey="scatterY"
                                        name="scatterY"
                                        fill="hsl(var(--primary))"
                                        fillOpacity={0.55}
                                        stroke="hsl(var(--primary))"
                                        strokeWidth={1}
                                        r={4}
                                    />

                                    {/* Line: regression line */}
                                    <Line
                                        dataKey="regY"
                                        name="regY"
                                        type="linear"
                                        stroke="url(#regLineGrad)"
                                        strokeWidth={2.5}
                                        dot={false}
                                        activeDot={false}
                                        strokeDasharray="0"
                                        legendType="line"
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-6">
                                <div className="p-8 bg-primary/5 rounded-full text-primary/20">
                                    <Activity className="h-16 w-16" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold">Awaiting Model Inputs</h3>
                                    <p className="text-muted-foreground text-sm max-w-xs">
                                        Select two numerical variables to calculate their correlation and generate a linear regression model.
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
