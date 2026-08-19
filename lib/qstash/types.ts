export interface RecoveryJobPayload {
    failedInvoiceId: string;
    stripeInvoiceId: string;
    customerEmail: string;
    customerPhone?: string | null;
    customerName?: string | null;
    amountDue: number;
    currency: string;
    hostedInvoiceUrl?: string | null;
    step: 1 | 2 | 3;
}

export interface QStashWorkerResponse {
    success: boolean;
    message: string;
    error?: string;
}