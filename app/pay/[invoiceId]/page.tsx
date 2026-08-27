"use client";

import { useEffect, useState, use } from "react";
import { useSearchParams } from "next/navigation";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { CreditCard, Loader2, AlertCircle } from "lucide-react";
import PaymentForm from "./PaymentForm";

interface PageProps {
  params: Promise<{ invoiceId: string }>;
}

export default function CustomerPayPage({ params }: PageProps) {
  const { invoiceId } = use(params);
  const token = useSearchParams().get("token");

  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<{
    customerName: string;
    customerEmail: string;
    amountFormatted: string;
    companyName: string;
  } | null>(null);

  useEffect(() => {
    async function initSession() {
      try {
        const res = await fetch(`/api/pay/${invoiceId}/setup-intent?token=${encodeURIComponent(token || "")}`, {
          method: "POST",
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Invoice not found or already settled.");
          return;
        }

        setClientSecret(data.clientSecret);
        setDetails({
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          amountFormatted: data.amountFormatted,
          companyName: data.companyName,
        });

        // Initialize Stripe with connected account context
        const stripe = loadStripe(
          process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
          { stripeAccount: data.stripeAccountId }
        );
        setStripePromise(stripe);
      } catch {
        setError("Failed to load payment details.");
      } finally {
        setLoading(false);
      }
    }

    initSession();
  }, [invoiceId, token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
          <span>Loading payment details...</span>
        </div>
      </div>
    );
  }

  if (error || !clientSecret || !stripePromise || !details) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Notice</h1>
          <p className="text-sm text-gray-600">{error || "Unable to retrieve invoice details."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="max-w-md w-full space-y-6">
        {/* Header Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <CreditCard className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {details.companyName}
          </h1>
          <p className="text-xs text-gray-500">Update payment details for outstanding invoice</p>
        </div>

        {/* Invoice Summary Card */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-4 border-b border-gray-100">
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase">Customer</p>
              <p className="text-sm font-semibold text-gray-800">{details.customerName}</p>
              <p className="text-xs text-gray-500">{details.customerEmail}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 font-semibold uppercase">Amount Due</p>
              <p className="text-lg font-bold text-indigo-600">{details.amountFormatted}</p>
            </div>
          </div>

          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: { theme: "stripe" },
            }}
          >
            <PaymentForm
              invoiceId={invoiceId}
              customerName={details.customerName}
              companyName={details.companyName}
              amountFormatted={details.amountFormatted}
              paymentToken={token || ""}
            />
          </Elements>
        </div>
      </div>
    </div>
  );
}