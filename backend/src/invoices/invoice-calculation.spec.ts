import { BadRequestException } from '@nestjs/common';
import { DiscountType } from '../common/enums';
import { toMinorUnits } from '../common/money';
import { calculateInvoiceAmounts } from './invoice-calculation';

describe('calculateInvoiceAmounts', () => {
  it('calculates the reference invoice with fixed discount and tax', () => {
    const result = calculateInvoiceAmounts({
      lines: [
        { quantity: 3, unitPriceMinor: toMinorUnits(3500) },
        { quantity: 2, unitPriceMinor: toMinorUnits(4800) },
        { quantity: 1, unitPriceMinor: toMinorUnits(2900) },
        { quantity: 1, unitPriceMinor: toMinorUnits(2000) },
      ],
      discountType: DiscountType.FIXED,
      discountValue: 2000,
      taxEnabled: true,
      taxRate: 19,
    });

    expect(result.subtotalMinor).toBe(toMinorUnits(25_000));
    expect(result.discountAmountMinor).toBe(toMinorUnits(2_000));
    expect(result.taxAmountMinor).toBe(toMinorUnits(4_370));
    expect(result.totalAmountMinor).toBe(toMinorUnits(27_370));
  });

  it('uses basis points for percentage discounts', () => {
    const result = calculateInvoiceAmounts({
      lines: [{ quantity: 3, unitPriceMinor: toMinorUnits(333.33) }],
      discountType: DiscountType.PERCENTAGE,
      discountValue: 10,
    });

    expect(result.subtotalMinor).toBe(99_999);
    expect(result.discountAmountMinor).toBe(10_000);
    expect(result.totalAmountMinor).toBe(89_999);
  });

  it('rejects discounts greater than the subtotal', () => {
    expect(() =>
      calculateInvoiceAmounts({
        lines: [{ quantity: 1, unitPriceMinor: toMinorUnits(100) }],
        discountType: DiscountType.FIXED,
        discountValue: 101,
      }),
    ).toThrow(BadRequestException);
  });
});
