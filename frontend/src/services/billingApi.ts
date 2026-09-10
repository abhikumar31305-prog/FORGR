/**
 * Razorpay Subscription & Institutional Billing API Client
 */

import { apiRequest } from '../api/client'

export interface RazorpayInstance {
  open: () => void
  on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance
  }
}

export interface SimulatedSubscriptionResponse {
  status: string
  plan_id: string
  subscription_status: string
  profile_limit: number
  expires_at: string | null
}

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
  gateway_mode?: 'test' | 'live' | 'simulation'
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
  gateway_mode?: 'test' | 'live' | 'simulation'
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
  gateway_mode?: 'test' | 'live' | 'simulation'
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
): Promise<SimulatedSubscriptionResponse> {
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

export function calculateCustomPlanPrice(profiles: number, billingCycle: 'monthly' | 'yearly'): {
  monthly: number
  total: number
  rate: number
  baseRateUsd: number
  effectiveRateUsd: number
  totalUsd: number
  monthlyUsd: number
  tierTag: string
} {
  const count = Math.max(10, profiles)
  const baseRateUsd = count <= 500 ? 1.50 : count <= 2500 ? 1.20 : 0.90
  const tierTag =
    count <= 500
      ? 'Departmental pilot'
      : count <= 2500
      ? 'Campus volume discount'
      : 'University enterprise tier'

  const effectiveRateUsd = billingCycle === 'yearly' ? baseRateUsd * 0.8 : baseRateUsd
  const monthlyUsd = Math.round(count * effectiveRateUsd)
  const totalUsd = billingCycle === 'yearly' ? monthlyUsd * 12 : monthlyUsd

  const USD_TO_INR = 83.0
  const totalInr = Math.round(totalUsd * USD_TO_INR)
  const monthlyInr = Math.round(monthlyUsd * USD_TO_INR)
  const rateInr = Math.round(effectiveRateUsd * USD_TO_INR * 100) / 100

  return {
    monthly: monthlyInr,
    total: totalInr,
    rate: rateInr,
    baseRateUsd,
    effectiveRateUsd,
    totalUsd,
    monthlyUsd,
    tierTag,
  }
}

