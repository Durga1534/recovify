"use client"

import { useState } from "react"
import {useRouter} from "next/navigation";
import {Send, StopCircle, Loader2} from "lucide-react"

interface ManualActionsProps {
    invoiceId: string;
    isRecovered: boolean;
}

export default function ManualActions({invoiceId, isRecovered}: ManualActionsProps) {
    const router = useRouter();
    const [remindLoading, setRemindLoading] = useState(false);
    const [cancelLoading, setCancelLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const handleSendReminder = async () => {
        setRemindLoading(true);
        setMessage(null);
        try {
            const res = await fetch(`/api/invoices/${invoiceId}/remind`, {
                method: "POST",
            });
            const data = await res.json();

            if(!res.ok) throw new Error(data.error || "Failed to send reminder");
            setMessage("Instant reminder dispatched successfully!");
            router.refresh();
        } catch (err: unknown) {
            setMessage(err instanceof Error ? err.message : "Error sending reminder");
        } finally {
            setRemindLoading(false);
        }
    };

    const handleStopSequence = async () => {
        setCancelLoading(true);
        setMessage(null);
        try{
            const res = await fetch(`/api/invoices/${invoiceId}/cancel`, {
                method: "POST",
            });
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Failed to halt sequence");
            setMessage("Sequence stopper. Further delayed messages aborted.");
            router.refresh();
        } catch (err: unknown) {
            setMessage(err instanceof Error ? err.message : "Error stopping sequence");
        } finally {
            setCancelLoading(false);
        }
    };

    if(isRecovered) {
        return (
            <div className="p-4 bg-emerald-500 border border-emerald-800 rounded-xl text-xs text-emerald-800 font-semibold text-center">
                This invoice has been recovered. Sequence triggers are disabled.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {message && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl text-xs font-semibold ">
                    {message}
                </div>   
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={handleSendReminder}
                  disabled={remindLoading || cancelLoading}
                  className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-colors shadow-sm cursor-pointer"
                >
                    {remindLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ): (
                        <Send className="w-4 h-4" />
                    )}
                    <span>Send Instant Email Reminder</span>
                    </button> 

                    <button
                      onClick={handleStopSequence}
                      disabled={remindLoading || cancelLoading}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 border border-rose-200 font-bold text-xs py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
                    >
                        {cancelLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ): (
                            <StopCircle className="w-4 h-4" />
                        )}
                        <span>Stop Sequence</span>
                    </button>  
            </div>
        </div>
    );
}