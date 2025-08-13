export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
  price: number;
}

export const stripeProducts: StripeProduct[] = [
  {
    id: 'trial_product',
    priceId: 'trial_price',
    name: '7-Day Free Trial',
    description: 'Get started with full access to AI workflows',
    mode: 'subscription',
    price: 0.00,
  },
  {
    id: import.meta.env.VITE_STRIPE_PRO_PRODUCT_ID || 'prod_SqmQgEphHNdPVG',
    priceId: import.meta.env.VITE_STRIPE_PRO_PRICE_ID || 'price_1Rv4rDBacFXEnBmNDMrhMqOH',
    name: 'Go Pro',
    description: 'Advanced AI workflows with 7-day free trial',
    mode: 'subscription',
    price: 45.00,
  },
];

export const getProductById = (id: string): StripeProduct | undefined => {
  return stripeProducts.find(product => product.id === id);
};

export const getProductByPriceId = (priceId: string): StripeProduct | undefined => {
  return stripeProducts.find(product => product.priceId === priceId);
};