export function toBoolean(value) {
  return value === true || value === "true" || value === 1 || value === "1" || value === "yes" || value === "Y";
}

export function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function householdSizeKey(value) {
  const size = Math.max(1, Math.round(toNumber(value, 1)));
  return size >= 7 ? "7+" : String(size);
}

export function normalizeRegionType(input = {}) {
  const raw = String(input.region_type ?? input.regionType ?? "").trim().toLowerCase();
  if (["speculative", "regulated", "투기", "규제", "과열", "조정"].includes(raw)) return "speculative";
  if (["metro", "capital", "수도권", "서울", "경기", "인천"].includes(raw)) return "metro";
  if (["non_metro", "local", "비수도권", "지방"].includes(raw)) return "non_metro";

  const region = String(input.region ?? "");
  const zone = String(input.regulation_zone ?? input.zone ?? "");
  if (/투기|과열|규제|조정/.test(zone)) return "speculative";
  if (/서울|경기|인천|수도권/.test(region)) return "metro";
  return "non_metro";
}

export function normalizeApplicant(input = {}) {
  return {
    ...input,
    region_type: normalizeRegionType(input),
    subscription_months: toNumber(input.subscription_months ?? input.subscriptionMonths),
    subscription_payments: toNumber(input.subscription_payments ?? input.subscriptionPayments),
    is_householder: toBoolean(input.is_householder ?? input.isHouseholder),
    is_homeless_household: toBoolean(input.is_homeless_household ?? input.isHomelessHousehold ?? input.is_homeless),
    is_married: toBoolean(input.is_married ?? input.isMarried),
    is_first_home_purchase: toBoolean(input.is_first_home_purchase ?? input.isFirstHomePurchase),
    children_count: toNumber(input.children_count ?? input.childrenCount),
    household_size_key: householdSizeKey(input.household_size ?? input.householdSize),
    monthly_income_krw: toNumber(input.monthly_income_krw ?? input.monthlyIncomeKrw),
    price_krw: toNumber(input.price_krw ?? input.priceKrw),
    cash_krw: toNumber(input.cash_krw ?? input.cashKrw),
    contract_rate: toNumber(input.contract_rate ?? input.contractRate, 0.1),
    middle_payment_rate: toNumber(input.middle_payment_rate ?? input.middlePaymentRate, 0.6),
    special_supply_type: String(input.special_supply_type ?? input.specialSupplyType ?? "").trim(),
  };
}
