declare module 'react-native-razorpay' {
  export type RazorpayOptions = {
    key: string;
    amount: number | string;
    currency?: string;
    name?: string;
    description?: string;
    order_id?: string;
    prefill?: {
      name?: string;
      email?: string;
      contact?: string;
    };
    notes?: Record<string, string>;
    theme?: {
      color?: string;
    };
    [key: string]: unknown;
  };

  export type PaymentSuccessData = {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
  };

  export type PaymentErrorData = {
    code: number;
    description: string;
  };

  const RazorpayCheckout: {
    open: (options: RazorpayOptions) => Promise<PaymentSuccessData>;
  };

  export default RazorpayCheckout;
}
