import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Download } from 'lucide-react';

interface ExportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  showFilterButton?: boolean;
  onFilter?: (from: Date, to: Date) => void;
}

export function ExportDialog({ isOpen, onOpenChange, title, showFilterButton, onFilter }: ExportDialogProps) {
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });

  const handleExport = () => {
    if (!dateRange.from || !dateRange.to) {
      return;
    }
    // TODO: Implement actual export logic here
    console.log('Exporting data from', dateRange.from, 'to', dateRange.to);
    onOpenChange(false);
    setDateRange({ from: undefined, to: undefined });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Download className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg w-full mx-4 p-6">
        <DialogHeader className="text-center">
          <DialogTitle>{title ?? 'Export Expense Data'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <label className="text-sm font-medium text-center block">Select Date Range</label>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-start">
              <div className="flex flex-col items-center space-y-2 min-w-0">
                <label className="text-xs text-muted-foreground">From Date</label>
                <div className="w-fit">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                    className="rounded-md border"
                  />
                </div>
              </div>
              <div className="flex flex-col items-center space-y-2 min-w-0">
                <label className="text-xs text-muted-foreground">To Date</label>
                <div className="w-fit">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                    className="rounded-md border"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-3 flex-wrap">
            {showFilterButton && (
              <Button
                variant="outline"
                onClick={() => onFilter?.(dateRange.from!, dateRange.to!)}
              >
                Filter
              </Button>
            )}
            <Button
              onClick={handleExport}
              disabled={!dateRange.from || !dateRange.to}
            >
              Export
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}