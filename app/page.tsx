"use client";

import { useLabStore } from "@/store/useLabStore";
import { CSVUpload } from "@/components/CSVUpload";
import { DatasetPreview } from "@/components/DatasetPreview";
import { Toaster } from "@/components/ui/sonner";
import { BookOpen, FlaskConical, Play, Sparkles, Wand2, Calculator, BarChart3, Binary, ChevronRight, ChevronLeft, TrendingUp, Grid3X3, Layers, Database, Activity, Target, FileText } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { Exp1BasicAnalysis } from "@/components/modules/exp1/Exp1BasicAnalysis";
import { Exp2Visualization } from "@/components/modules/exp2/Exp2Visualization";
import { Exp3Sampling } from "@/components/modules/exp3/Exp3Sampling";
import { Exp4LinearRegression } from "@/components/modules/exp4/Exp4LinearRegression";
import { Exp5CorrelationMatrix } from "@/components/modules/exp5/Exp5CorrelationMatrix";
import { Exp6MultipleRegression } from "@/components/modules/exp6/Exp6MultipleRegression";
import { Exp7MLE } from "@/components/modules/exp7/Exp7MLE";
import { Exp8TTest } from "@/components/modules/exp8/Exp8TTest";
import { Exp9ZTest } from "@/components/modules/exp9/Exp9ZTest";
import { SummaryReport } from "@/components/modules/summary/SummaryReport";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ExportTool } from "@/components/ExportTool";

export default function Home() {
  const { dataset, resetLab } = useLabStore();
  const [activeModule, setActiveModule] = useState<number | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);

  // Handle hydration to prevent mismatch
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const modules = [
    { id: 1, title: "Basic Analysis", icon: Calculator, description: "Descriptive statistics and data type detection.", component: Exp1BasicAnalysis },
    { id: 2, title: "Data Visualization", icon: BarChart3, description: "Interactive distribution and frequency charts.", component: Exp2Visualization },
    { id: 3, title: "Sampling Techniques", icon: Binary, description: "Random and stratified sampling methods.", component: Exp3Sampling },
    { id: 4, title: "Linear Regression", icon: TrendingUp, description: "Simple linear model and R² score calculation.", component: Exp4LinearRegression },
    { id: 5, title: "Correlation Matrix", icon: Grid3X3, description: "Pearson coefficients and heatmaps.", component: Exp5CorrelationMatrix },
    { id: 6, title: "Multiple Regression", icon: Layers, description: "Multi-variable predictive model building.", component: Exp6MultipleRegression },
    { id: 7, title: "MLE Estimation", icon: Database, description: "Maximum Likelihood Estimation for distributions.", component: Exp7MLE },
    { id: 8, title: "T-Test", icon: Activity, description: "One-sample T-test for sample means.", component: Exp8TTest },
    { id: 9, title: "Z-Test", icon: Target, description: "One-sample Z-test with known population sigma.", component: Exp9ZTest },
    { id: 10, title: "Summary Report", icon: FileText, description: "Consolidated laboratory findings and audit.", component: SummaryReport },
  ];

  const ActiveComponent = activeModule !== null ? (modules.find(m => m.id === activeModule)?.component || null) : null;

  if (!hasHydrated) return null;

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 overflow-x-hidden pt-12 pb-32">
      <div className="absolute inset-0 z-[-1] pointer-events-none overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.05, 0.15, 0.05] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[20%] right-[-5%] w-[400px] h-[400px] bg-blue-500/20 rounded-full blur-[100px]"
        />
      </div>

      <div className="max-w-[1240px] px-8 mx-auto space-y-16">
        <header className="relative space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-7xl font-black font-heading tracking-tighter sm:text-8xl lg:text-9xl bg-gradient-to-br from-foreground to-foreground/40 bg-clip-text text-transparent pb-4 leading-[0.95]">
              Quant Analysis
            </h1>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-2xl text-muted-foreground/70 max-w-3xl font-medium leading-[1.5] tracking-tight"
          >
            Unlock data-driven insights through an immersive statistical platform.
            From descriptive foundations to advanced predictive modeling.
          </motion.p>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8"
        >
          {/* Analysis mode toggle removed */}
        </motion.div>

        <Separator className="bg-border/40" />

        {!dataset ? (
          <div className="max-w-4xl mx-auto py-20">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8 text-center"
            >
              <div className="space-y-4">
                <p className="text-xl text-muted-foreground/60 max-w-md mx-auto font-medium">Please provide a CSV dataset to initialize the analytical sequence.</p>
              </div>
              <div className="pt-4 scale-110">
                <CSVUpload />
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="space-y-20">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold font-heading inline-flex items-center gap-3">
                  Ingested Dataset
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetLab}
                  className="rounded-xl border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-500"
                >
                  <Sparkles className="" />
                  Clear Data
                </Button>
              </div>
              <DatasetPreview />
            </div>
          </div>
        )}

        {dataset && (
          <section className="space-y-12">
            <div className="flex items-center justify-between">
              <h3 className="text-3xl font-black font-heading tracking-tight inline-flex items-center gap-4">
                Analytical Modules
              </h3>
              {activeModule !== null && (
                <Button
                  variant="ghost"
                  onClick={() => setActiveModule(null)}
                  data-screenshot-hide="true"
                  className="rounded-xl font-bold text-muted-foreground hover:text-primary transition-colors"
                >
                  Back to Modules
                </Button>
              )}
            </div>

            <AnimatePresence mode="wait">
              {activeModule !== null && ActiveComponent ? (
                <motion.div
                  key="module-content"
                  id="capture-area"
                  className="w-full max-w-7xl mx-auto"
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: -10 }}
                  transition={{ duration: 0.4, ease: "circOut" }}
                >
                  <div className="mb-8 p-8 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-primary/20 rounded-[3rem] flex items-center justify-between gap-6 shadow-2xl shadow-primary/5">
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="px-3 py-1.5 rounded-full border-primary/30 text-primary font-black uppercase tracking-widest text-[10px] shrink-0">Experiment 0{activeModule}</Badge>
                        <h4 className="text-3xl font-black tracking-tighter truncate">
                          {modules.find(m => m.id === activeModule)?.title}
                        </h4>
                      </div>
                      <p className="text-lg text-muted-foreground font-medium">
                        {modules.find(m => m.id === activeModule)?.description}
                      </p>
                    </div>

                    {/* Prev / Next navigation */}
                    <div className="flex items-center gap-3 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setActiveModule(prev => prev !== null && prev > 1 ? prev - 1 : prev)}
                        disabled={activeModule === 1}
                        className="h-12 w-12 rounded-2xl border border-border/40 bg-white/60 dark:bg-slate-800/60 hover:border-primary/40 hover:text-primary disabled:opacity-30 transition-all duration-300"
                        aria-label="Previous module"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>
                      <span className="text-xs font-black uppercase tracking-widest text-muted-foreground tabular-nums">
                        {activeModule} / {modules.length}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setActiveModule(prev => prev !== null && prev < modules.length ? prev + 1 : prev)}
                        disabled={activeModule === modules.length}
                        className="h-12 w-12 rounded-2xl border border-border/40 bg-white/60 dark:bg-slate-800/60 hover:border-primary/40 hover:text-primary disabled:opacity-30 transition-all duration-300"
                        aria-label="Next module"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                  <ActiveComponent />
                </motion.div>
              ) : (
                <motion.div
                  key="module-grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
                >
                  {modules.map((mod, idx) => (
                    <motion.button
                      key={mod.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => mod.component !== null && setActiveModule(mod.id)}
                      disabled={mod.component === null}
                      className={cn(
                        "group relative text-left p-12 border border-border/40 rounded-[3rem] bg-white/60 dark:bg-slate-900/20 backdrop-blur-3xl transition-all duration-700",
                        mod.component !== null
                          ? "hover:border-primary/40 hover:shadow-[0_40px_80px_-15px_rgba(var(--primary-rgb),0.15)] hover:-translate-y-2 cursor-pointer"
                          : "opacity-40 grayscale-[0.8] cursor-not-allowed"
                      )}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-[3rem] z-[-1]" />

                      <div className="space-y-8">
                        <div className={cn(
                          "h-20 w-20 rounded-[1.75rem] flex items-center justify-center transition-all duration-700 shadow-2xl",
                          mod.component !== null ? "bg-primary text-white group-hover:rotate-[10deg] group-hover:scale-110" : "bg-muted text-muted-foreground"
                        )}>
                          <mod.icon className="h-10 w-10" />
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary/60">Module 0{mod.id}</span>
                            {mod.component !== null && <ChevronRight className="h-5 w-5 text-primary opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-500" />}
                          </div>
                          <h4 className="text-3xl font-black tracking-tighter text-foreground leading-[1.1]">{mod.title}</h4>
                          <p className="text-base text-muted-foreground font-medium leading-relaxed opacity-80 line-clamp-2">
                            {mod.description}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}
      </div>

      <Toaster position="bottom-right" theme="light" />
      <ExportTool />
    </main>
  );
}
