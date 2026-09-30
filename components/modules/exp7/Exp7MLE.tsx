"use client";

import React, { useState, useMemo } from "react";
import { useLabStore } from "@/store/useLabStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { AreaChart, Area } from "recharts";
import { Target, Info, Activity, Database, Shapes } from "lucide-react";
import * as ss from "simple-statistics";

export const Exp7MLE = () => {
    const { dataset, selectedColumns } = useLabStore();
    const [selectedVar, setSelectedVar] = useState<string>("");
    const [distribution, setDistribution] = useState<string>("normal");

    const numericalHeaders = useMemo(() => {
        if (!dataset) return [];
        return selectedColumns.filter(h => {
             const sample = dataset.slice(0, 10).map(r => r[h]).filter(v => v !== null && v !== undefined);
             return sample.every(v => typeof v === 'number');
        });
    }, [dataset, selectedColumns]);

    const mleResults = useMemo(() => {
        if (!dataset || !selectedVar) return null;

        const values = dataset.map(r => r[selectedVar]).filter(v => typeof v === 'number') as number[];
        if (values.length < 2) return null;

        let parameters: Record<string, string> = {};
        let densData: any[] = [];

        if (distribution === "normal") {
            const mu = ss.mean(values);
            const sigma = ss.standardDeviation(values);
            parameters = { "Mean (μ)": mu.toFixed(4), "Std Dev (σ)": sigma.toFixed(4) };

            const min = mu - 3 * sigma;
            const max = mu + 3 * sigma;
            for (let i = 0; i <= 50; i++) {
                const x = min + (i / 50) * (max - min);
                const y = (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mu) / sigma, 2));
                densData.push({ x: x.toFixed(2), y: +y.toFixed(6) });
            }
        } else if (distribution === "poisson") {
            const lambda = ss.mean(values);
            parameters = { "Lambda (λ)": lambda.toFixed(4) };

            const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));
            for (let k = 0; k <= Math.max(20, Math.ceil(lambda * 3)); k++) {
                const y = (Math.pow(lambda, k) * Math.exp(-lambda)) / fact(k);
                densData.push({ x: k.toString(), y: +y.toFixed(6) });
            }
        } else if (distribution === "exponential") {
            // MLE for exponential: λ̂ = 1 / x̄  (only valid for positive values)
            const positiveVals = values.filter(v => v > 0);
            if (positiveVals.length < 2) return null;
            const xBar = ss.mean(positiveVals);
            const lambda = 1 / xBar;
            const expMean = xBar;
            const expVariance = 1 / (lambda ** 2);
            const expSD = Math.sqrt(expVariance);
            parameters = {
                "Rate (λ̂)": lambda.toFixed(6),
                "Mean (1/λ)": expMean.toFixed(4),
                "Variance (1/λ²)": expVariance.toFixed(4),
                "Std Dev": expSD.toFixed(4),
            };

            // PDF: f(x) = λ·e^(−λx)  for x ≥ 0
            const xMax = expMean + 4 * expSD; // ~99% of mass
            for (let i = 0; i <= 60; i++) {
                const x = (i / 60) * xMax;
                const y = lambda * Math.exp(-lambda * x);
                densData.push({ x: x.toFixed(3), y: +y.toFixed(6) });
            }
        }

        return { parameters, densData };
    }, [dataset, selectedVar, distribution]);

    if (!dataset) return null;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <Card className="lg:col-span-1 border-none bg-white/40 dark:bg-slate-900/40 backdrop-blur-md shadow-lg h-fit">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                             <Shapes className="h-4 w-4 text-primary" />
                             Likelihood Setup
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Distribution Type</Label>
                            <Select value={distribution} onValueChange={(val) => setDistribution(val || "normal")}>
                                <SelectTrigger className="h-12 bg-white dark:bg-slate-800 rounded-xl">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="normal" className="rounded-lg">Normal (Gaussian)</SelectItem>
                                    <SelectItem value="poisson" className="rounded-lg">Poisson</SelectItem>
                                    <SelectItem value="exponential" className="rounded-lg">Exponential</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Variable</Label>
                            <Select value={selectedVar} onValueChange={(val) => setSelectedVar(val || "")}>
                                <SelectTrigger className="h-12 bg-white dark:bg-slate-800 rounded-xl">
                                    <SelectValue placeholder="Select Variable" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {numericalHeaders.map(h => <SelectItem key={h} value={h} className="rounded-lg">{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {mleResults && (
                            <div className="pt-4 space-y-3">
                                <Label className="text-[10px] font-black uppercase text-primary tracking-widest">MLE Parameters</Label>
                                {Object.entries(mleResults.parameters).map(([k, v]) => (
                                    <div key={k} className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex justify-between items-center">
                                        <span className="text-xs font-bold text-muted-foreground">{k}</span>
                                        <span className="text-base font-black text-primary tabular-nums">{v}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Distribution theory card */}
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                {distribution === "normal" ? "Normal Distribution"
                                    : distribution === "poisson" ? "Poisson Distribution"
                                    : "Exponential Distribution"}
                            </p>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                {distribution === "normal"
                                    ? "Symmetric bell curve. MLE: μ̂ = x̄, σ̂ = sample std dev."
                                    : distribution === "poisson"
                                    ? "Models event counts. MLE: λ̂ = x̄ (rate of occurrence)."
                                    : "Models time between events. MLE: λ̂ = 1/x̄. Requires positive values. Memoryless property."}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-3 border-none bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-2xl overflow-hidden min-h-[500px]">
                    <CardHeader className="flex flex-row items-center justify-between pb-8">
                        <div>
                            <CardTitle className="text-2xl font-black bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Estimated Probability Density</CardTitle>
                            <CardDescription>Theoretical distribution based on Maximum Likelihood Parameters</CardDescription>
                        </div>
                        <Target className="h-8 w-8 text-primary/40" />
                    </CardHeader>
                    <CardContent className="h-[400px]">
                        {mleResults ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={mleResults.densData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorY" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.1)" />
                                    <XAxis dataKey="x" fontSize={11} axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))'}} />
                                    <YAxis fontSize={11} axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))'}} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)' }}
                                    />
                                    <Area type="monotone" dataKey="y" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorY)" strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                                    <div className="p-8 bg-primary/5 rounded-full text-primary/20">
                                        <Database className="h-16 w-16" />
                                    </div>
                                    <h4 className="text-xl font-bold">Parameters Undefined</h4>
                                    <p className="text-sm text-muted-foreground max-w-xs">Select a distribution and a variable to estimate parameters using Maximum Likelihood Estimation.</p>
                                </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
