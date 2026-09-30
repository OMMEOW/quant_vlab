"use client";

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { Upload, FileType, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLabStore } from '@/store/useLabStore';
import { toast } from 'sonner';

export const CSVUpload = () => {
  const { setDataset } = useLabStore();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const headers = Object.keys(results.data[0] as object);
            setDataset(results.data, headers);
            toast.success(`Successfully loaded ${results.data.length} rows`);
          } else {
            toast.error("CSV file appears to be empty");
          }
        },
        error: (error) => {
          toast.error(`Error parsing CSV: ${error.message}`);
        }
      });
    }
  }, [setDataset]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    multiple: false
  });

  return (
    <Card className="w-full border-2 border-dashed border-muted-foreground/25 bg-card/50 hover:bg-card/80 transition-colors cursor-pointer">
      <div {...getRootProps()} className="p-12 outline-none">
        <input {...getInputProps()} />
        <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="p-4 rounded-full bg-primary/10 text-primary animate-pulse">
            <Upload className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold tracking-tight">Upload Dataset</h3>
            <p className="text-muted-foreground max-w-xs">
              {isDragActive 
                ? "Drop the file here..." 
                : "Drag & drop your CSV file here, or click to browse"}
            </p>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground mt-4">
            <div className="flex items-center gap-1">
              <FileType className="h-3 w-3" />
              <span>CSV Format</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              <span>Auto-detect Types</span>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
};
