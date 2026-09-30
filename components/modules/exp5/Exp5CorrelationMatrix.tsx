"use client";

import React, { useMemo, useState } from "react";
import { useLabStore } from "@/store/useLabStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Grid3X3, Activity, Flame, Info, GitBranch, Layers } from "lucide-react";
import * as ss from "simple-statistics";

// ─── Math helpers ─────────────────────────────────────────────────────────────

/** Pearson r between two same-length number arrays */
const pearson = (a: number[], b: number[]): number => {
    const n = Math.min(a.length, b.length);
    return ss.sampleCorrelation(a.slice(0, n), b.slice(0, n));
};

/**
 * OLS residuals of y regressed on xs (multiple predictors).
 * Uses Normal Equations: β = (XᵀX)⁻¹ Xᵀy  (manual for 1–3 predictors via simple-statistics)
 * For simplicity we do sequential projection subtraction (Gram-Schmidt style).
 */
const residualise = (y: number[], xs: number[][]): number[] => {
    let resid = [...y];
    for (const x of xs) {
        const n = Math.min(resid.length, x.length);
        const rSlice = resid.slice(0, n);
        const xSlice = x.slice(0, n);
        const reg = ss.linearRegression(xSlice.map((xi, i) => [xi, rSlice[i]]));
        const lineFn = ss.linearRegressionLine(reg);
        resid = rSlice.map((ri, i) => ri - lineFn(xSlice[i]));
    }
    return resid;
};

/**
 * Multiple correlation: R of y on all other numeric cols.
 * Approx via sequential regression residuals then 1 - SS_res/SS_tot => R = sqrt
 */
const multipleR = (y: number[], predictors: number[][]): number => {
    const residuals = residualise(y, predictors);
    const meanY = y.reduce((s, v) => s + v, 0) / y.length;
    const ssTot = y.reduce((s, v) => s + (v - meanY) ** 2, 0);
    const ssRes = residuals.reduce((s, v, i) => {
        const yHat = y[i] - v;
        return s + (y[i] - yHat) ** 2;
    }, 0);
    // SS_res of the residuals directly
    const ssResidual = residuals.reduce((s, v) => s + v ** 2, 0);
    const r2 = Math.max(0, 1 - ssResidual / ssTot);
    return Math.sqrt(r2);
};

// ─── Cell colour ──────────────────────────────────────────────────────────────

const getBg = (val: number) => {
    const op = Math.abs(val);
    if (val > 0) return `rgba(var(--primary-rgb), ${op})`;
    return `rgba(239,68,68,${op})`;
};

const textColor = (val: number) => (Math.abs(val) > 0.5 ? "white" : "inherit");

// ─── Strength label ───────────────────────────────────────────────────────────

const strengthLabel = (r: number) => {
    const a = Math.abs(r);
    if (a >= 0.9) return { text: "Very Strong", cls: "text-emerald-600" };
    if (a >= 0.7) return { text: "Strong", cls: "text-green-600" };
    if (a >= 0.5) return { text: "Moderate", cls: "text-amber-600" };
    if (a >= 0.3) return { text: "Weak", cls: "text-orange-600" };
    return { text: "Negligible", cls: "text-rose-500" };
};

// ─── Main component ───────────────────────────────────────────────────────────

export const Exp5CorrelationMatrix = () => {
    const { dataset, selectedColumns } = useLabStore();

    // Partial correlation: user picks X1, X2, control vars
    const [partialX1, setPartialX1] = useState("");
    const [partialX2, setPartialX2] = useState("");

    const numericalHeaders = useMemo(() => {
        if (!dataset) return [];
        return selectedColumns.filter(h => {
            const sample = dataset.slice(0, 20).map(r => r[h]).filter(v => v !== null && v !== undefined && v !== "");
            return sample.length > 0 && sample.every(v => !isNaN(Number(v)));
        });
    }, [dataset, selectedColumns]);

    // ── Pearson matrix ────────────────────────────────────────────────────────
    const matrix = useMemo(() => {
        if (!dataset || numericalHeaders.length < 2) return null;
        const cols: Record<string, number[]> = {};
        numericalHeaders.forEach(h => {
            cols[h] = dataset.map(r => Number(r[h])).filter(v => !isNaN(v));
        });
        const results: Record<string, Record<string, number>> = {};
        numericalHeaders.forEach(h1 => {
            results[h1] = {};
            numericalHeaders.forEach(h2 => {
                results[h1][h2] = pearson(cols[h1], cols[h2]);
            });
        });
        return { results, cols };
    }, [dataset, numericalHeaders]);

    // ── Multiple correlation R (Y | all others) ───────────────────────────────
    const multipleCorr = useMemo(() => {
        if (!matrix || numericalHeaders.length < 3) return null;
        return numericalHeaders.map(yCol => {
            const y = matrix.cols[yCol];
            const xs = numericalHeaders.filter(h => h !== yCol).map(h => matrix.cols[h]);
            const R = multipleR(y, xs);
            const R2 = R ** 2;
            return { col: yCol, R: +R.toFixed(4), R2: +R2.toFixed(4) };
        });
    }, [matrix, numericalHeaders]);

    // ── Partial correlation r(X1, X2 | all others) ───────────────────────────
    const partialCorr = useMemo(() => {
        if (!matrix || !partialX1 || !partialX2 || partialX1 === partialX2) return null;
        const controls = numericalHeaders.filter(h => h !== partialX1 && h !== partialX2);
        const xVals = matrix.cols[partialX1];
        const yVals = matrix.cols[partialX2];
        if (controls.length === 0) {
            // No controls → same as Pearson
            return { r: pearson(xVals, yVals), controls: [] };
        }
        const controlArrays = controls.map(h => matrix.cols[h]);
        const residX = residualise(xVals, controlArrays);
        const residY = residualise(yVals, controlArrays);
        const r = pearson(residX, residY);
        return { r: +r.toFixed(4), controls };
    }, [matrix, partialX1, partialX2, numericalHeaders]);

    if (!dataset) return null;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* ── Sidebar ── */}
                <Card className="lg:col-span-1 border-none bg-white/40 dark:bg-slate-900/40 backdrop-blur-md shadow-lg h-fit">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Activity className="h-4 w-4 text-primary" />
                            Matrix Insights
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Heatmap legend */}
                        <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 space-y-3">
                            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                                <Flame className="h-4 w-4" />
                                Heatmap Legend
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] uppercase font-black text-muted-foreground">
                                    <span>Negative</span><span>Zero</span><span>Positive</span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-gradient-to-r from-red-500 via-slate-200 to-primary" />
                                <div className="flex justify-between text-[10px] font-bold">
                                    <span>-1.0</span><span>0.0</span><span>1.0</span>
                                </div>
                            </div>
                        </div>

                        {/* Interpretation guide */}
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 space-y-2">
                            <h4 className="text-xs font-bold uppercase tracking-tight">Strength Guide</h4>
                            <div className="space-y-1 text-[11px]">
                                {[
                                    ["≥ 0.9", "Very Strong", "text-emerald-600"],
                                    ["≥ 0.7", "Strong", "text-green-600"],
                                    ["≥ 0.5", "Moderate", "text-amber-600"],
                                    ["≥ 0.3", "Weak", "text-orange-600"],
                                    ["< 0.3", "Negligible", "text-rose-500"],
                                ].map(([range, label, cls]) => (
                                    <div key={range} className="flex justify-between">
                                        <span className="text-muted-foreground font-mono">{range}</span>
                                        <span className={`font-bold ${cls}`}>{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Pearson Heatmap ── */}
                <Card className="lg:col-span-3 border-none bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-2xl overflow-hidden min-h-[500px]">
                    <CardHeader>
                        <CardTitle className="text-2xl font-black bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            Pearson Correlation Matrix
                        </CardTitle>
                        <CardDescription>Pairwise linear association between all numeric variables</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 border-t border-muted/50">
                        {numericalHeaders.length > 1 && matrix ? (
                            <ScrollArea className="w-full">
                                <Table className="border-collapse">
                                    <TableHeader className="bg-muted/50 border-b border-muted">
                                        <TableRow>
                                            <TableHead className="bg-white/90 dark:bg-slate-900/90 backdrop-blur sticky left-0 z-20" />
                                            {numericalHeaders.map(h => (
                                                <TableHead key={h} className="text-[10px] font-black uppercase text-center px-4 py-6 border-l border-muted/50">{h}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {numericalHeaders.map(h1 => (
                                            <TableRow key={h1} className="hover:bg-muted/20">
                                                <TableCell className="bg-white/90 dark:bg-slate-900/90 backdrop-blur sticky left-0 z-10 text-[10px] font-black uppercase tracking-tighter px-4 py-4 pr-8 border-b border-muted">
                                                    {h1}
                                                </TableCell>
                                                {numericalHeaders.map(h2 => (
                                                    <TableCell
                                                        key={`${h1}-${h2}`}
                                                        className="text-center p-0 border border-muted/20"
                                                    >
                                                        <div
                                                            className="w-full h-full p-6 text-sm font-black tabular-nums"
                                                            style={{ color: textColor(matrix.results[h1][h2]), backgroundColor: getBg(matrix.results[h1][h2]) }}
                                                        >
                                                            {matrix.results[h1][h2].toFixed(2)}
                                                        </div>
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <ScrollBar orientation="horizontal" />
                            </ScrollArea>
                        ) : (
                            <div className="h-[400px] flex flex-col items-center justify-center text-center p-12 space-y-4">
                                <div className="p-8 bg-blue-50 dark:bg-blue-900/20 rounded-full text-blue-400">
                                    <Info className="h-12 w-12" />
                                </div>
                                <h3 className="text-lg font-bold">Insufficient Data</h3>
                                <p className="text-muted-foreground text-xs max-w-xs">Correlation matrix requires at least two numerical columns.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ── Multiple Correlation ──────────────────────────────────────────────── */}
            {multipleCorr && (
                <Card className="border-none bg-white/50 dark:bg-slate-900/50 backdrop-blur-md shadow-xl">
                    <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <CardTitle className="text-xl font-black flex items-center gap-2">
                                    <Layers className="h-5 w-5 text-primary" />
                                    Multiple Correlation Coefficient (R)
                                </CardTitle>
                                <CardDescription>
                                    How well each variable is predicted by all other numeric variables combined · R² = coefficient of determination
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40">
                                    <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Dependent Variable (Y)</TableHead>
                                    <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">R (Multiple Corr)</TableHead>
                                    <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">R² (Explained Var)</TableHead>
                                    <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Strength</TableHead>
                                    <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Predictors</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {multipleCorr.map(row => {
                                    const { text, cls } = strengthLabel(row.R);
                                    const pct = (row.R2 * 100).toFixed(1);
                                    return (
                                        <TableRow key={row.col} className="hover:bg-muted/20">
                                            <TableCell className="px-6 py-4 font-bold">{row.col}</TableCell>
                                            <TableCell className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <div
                                                        className="h-2 rounded-full bg-primary transition-all"
                                                        style={{ width: `${row.R * 80}px`, minWidth: "4px" }}
                                                    />
                                                    <span className="font-black tabular-nums">{row.R}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="font-black tabular-nums">{row.R2}</span>
                                                    <span className="text-xs text-muted-foreground">({pct}%)</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className={`px-6 py-4 text-center text-xs font-black ${cls}`}>{text}</TableCell>
                                            <TableCell className="px-6 py-4 text-center text-xs text-muted-foreground">
                                                {numericalHeaders.filter(h => h !== row.col).join(", ")}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* ── Partial Correlation ───────────────────────────────────────────────── */}
            {numericalHeaders.length >= 3 && (
                <Card className="border-none bg-white/50 dark:bg-slate-900/50 backdrop-blur-md shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-xl font-black flex items-center gap-2">
                            <GitBranch className="h-5 w-5 text-primary" />
                            Partial Correlation Coefficient
                        </CardTitle>
                        <CardDescription>
                            Correlation between two variables after removing the linear influence of all remaining variables (controls)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Variable pickers */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Variable 1 (X₁)</Label>
                                <Select value={partialX1} onValueChange={val => setPartialX1(val || "")}>
                                    <SelectTrigger className="h-11 bg-white dark:bg-slate-800 rounded-xl">
                                        <SelectValue placeholder="Select X₁" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {numericalHeaders.map(h => (
                                            <SelectItem key={h} value={h} className="rounded-lg">{h}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Variable 2 (X₂)</Label>
                                <Select value={partialX2} onValueChange={val => setPartialX2(val || "")}>
                                    <SelectTrigger className="h-11 bg-white dark:bg-slate-800 rounded-xl">
                                        <SelectValue placeholder="Select X₂" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {numericalHeaders.map(h => (
                                            <SelectItem key={h} value={h} className="rounded-lg">{h}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Result */}
                        {partialCorr ? (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {/* Partial r */}
                                <div className="p-6 rounded-3xl border border-primary/20 bg-primary/5 space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">Partial Correlation r</p>
                                    <p className="text-4xl font-black tracking-tighter">{partialCorr.r}</p>
                                    <p className={`text-xs font-bold ${strengthLabel(partialCorr.r).cls}`}>
                                        {strengthLabel(partialCorr.r).text}
                                    </p>
                                </div>

                                {/* Pearson (raw) for comparison */}
                                {matrix && partialX1 && partialX2 && (
                                    <div className="p-6 rounded-3xl border border-muted bg-muted/20 space-y-2">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Pearson r (raw)</p>
                                        <p className="text-4xl font-black tracking-tighter">
                                            {matrix.results[partialX1]?.[partialX2]?.toFixed(4) ?? "—"}
                                        </p>
                                        <p className="text-xs text-muted-foreground font-medium">Before controlling</p>
                                    </div>
                                )}

                                {/* Control variables */}
                                <div className="p-6 rounded-3xl border border-muted bg-muted/20 space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                                        {partialCorr.controls.length > 0 ? "Controlled Variables" : "No Controls"}
                                    </p>
                                    {partialCorr.controls.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {partialCorr.controls.map(c => (
                                                <span key={c} className="text-[10px] font-black uppercase tracking-wide bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                                                    {c}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted-foreground">No other variables to control for</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 rounded-3xl border border-dashed border-muted text-center text-sm text-muted-foreground">
                                Select two different variables above to compute their partial correlation
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
