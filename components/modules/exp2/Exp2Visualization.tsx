"use client";

import React, { useState, useMemo } from "react";
import { useLabStore } from "@/store/useLabStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Rectangle,
    LineChart, Line, Dot,
    ScatterChart, Scatter, ZAxis,
    ComposedChart,
} from "recharts";
import { cn } from "@/lib/utils";
import {
    ChartNoAxesCombined, Info,
    BarChart3, LineChart as LucideLineChart,
    Crosshair, BoxSelect,
} from "lucide-react";

type ChartType = "bar" | "line" | "scatter" | "box";

// ─── Box Plot custom shapes ───────────────────────────────────────────────────

/** Transparent base – renders nothing */
const InvisibleBar = () => <g />;

/** Lower whisker: center line from min → q1 with cap at min */
const LowerWhiskerShape = (props: Record<string, unknown>) => {
    const { x, y, width, height } = props as { x: number; y: number; width: number; height: number };
    const cx = x + width / 2;
    const capW = width * 0.25;
    return (
        <g>
            <line x1={cx} x2={cx} y1={y} y2={y + height}
                stroke="hsl(var(--primary))" strokeWidth={2} />
            <line x1={cx - capW} x2={cx + capW} y1={y + height} y2={y + height}
                stroke="hsl(var(--primary))" strokeWidth={2} />
        </g>
    );
};

/** Box body: Q1→Q3 rectangle + median line */
const BoxBodyShape = (props: Record<string, unknown>) => {
    const { x, y, width, height, q1, q3, median } = props as {
        x: number; y: number; width: number; height: number;
        q1: number; q3: number; median: number;
    };
    const boxW = width * 0.7;
    const boxX = x + (width - boxW) / 2;
    const range = q3 - q1;
    const yMedian = range > 0 ? y + height * (q3 - median) / range : y + height / 2;
    return (
        <g>
            <rect x={boxX} y={y} width={boxW} height={height}
                fill="hsl(var(--primary)/0.18)" stroke="hsl(var(--primary))"
                strokeWidth={1.5} rx={4} />
            <line x1={boxX} x2={boxX + boxW} y1={yMedian} y2={yMedian}
                stroke="hsl(var(--primary))" strokeWidth={2.5} strokeLinecap="round" />
        </g>
    );
};

/** Upper whisker: center line from q3 → max with cap at max */
const UpperWhiskerShape = (props: Record<string, unknown>) => {
    const { x, y, width, height } = props as { x: number; y: number; width: number; height: number };
    const cx = x + width / 2;
    const capW = width * 0.25;
    return (
        <g>
            <line x1={cx} x2={cx} y1={y} y2={y + height}
                stroke="hsl(var(--primary))" strokeWidth={2} />
            <line x1={cx - capW} x2={cx + capW} y1={y} y2={y}
                stroke="hsl(var(--primary))" strokeWidth={2} />
        </g>
    );
};

/** Custom tooltip for box plot */
const BoxTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: BoxItem }[] }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const rows: [string, number][] = [
        ["Max", d.max], ["Q3", d.q3], ["Median", d.median], ["Q1", d.q1], ["Min", d.min],
    ];
    return (
        <div className="rounded-2xl border-none shadow-xl bg-white/95 backdrop-blur-xl p-4 min-w-[160px] text-sm">
            <p className="font-black text-foreground mb-3">{d.name}</p>
            {rows.map(([label, val]) => (
                <div key={label} className="flex justify-between gap-6">
                    <span className="text-muted-foreground text-xs font-medium">{label}</span>
                    <span className="font-bold tabular-nums">{val}</span>
                </div>
            ))}
        </div>
    );
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface BoxItem {
    name: string;
    _invisible: number;
    _lower: number;
    _box: number;
    _upper: number;
    min: number; q1: number; median: number; q3: number; max: number;
}

// ─── Main component ───────────────────────────────────────────────────────────

export const Exp2Visualization = () => {
    const { dataset, selectedColumns } = useLabStore();
    const [selectedColumn, setSelectedColumn] = useState<string>(selectedColumns[0] || "");
    const [yColumn, setYColumn] = useState<string>("__frequency__");
    const [chartType, setChartType] = useState<ChartType>("bar");

    /** Columns whose first 20 non-empty values are all numeric */
    const numericHeaders = useMemo(() => {
        if (!dataset || !selectedColumns.length) return [];
        return selectedColumns.filter(h => {
            const sample = dataset.slice(0, 20)
                .map(r => r[h])
                .filter(v => v !== null && v !== undefined && v !== "");
            return sample.length > 0 && sample.every(v => !isNaN(Number(v)));
        });
    }, [dataset, selectedColumns]);

    const isXNumeric = numericHeaders.includes(selectedColumn);
    const isYNumeric = yColumn !== "__frequency__";

    // ── Frequency / mean-per-category data (bar & line) ──────────────────────
    const aggData = useMemo(() => {
        if (!dataset || !selectedColumn) return [];
        const values = dataset
            .map(row => row[selectedColumn])
            .filter(v => v !== null && v !== undefined && v !== "");

        if (yColumn === "__frequency__") {
            const counts = values.reduce((acc: Record<string, number>, v) => {
                const k = v.toString();
                acc[k] = (acc[k] || 0) + 1;
                return acc;
            }, {});
            return Object.entries(counts)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
                .slice(0, 15);
        }

        const grouped: Record<string, number[]> = {};
        dataset.forEach(row => {
            const xKey = row[selectedColumn]?.toString();
            const yVal = Number(row[yColumn]);
            if (xKey && !isNaN(yVal)) {
                if (!grouped[xKey]) grouped[xKey] = [];
                grouped[xKey].push(yVal);
            }
        });
        return Object.entries(grouped)
            .map(([name, vals]) => ({
                name,
                value: parseFloat((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2)),
            }))
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
            .slice(0, 15);
    }, [dataset, selectedColumn, yColumn]);

    // ── Scatter data (per-row points) ─────────────────────────────────────────
    const scatterData = useMemo(() => {
        if (!dataset || !selectedColumn || !isYNumeric) return [];

        const catMap: Record<string, number> = {};
        let catIdx = 0;

        return dataset
            .map(row => {
                const rawX = row[selectedColumn];
                const rawY = row[yColumn];
                if (rawX === null || rawX === undefined || rawX === "") return null;
                if (rawY === null || rawY === undefined || rawY === "") return null;
                const yVal = Number(rawY);
                if (isNaN(yVal)) return null;

                let xVal: number;
                if (isXNumeric) {
                    xVal = Number(rawX);
                    if (isNaN(xVal)) return null;
                } else {
                    const k = rawX.toString();
                    if (!(k in catMap)) catMap[k] = catIdx++;
                    xVal = catMap[k];
                }
                return { x: xVal, y: yVal };
            })
            .filter(Boolean) as { x: number; y: number }[];
    }, [dataset, selectedColumn, yColumn, isXNumeric, isYNumeric]);

    const categoryLabels = useMemo(() => {
        if (isXNumeric || !dataset) return {};
        const map: Record<number, string> = {};
        let idx = 0;
        dataset.forEach(row => {
            const k = row[selectedColumn]?.toString();
            if (k && !(Object.values(map).includes(k))) map[idx++] = k;
        });
        return map;
    }, [dataset, selectedColumn, isXNumeric]);

    // ── Box plot data ─────────────────────────────────────────────────────────
    const boxData = useMemo((): BoxItem[] => {
        if (!dataset || !selectedColumn || !isYNumeric) return [];

        const grouped: Record<string, number[]> = {};
        dataset.forEach(row => {
            const k = row[selectedColumn]?.toString() ?? "";
            const v = Number(row[yColumn]);
            if (k && !isNaN(v)) {
                if (!grouped[k]) grouped[k] = [];
                grouped[k].push(v);
            }
        });

        return Object.entries(grouped).map(([name, vals]) => {
            const sorted = [...vals].sort((a, b) => a - b);
            const n = sorted.length;
            const q1 = sorted[Math.floor(n * 0.25)];
            const median = sorted[Math.floor(n * 0.5)];
            const q3 = sorted[Math.floor(n * 0.75)];
            const iqr = q3 - q1;
            const min = Math.max(sorted[0], q1 - 1.5 * iqr);
            const max = Math.min(sorted[n - 1], q3 + 1.5 * iqr);
            return {
                name,
                _invisible: min,
                _lower: q1 - min,
                _box: q3 - q1,
                _upper: max - q3,
                min, q1, median, q3, max,
            };
        }).slice(0, 12);
    }, [dataset, selectedColumn, yColumn, isYNumeric]);

    // ── Labels & shared props ─────────────────────────────────────────────────
    const yLabel = yColumn === "__frequency__" ? "Frequency" : `Avg ${yColumn}`;

    const commonAxisProps = {
        fontSize: 11,
        axisLine: false,
        tickLine: false,
        tick: { fill: "hsl(var(--muted-foreground))" },
    };

    const tooltipStyle = {
        contentStyle: {
            borderRadius: "16px",
            border: "none",
            boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(10px)",
        },
    };

    const needsNumericY = chartType === "scatter" || chartType === "box";
    const showUnableToRender = needsNumericY && !isYNumeric;

    const chartButtons: { type: ChartType; icon: React.ReactNode; label: string }[] = [
        { type: "bar", icon: <BarChart3 className="h-5 w-5" />, label: "Bar" },
        { type: "line", icon: <LucideLineChart className="h-5 w-5" />, label: "Line" },
        { type: "scatter", icon: <Crosshair className="h-5 w-5" />, label: "Scatter" },
        { type: "box", icon: <BoxSelect className="h-5 w-5" />, label: "Box" },
    ];

    if (!dataset) return null;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col lg:flex-row gap-6">

                {/* ── Control Panel ── */}
                <Card className="w-full lg:w-[320px] shrink-0 border-none bg-white/40 dark:bg-slate-900/40 backdrop-blur-md shadow-lg h-fit">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <ChartNoAxesCombined className="h-4 w-4 text-primary" />
                            Dynamic Plotter
                        </CardTitle>
                        <CardDescription>Configure visualization</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {/* X axis column */}
                        <div className="space-y-2">
                            <Label htmlFor="column-select" className="text-xs uppercase font-bold tracking-tight text-muted-foreground">
                                X Axis — Attribute
                            </Label>
                            <Select value={selectedColumn} onValueChange={val => setSelectedColumn(val || "")}>
                                <SelectTrigger id="column-select" className="h-12 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                                    <SelectValue placeholder="Choose a column" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {selectedColumns.map(h => (
                                        <SelectItem key={h} value={h} className="rounded-lg">{h}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Y axis measure */}
                        <div className="space-y-2">
                            <Label htmlFor="y-column-select" className="text-xs uppercase font-bold tracking-tight text-muted-foreground">
                                Y Axis — Measure
                            </Label>
                            <Select value={yColumn} onValueChange={val => setYColumn(val || "__frequency__")}>
                                <SelectTrigger id="y-column-select" className="h-12 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                                    <SelectValue placeholder="Choose Y axis" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {chartType !== "scatter" && chartType !== "box" && (
                                        <SelectItem value="__frequency__" className="rounded-lg">Frequency (Count)</SelectItem>
                                    )}
                                    {numericHeaders.map(h => (
                                        <SelectItem key={h} value={h} className="rounded-lg">{h}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Info card */}
                        <div className="p-4 rounded-2xl bg-primary/5 space-y-3">
                            <div className="flex items-center gap-2 text-primary font-bold text-sm">
                                <Info className="h-4 w-4" />
                                Visual Insight
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                {chartType === "bar" || chartType === "line"
                                    ? yColumn === "__frequency__"
                                        ? "Frequency distribution — how often each value appears."
                                        : `Average ${yColumn} per category of ${selectedColumn}.`
                                    : chartType === "scatter"
                                        ? `Each point is a data row. X = ${selectedColumn}, Y = ${yColumn}.`
                                        : `Box plots show min, Q1, median, Q3, max of ${yColumn} per ${selectedColumn} group.`}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Main Chart Viewport ── */}
                <Card className="flex-1 border-none bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-2xl overflow-hidden min-h-[500px]">
                    <CardHeader className="flex flex-row items-center justify-between pb-8">
                        <div>
                            <CardTitle className="text-2xl font-black bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                Distribution Analysis
                            </CardTitle>
                            <CardDescription>
                                {chartType === "scatter"
                                    ? <>{selectedColumn} <span className="mx-1 opacity-40">vs</span> {yColumn}</>
                                    : <>{yLabel} of <span className="font-semibold text-foreground">{selectedColumn}</span></>}
                            </CardDescription>
                        </div>

                        {/* Chart type toggle group */}
                        <div className="flex gap-1.5 p-1 bg-muted/60 rounded-2xl">
                            {chartButtons.map(({ type, icon, label }) => (
                                <button
                                    key={type}
                                    onClick={() => {
                                        setChartType(type);
                                        // Auto-switch Y to first numeric if switching to scatter/box
                                        if ((type === "scatter" || type === "box") && yColumn === "__frequency__" && numericHeaders.length > 0) {
                                            setYColumn(numericHeaders[0]);
                                        }
                                    }}
                                    title={label}
                                    className={cn(
                                        "p-2.5 rounded-xl transition-all duration-300",
                                        chartType === type
                                            ? "bg-white dark:bg-slate-800 text-primary shadow-md"
                                            : "text-muted-foreground hover:text-primary"
                                    )}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>
                    </CardHeader>

                    <CardContent className="h-[440px]">
                        {showUnableToRender ? (
                            <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                <div className="p-4 rounded-2xl bg-primary/5">
                                    <Info className="h-8 w-8 text-primary/50" />
                                </div>
                                <p className="text-sm font-medium text-center max-w-xs">
                                    {chartType === "scatter" ? "Scatter" : "Box"} plots require a numeric Y axis.<br />
                                    Select a numeric column in the Y Axis dropdown.
                                </p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                {/* ────────── BAR ────────── */}
                                {chartType === "bar" ? (
                                    <BarChart data={aggData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                                        <defs>
                                            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.85} />
                                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.1)" />
                                        <XAxis dataKey="name" {...commonAxisProps} />
                                        <YAxis {...commonAxisProps}
                                            label={{ value: yLabel, angle: -90, position: "insideLeft", offset: 10, style: { fill: "hsl(var(--muted-foreground))", fontSize: 11 } }} />
                                        <Tooltip {...tooltipStyle} formatter={(v) => [v, yLabel]} cursor={{ fill: "hsl(var(--primary)/0.05)" }} />
                                        <Bar dataKey="value" fill="url(#barGrad)" radius={[8, 8, 0, 0]} barSize={40} activeBar={<Rectangle fill="hsl(var(--primary))" />} />
                                    </BarChart>
                                ) : chartType === "line" ? (
                                    /* ────────── LINE ────────── */
                                    <LineChart data={aggData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                                        <defs>
                                            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                                                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.1)" />
                                        <XAxis dataKey="name" {...commonAxisProps} />
                                        <YAxis {...commonAxisProps}
                                            label={{ value: yLabel, angle: -90, position: "insideLeft", offset: 10, style: { fill: "hsl(var(--muted-foreground))", fontSize: 11 } }} />
                                        <Tooltip {...tooltipStyle} formatter={(v) => [v, yLabel]} cursor={{ stroke: "hsl(var(--primary)/0.2)", strokeWidth: 1 }} />
                                        <Line
                                            type="monotone" dataKey="value"
                                            stroke="url(#lineGrad)" strokeWidth={2.5}
                                            dot={<Dot r={4} fill="hsl(var(--primary))" stroke="white" strokeWidth={2} />}
                                            activeDot={{ r: 6, fill: "hsl(var(--primary))", stroke: "white", strokeWidth: 2 }}
                                        />
                                    </LineChart>
                                ) : chartType === "scatter" ? (
                                    /* ────────── SCATTER ────────── */
                                    <ScatterChart margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground)/0.1)" />
                                        <XAxis
                                            type="number" dataKey="x" name={selectedColumn}
                                            {...commonAxisProps}
                                            tickFormatter={isXNumeric ? undefined : (v: number) => categoryLabels[v] ?? v}
                                            label={{ value: selectedColumn, position: "insideBottom", offset: -10, style: { fill: "hsl(var(--muted-foreground))", fontSize: 11 } }}
                                        />
                                        <YAxis type="number" dataKey="y" name={yColumn} {...commonAxisProps}
                                            label={{ value: yColumn, angle: -90, position: "insideLeft", offset: 10, style: { fill: "hsl(var(--muted-foreground))", fontSize: 11 } }} />
                                        <ZAxis range={[40, 40]} />
                                        <Tooltip
                                            {...tooltipStyle}
                                            cursor={{ strokeDasharray: "3 3" }}
                                            formatter={(v, name) => [v, name]}
                                        />
                                        <Scatter
                                            data={scatterData}
                                            fill="hsl(var(--primary))"
                                            fillOpacity={0.6}
                                            stroke="hsl(var(--primary))"
                                            strokeWidth={1}
                                        />
                                    </ScatterChart>
                                ) : (
                                    /* ────────── BOX PLOT ────────── */
                                    <ComposedChart data={boxData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.1)" />
                                        <XAxis dataKey="name" {...commonAxisProps} />
                                        <YAxis {...commonAxisProps}
                                            label={{ value: yColumn, angle: -90, position: "insideLeft", offset: 10, style: { fill: "hsl(var(--muted-foreground))", fontSize: 11 } }} />
                                        <Tooltip content={<BoxTooltip />} cursor={{ fill: "hsl(var(--primary)/0.04)" }} />
                                        {/* Invisible offset base */}
                                        <Bar dataKey="_invisible" stackId="box" fill="none" shape={<InvisibleBar />} barSize={60} />
                                        {/* Lower whisker: min → Q1 */}
                                        <Bar dataKey="_lower" stackId="box" fill="none" shape={<LowerWhiskerShape />} barSize={60} />
                                        {/* Box body: Q1 → Q3 (includes median line) */}
                                        <Bar dataKey="_box" stackId="box" fill="none" shape={<BoxBodyShape />} barSize={60} />
                                        {/* Upper whisker: Q3 → max */}
                                        <Bar dataKey="_upper" stackId="box" fill="none" shape={<UpperWhiskerShape />} barSize={60} />
                                    </ComposedChart>
                                )}
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
