"use client";

import { useLabStore } from '@/store/useLabStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Columns, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";

export const DatasetPreview = () => {
  const { dataset, headers, selectedColumns, setSelectedColumns } = useLabStore();

  if (!dataset || dataset.length === 0) return null;

  const toggleColumn = (header: string) => {
    setSelectedColumns(
      selectedColumns.includes(header)
        ? selectedColumns.filter(c => c !== header)
        : [...selectedColumns, header]
    );
  };

  // Show only first 5 rows for preview
  const previewData = dataset.slice(0, 5);

  return (
    <Card className="mt-8 border-none bg-card/40 backdrop-blur-md shadow-xl overflow-hidden">
      <CardHeader className="border-b bg-muted/20 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Dataset Preview</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Showing first 5 rows of {dataset.length} loaded</p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger>
                <div className="ml-auto h-10 rounded-xl bg-white/50 border border-primary/20 hover:bg-white hover:border-primary/40 transition-all flex items-center gap-2 px-4 shadow-sm group cursor-pointer">
                  <Columns className="h-4 w-4 text-primary opacity-70 group-hover:opacity-100 transition-opacity" />
                  <span className="text-xs font-bold uppercase tracking-wider">Visible Fetures</span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[240px] rounded-2xl p-2 bg-white/95 backdrop-blur-xl border-primary/10 shadow-2xl animate-in zoom-in-95 duration-200">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground px-3 py-2">Select Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-primary/5" />
                </DropdownMenuGroup>
                <ScrollArea className="h-[300px]">
                  {headers.map((header) => (
                    <DropdownMenuCheckboxItem
                      key={header}
                      className="rounded-lg py-3 cursor-pointer focus:bg-primary/5 font-medium"
                      checked={selectedColumns.includes(header)}
                      onCheckedChange={() => toggleColumn(header)}
                    >
                      {header}
                    </DropdownMenuCheckboxItem>
                  ))}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="px-4 py-2 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-xl border border-primary/20">
            {selectedColumns.length} / {headers.length} Selected
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="w-full">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                {headers.filter(h => selectedColumns.includes(h)).map((header) => (
                  <TableHead key={header} className="font-bold text-foreground whitespace-nowrap px-8 py-5 uppercase tracking-[0.15em] text-[10px] border-l first:border-l-0 border-muted/30">
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewData.map((row, i) => (
                <TableRow key={i} className="hover:bg-primary/5 transition-colors group">
                  {headers.filter(h => selectedColumns.includes(h)).map((header) => (
                    <TableCell key={header} className="px-8 py-5 text-sm font-semibold tabular-nums border-b border-muted/20 border-l first:border-l-0">
                      {row[header]?.toString() ?? <span className="text-muted-foreground/30 italic">null</span>}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
