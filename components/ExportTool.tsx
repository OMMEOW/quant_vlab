"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Save, Download, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const ExportTool = () => {
    const [isCapturing, setIsCapturing] = useState(false);

    const captureScreen = async () => {
        setIsCapturing(true);
        const labElement = document.getElementById('capture-area');

        if (!labElement) {
            toast.error("Please enter a module before capturing.");
            setIsCapturing(false);
            return;
        }

        try {
            await new Promise(resolve => setTimeout(resolve, 300));

            const canvas = await html2canvas(labElement, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#f8fafc",
                logging: false,
                onclone: (clonedDoc) => {
                    const hideElements = clonedDoc.querySelectorAll('[data-screenshot-hide="true"]');
                    hideElements.forEach(el => (el as HTMLElement).style.display = 'none');
                }
            });

            const dataUrl = canvas.toDataURL("image/png");
            
            // Save to local reports folder via API
            const filename = `Experiment_Report_${new Date().getTime()}.png`;
            const response = await fetch('/api/save-capture', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: dataUrl, filename }),
            });

            if (!response.ok) throw new Error('Failed to save report');

            toast.success("Module report captured and saved to 'reports/' directory.", {
                icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
            });
        } catch (error) {
            console.error(error);
            toast.error("Capture sequence failed.");
        } finally {
            setIsCapturing(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="fixed bottom-10 right-10 z-[100]"
        >
            <div className="relative group">
                {/* Visual feedback glow */}
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                
                <Button
                    onClick={captureScreen}
                    disabled={isCapturing}
                    className="relative px-8 h-20 rounded-[2rem] bg-slate-900 dark:bg-slate-900 text-white shadow-2xl border-4 border-white/5 flex items-center gap-4 transition-all duration-500 hover:scale-[1.05] active:scale-[0.98] overflow-hidden"
                >
                    {isCapturing ? (
                        <>
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <div className="text-left">
                                <span className="text-xs font-black uppercase text-primary tracking-widest block">Generating</span>
                                <span className="text-lg font-black tracking-tighter uppercase italic">HD Report...</span>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="p-3 bg-primary rounded-2xl shadow-lg shadow-primary/20 transition-transform group-hover:rotate-12">
                                <Camera className="h-6 w-6 text-white" />
                            </div>
                            <div className="text-left">
                                <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-0.5">Export Module</div>
                                <div className="text-lg font-black tracking-tighter leading-none italic flex items-center gap-2">
                                    Capture Report
                                </div>
                            </div>
                        </>
                    )}

                    {/* Scanning animation during idle */}
                    {!isCapturing && (
                        <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[30deg] animate-[shimmer_3s_infinite]" />
                    )}
                </Button>
            </div>
        </motion.div>
    );
};
