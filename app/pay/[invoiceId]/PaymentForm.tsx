"use client";

import { useState } from "react";
import {
  useStripe,
  useElements,
  PaymentElement,
} from "@stripe/react-stripe-js";
import { Lock, ShieldCheck, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface PaymentFormProps {
  invoiceId: string;
  customerName: string;
  companyName: string;
  amountFormatted: string;
}

export default function PaymentForm({
  invoiceId,
  customerName,
  companyName,
  amountFormatted,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Confirm the SetupIntent
      const { error: submitError, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: "if_required",
      });

      if (submitError) {
        setErrorMessage(submitError.message || "Failed to validate card details.");
        setIsProcessing(false);
        return;
      }

      if (setupIntent && setupIntent.status === "succeeded") {
        const paymentMethodId =
          typeof setupIntent.payment_method === "string"
            ? setupIntent.payment_method
            : setupIntent.payment_method?.id;

        // Trigger immediate re-payment endpoint
        const response = await fetch(`/api/pay/${invoiceId}/retry`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentMethodId }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Payment processing failed.");
        }

        setIsSuccess(true);
      } else {
        setErrorMessage("Card verification could not be completed.");
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Payment Updated!</h2>
        <p className="text-sm text-gray-600 max-w-md mx-auto">
          Thank you, <span className="font-semibold text-gray-800">{customerName}</span>. Your payment method for{" "}
          <span className="font-semibold text-gray-800">{companyName}</span> of{" "}
          <span className="font-bold text-emerald-600">{amountFormatted}</span> has been processed successfully.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMessage && (
        <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 p-3.5 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="space-y-3">
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
          Card Details
        </label>
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
          <PaymentElement />
        </div>
      </div>

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold py-3.5 px-6 rounded-xl text-sm transition-all shadow-sm"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Processing Payment...</span>
          </>
        ) : (
          <>
            <Lock className="w-4 h-4" />
            <span>Update & Pay {amountFormatted}</span>
          </>
        )}
      </button>

      <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <span>Secured with 256-bit Stripe encryption</span>
      </div>
    </form>
  );
}