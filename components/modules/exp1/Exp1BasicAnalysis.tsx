"use client";

import React, { useMemo } from "react";
import { useLabStore } from "@/store/useLabStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Info, Calculator, Database, AlertCircle } from "lucide-react";
import * as ss from "simple-statistics";

export const Exp1BasicAnalysis = () => {
  const { dataset, selectedColumns } = useLabStore();

  const stats = useMemo(() => {
    if (!dataset || dataset.length === 0) return null;

    return selectedColumns.map((header) => {
      const values = dataset
        .map((row) => row[header])
        .filter((v) => v !== null && v !== undefined && v !== "");
      
      const numericalValues = values.filter((v) => typeof v === "number") as number[];
      const isNumeric = numericalValues.length > values.length * 0.8; // Simple heuristic

      if (isNumeric && numericalValues.length > 0) {
        return {
          header,
          type: "Numerical" as const,
          count: values.length,
          missing: dataset.length - values.length,
          mean: ss.mean(numericalValues).toFixed(2),
          median: ss.median(numericalValues).toFixed(2),
          mode: ss.mode(numericalValues).toString(),
          min: ss.min(numericalValues),
          max: ss.max(numericalValues),
          stdDev: ss.standardDeviation(numericalValues).toFixed(2),
        };
      } else {
        // Categorical / String
        const counts = values.reduce((acc: Record<string, number>, v) => {
          acc[v.toString()] = (acc[v.toString()] || 0) + 1;
          return acc;
        }, {});
        
        const sortedCounts = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const mode = sortedCounts[0]?.[0] || "N/A";

        return {
          header,
          type: "Categorical" as const,
          count: values.length,
          missing: dataset.length - values.length,
          mean: "—",
          median: "—",
          mode: mode,
          min: "—",
          max: "—",
          stdDev: "—",
        };
      }
    });
  }, [dataset, selectedColumns]);

  if (!stats) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-none bg-white/50 dark:bg-slate-900/50 backdrop-blur-md shadow-xl overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <Calculator className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Descriptive Statistics</CardTitle>
                <CardDescription>Automatic variable detection and metric calculation</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10">
                  <TableRow>
                    <TableHead className="w-[150px]">Variable</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Mean</TableHead>
                    <TableHead className="text-right">Median</TableHead>
                    <TableHead className="text-right">Mode</TableHead>
                    <TableHead className="text-right">Std Dev</TableHead>
                    <TableHead className="text-right">Missing</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.map((stat) => (
                    <TableRow key={stat.header} className="hover:bg-primary/5 transition-colors group">
                      <TableCell className="font-bold text-foreground py-4">
                        {stat.header}
                      </TableCell>
                      <TableCell>
                        <Badge variant={stat.type === "Numerical" ? "default" : "secondary"} className="font-medium">
                          {stat.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{stat.mean}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{stat.median}</TableCell>
                      <TableCell className="text-right font-mono text-sm max-w-[100px] truncate" title={stat.mode as string}>
                        {stat.mode}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{stat.stdDev}</TableCell>
                      <TableCell className="text-right py-4">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${stat.missing > 0 ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          {stat.missing}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-none bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-4 w-4" />
                Theory Corner
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground leading-relaxed">
              <p className="mb-4">
                <strong>Descriptive Statistics</strong> provide simple summaries about the sample and the measures. These are split into:
              </p>
              <ul className="space-y-3 list-disc pl-4">
                <li><strong>Central Tendency:</strong> Includes mean, median, and mode.</li>
                <li><strong>Dispersion:</strong> Such as standard deviation and range.</li>
                <li><strong>Data Integrity:</strong> Detecting missing values and incorrect data types.</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-none bg-slate-50 dark:bg-slate-800/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl">
                  <Database className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-black">{dataset?.length || 0}</div>
                  <div className="text-xs text-muted-foreground uppercase font-bold tracking-tight">Total Observations</div>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/10 flex gap-3 items-start">
                <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                <p className="text-xs text-orange-700/80 font-medium">
                  Missing values were detected in {stats.filter(s => s.missing > 0).length} variables. Consider cleaning these before regression modules.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
