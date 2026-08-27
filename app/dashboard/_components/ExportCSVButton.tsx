"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

export default function ExportCSVButton() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);

      const response = await fetch("/api/invoices/export");
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-recovery-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download CSV:", err);
      alert("Failed to export CSV. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-bold px-4 py-2.5 rounded-xl text-xs transition-colors shadow-sm disabled:opacity-50"
    >
      {isExporting ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          <span>Generating CSV...</span>
        </>
      ) : (
        <>
          <Download className="w-4 h-4 text-gray-500" />
          <span>Export CSV</span>
        </>
      )}
    </button>
  );
}