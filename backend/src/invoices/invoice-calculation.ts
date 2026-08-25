import { BadRequestException } from '@nestjs/common';
import { DiscountType } from '../common/enums';
import { toMinorUnits } from '../common/money';

export type InvoiceCalculationLine = {
  quantity: number;
  unitPriceMinor: number;
};

export type InvoiceCalculationInput = {
  lines: InvoiceCalculationLine[];
  discountType?: DiscountType;
  discountValue?: number;
  taxEnabled?: boolean;
  taxRate?: number;
};

export type InvoiceCalculationResult = {
  lineTotalsMinor: number[];
  subtotalMinor: number;
  discountType: DiscountType;
  discountValue: number;
  discountRateBps: number;
  discountAmountMinor: number;
  taxableAmountMinor: number;
  taxEnabled: boolean;
  taxRate: number;
  taxRateBps: number;
  taxAmountMinor: number;
  totalAmountMinor: number;
};

export function calculateInvoiceAmounts(
  input: InvoiceCalculationInput,
): InvoiceCalculationResult {
  if (!input.lines.length) {
    throw new BadRequestException('An invoice must contain at least one item');
  }

  const lineTotalsMinor = input.lines.map((line) => {
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
      throw new BadRequestException('Item quantity must be a positive integer');
    }
    if (!Number.isInteger(line.unitPriceMinor) || line.unitPriceMinor < 0) {
      throw new BadRequestException('Item unit price must be a valid amount');
    }
    const total = line.quantity * line.unitPriceMinor;
    if (!Number.isSafeInteger(total)) {
      throw new BadRequestException('Invoice amount is too large');
    }
    return total;
  });
  const subtotalMinor = lineTotalsMinor.reduce(
    (sum, amount) => sum + amount,
    0,
  );

  const requestedDiscountValue = Number(input.discountValue ?? 0);
  if (!Number.isFinite(requestedDiscountValue) || requestedDiscountValue < 0) {
    throw new BadRequestException('discountValue must be a valid amount');
  }
  const discountType = resolveDiscountType(
    input.discountType,
    requestedDiscountValue,
  );
  const discountValue =
    discountType === DiscountType.NONE ? 0 : requestedDiscountValue;
  let discountRateBps = 0;
  let discountAmountMinor = 0;

  if (discountType === DiscountType.FIXED) {
    discountAmountMinor = toMinorUnits(discountValue);
  } else if (discountType === DiscountType.PERCENTAGE) {
    discountRateBps = percentageToBasisPoints(discountValue, 'discountValue');
    discountAmountMinor = percentageOf(subtotalMinor, discountRateBps);
  }

  if (discountAmountMinor > subtotalMinor) {
    throw new BadRequestException('Discount cannot exceed subtotal');
  }

  const taxableAmountMinor = subtotalMinor - discountAmountMinor;
  const taxEnabled = input.taxEnabled === true;
  const taxRate = taxEnabled ? Number(input.taxRate ?? 0) : 0;
  const taxRateBps = taxEnabled
    ? percentageToBasisPoints(taxRate, 'taxRate')
    : 0;
  const taxAmountMinor = percentageOf(taxableAmountMinor, taxRateBps);

  return {
    lineTotalsMinor,
    subtotalMinor,
    discountType,
    discountValue,
    discountRateBps,
    discountAmountMinor,
    taxableAmountMinor,
    taxEnabled,
    taxRate,
    taxRateBps,
    taxAmountMinor,
    totalAmountMinor: taxableAmountMinor + taxAmountMinor,
  };
}

function resolveDiscountType(
  requestedType: DiscountType | undefined,
  discountValue: number,
) {
  if (requestedType) return requestedType;
  return discountValue > 0 ? DiscountType.FIXED : DiscountType.NONE;
}

function percentageToBasisPoints(value: number, field: string) {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new BadRequestException(`${field} must be between 0 and 100`);
  }
  return Math.round((value + Number.EPSILON) * 100);
}

function percentageOf(amountMinor: number, rateBps: number) {
  const result = Math.round((amountMinor * rateBps) / 10_000);
  if (!Number.isSafeInteger(result)) {
    throw new BadRequestException('Invoice amount is too large');
  }
  return result;
}
