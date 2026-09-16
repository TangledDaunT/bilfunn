export type StartCheckoutInput = {
  userId: string;
  email: string;
  introPriceOre: number;
  renewalPriceOre: number;
  introDays: number;
  plate: string;
  returnUrl: string;
};

export type StartCheckoutResult = {
  provider: "MOCK" | "STRIPE" | "VIPPS";
  /** Redirect the browser here, or null when the charge completed inline (mock). */
  redirectUrl: string | null;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  providerAgreementId?: string | null;
  reference: string;
};

export type ChargeInput = {
  subscriptionId: string;
  amountOre: number;
  description: string;
  dueDate?: Date;
};

export type ChargeResult = {
  ok: boolean;
  providerPaymentId?: string | null;
  failureCode?: string | null;
};

export interface PaymentProvider {
  readonly name: "MOCK" | "STRIPE" | "VIPPS";
  startCheckout(input: StartCheckoutInput): Promise<StartCheckoutResult>;
  chargeRecurring(input: ChargeInput & { agreementId?: string | null; customerId?: string | null }): Promise<ChargeResult>;
  cancel(handle: { agreementId?: string | null; subscriptionId?: string | null }): Promise<void>;
  refund(providerPaymentId: string, amountOre: number): Promise<void>;
}
