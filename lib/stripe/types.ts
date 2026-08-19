export interface StripeWebhookResponse {
    received: boolean;
    error?: string;
}

export interface IngestInvoicePayload {
    userId: string;
    stripeInvoiceId: string;
    stripeCustomerId: string;
    customerEmail: string;
    customerName?: string | null;
    customerPhone?: string | null;
    amountDue: number;
    currency: string;
    hostedInvoiceUrl?: string | null;
}

export interface WebhookEventGuard<T> {
    isValid: boolean;
    data: T | null;
    error?: string;
}