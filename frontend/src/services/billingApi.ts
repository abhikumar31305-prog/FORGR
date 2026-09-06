/**
 * Razorpay Subscription & Institutional Billing API Client
 */

import { apiRequest } from '../api/client'

export interface BillingPlan {
  id: string
  name: string
  description: string
  profile_limit: number
  monthly_price_inr: number
  yearly_price_inr: number
  popular?: boolean
  features: string[]
}

export interface BillingPlansResponse {
  currency: string
  currency_symbol: string
  plans: BillingPlan[]
  annual_discount_percentage: number
  is_simulation_mode: boolean
  razorpay_key_id: string
}

export interface SubscriptionStatus {
  admin_email: string
  plan_id: string
  plan_name: string
  billing_cycle: 'monthly' | 'yearly'
  status: 'trialing' | 'active' | 'past_due' | 'expired' | 'cancelled'
  is_valid: boolean
  days_remaining: number
  trial_end: string | null
  current_period_end: string | null
  current_profiles: number
  profile_limit: number
  quota_exceeded: boolean
  can_import: boolean
  is_simulation_mode: boolean
  razorpay_key_id: string
}

export interface CreateOrderResponse {
  order_id: string
  amount_paise: number
  amount_inr: number
  currency: string
  key_id: string
  plan_id: string
  billing_cycle: string
  profile_limit: number
  is_simulation: boolean
}

export interface TransactionItem {
  id: number
  order_id: string
  payment_id: string
  amount_inr: number
  status: string
  plan_id: string
  billing_cycle: string
  profile_limit: number
  date: string
}

export async function getBillingPlans(): Promise<BillingPlansResponse> {
  return apiRequest<BillingPlansResponse>('/api/billing/plans')
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  return apiRequest<SubscriptionStatus>('/api/billing/status')
}

export async function createRazorpayOrder(
  planId: string,
  billingCycle: 'monthly' | 'yearly',
  customProfiles?: number,
): Promise<CreateOrderResponse> {
  return apiRequest<CreateOrderResponse>('/api/billing/create-order', {
    method: 'POST',
    body: JSON.stringify({
      plan_id: planId,
      billing_cycle: billingCycle,
      custom_profiles: customProfiles,
    }),
  })
}

export async function verifyPayment(
  orderId: string,
  paymentId: string,
  signature: string,
): Promise<{ status: string; message: string; subscription: Partial<SubscriptionStatus> }> {
  return apiRequest('/api/billing/verify-payment', {
    method: 'POST',
    body: JSON.stringify({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    }),
  })
}

export async function getPaymentTransactions(): Promise<TransactionItem[]> {
  return apiRequest<TransactionItem[]>('/api/billing/transactions')
}

export async function simulateTestSubscription(
  planId: string = 'growth',
  billingCycle: 'monthly' | 'yearly' = 'yearly',
  profileLimit: number = 2500,
  expireNow: boolean = false,
): Promise<any> {
  return apiRequest('/api/billing/simulate-test-subscription', {
    method: 'POST',
    body: JSON.stringify({
      plan_id: planId,
      billing_cycle: billingCycle,
      profile_limit: profileLimit,
      expire_now: expireNow,
    }),
  })
}

/**
 * Dynamically loads Razorpay checkout SDK script
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.getElementById('razorpay-checkout-script')) {
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.id = 'razorpay-checkout-script'
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}
