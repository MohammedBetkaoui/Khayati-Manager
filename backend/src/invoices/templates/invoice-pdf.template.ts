import fontkit from '@pdf-lib/fontkit';
import {
  degrees,
  PDFDocument,
  PDFFont,
  PDFImage,
  PDFPage,
  rgb,
  RGB,
} from 'pdf-lib';
import {
  Invoice,
  InvoiceWorkshopSnapshot,
} from '../../sales/entities/invoice.entity';
import { InvoiceStatus } from '../../common/enums';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 32;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_TOP = 807;
const CONTENT_BOTTOM = 786;

const COLORS = {
  teal: rgb(0.02, 0.23, 0.28),
  tealSoft: rgb(0.91, 0.95, 0.95),
  gold: rgb(0.78, 0.61, 0.32),
  beige: rgb(0.96, 0.92, 0.84),
  ink: rgb(0.08, 0.12, 0.14),
  muted: rgb(0.39, 0.42, 0.43),
  border: rgb(0.84, 0.85, 0.84),
  row: rgb(0.975, 0.978, 0.976),
  green: rgb(0.12, 0.48, 0.25),
  red: rgb(0.78, 0.13, 0.12),
  white: rgb(1, 1, 1),
};

type EmbeddedAsset = PDFImage | null;

export type InvoicePdfTemplateInput = {
  invoice: Invoice;
  workshop: InvoiceWorkshopSnapshot | null;
  fontBytes: Uint8Array;
  logoBytes?: Uint8Array | null;
  logoType?: 'png' | 'jpg' | null;
  stampBytes?: Uint8Array | null;
  stampType?: 'png' | 'jpg' | null;
};

type TextOptions = {
  size?: number;
  color?: RGB;
  maxWidth?: number;
};

type TableColumn = {
  x: number;
  width: number;
  label: string;
};

export async function renderInvoicePdf(
  input: InvoicePdfTemplateInput,
): Promise<Buffer> {
  const { invoice, workshop } = input;
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  const font = await document.embedFont(input.fontBytes, { subset: false });
  const logo = await embedAsset(document, input.logoBytes, input.logoType);
  const stamp = await embedAsset(document, input.stampBytes, input.stampType);

  document.setTitle(`Invoice ${invoice.invoiceNumber}`);
  document.setSubject('Commercial invoice');
  document.setAuthor(workshop?.workshopName || workshop?.commercialName || '');
  document.setCreator('Khayati Manager');
  document.setProducer('Khayati Manager');
  document.setCreationDate(invoice.createdAt ?? new Date());
  document.setModificationDate(invoice.updatedAt ?? new Date());

  const pages: PDFPage[] = [];
  let page = addPage(document, pages);
  drawMainHeader(page, font, invoice, workshop, logo);
  drawInformationCards(page, font, invoice);

  let cursor = 260;
  cursor = drawItemsHeader(page, font, cursor);
  for (let index = 0; index < invoice.items.length; index += 1) {
    if (cursor + 30 > CONTENT_BOTTOM) {
      page = addPage(document, pages);
      drawContinuationHeader(page, font, invoice);
      cursor = drawItemsHeader(page, font, 72);
    }
    drawItemRow(page, font, invoice, index, cursor);
    cursor += 30;
  }

  cursor += 14;
  if (cursor + 136 > CONTENT_BOTTOM) {
    page = addPage(document, pages);
    drawContinuationHeader(page, font, invoice);
    cursor = 76;
  }
  drawFinancialSummaries(page, font, invoice, cursor);
  cursor += 138;

  if (cursor + 54 > CONTENT_BOTTOM) {
    page = addPage(document, pages);
    drawContinuationHeader(page, font, invoice);
    cursor = 76;
  }
  cursor = drawPaymentsHeader(page, font, cursor);

  if (!invoice.payments?.length) {
    drawCard(page, MARGIN, cursor, CONTENT_WIDTH, 30, COLORS.white);
    drawCentered(
      page,
      font,
      'لا توجد دفعات مسجلة',
      MARGIN,
      cursor + 9,
      CONTENT_WIDTH,
      {
        size: 9,
        color: COLORS.muted,
      },
    );
    cursor += 34;
  } else {
    invoice.payments.forEach((payment, index) => {
      if (cursor + 25 > CONTENT_BOTTOM) {
        page = addPage(document, pages);
        drawContinuationHeader(page, font, invoice);
        cursor = drawPaymentsHeader(page, font, 76);
      }
      drawPaymentRow(page, font, invoice, index, cursor);
      cursor += 25;
    });
  }

  cursor += 12;
  if (cursor + 96 > CONTENT_BOTTOM) {
    page = addPage(document, pages);
    drawContinuationHeader(page, font, invoice);
    cursor = 76;
  }
  drawNotesAndSignature(page, font, invoice, workshop, stamp, cursor);

  pages.forEach((currentPage, index) => {
    drawFooter(currentPage, font, workshop, index + 1, pages.length);
    if (invoice.invoiceStatus === InvoiceStatus.CANCELLED) {
      drawCancelledWatermark(currentPage, font);
    }
  });

  return Buffer.from(await document.save());
}

function addPage(document: PDFDocument, pages: PDFPage[]) {
  const page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  pages.push(page);
  return page;
}

async function embedAsset(
  document: PDFDocument,
  bytes?: Uint8Array | null,
  type?: 'png' | 'jpg' | null,
): Promise<EmbeddedAsset> {
  if (!bytes || !type) return null;
  try {
    return type === 'png'
      ? await document.embedPng(bytes)
      : await document.embedJpg(bytes);
  } catch {
    return null;
  }
}

function y(top: number, height = 0) {
  return PAGE_HEIGHT - top - height;
}

function drawCard(
  page: PDFPage,
  x: number,
  top: number,
  width: number,
  height: number,
  color: RGB,
  borderColor = COLORS.border,
) {
  page.drawRectangle({
    x,
    y: y(top, height),
    width,
    height,
    color,
    borderColor,
    borderWidth: 0.7,
  });
}

function shape(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function fitText(font: PDFFont, text: string, size: number, maxWidth: number) {
  if (!text) return '—';
  if (font.widthOfTextAtSize(shape(text), size) <= maxWidth) return text;
  let shortened = text;
  while (shortened.length > 1) {
    shortened = shortened.slice(0, -1);
    const candidate = `${shortened.trim()}...`;
    if (font.widthOfTextAtSize(shape(candidate), size) <= maxWidth) {
      return candidate;
    }
  }
  return '...';
}

function drawRtl(
  page: PDFPage,
  font: PDFFont,
  text: string | null | undefined,
  right: number,
  top: number,
  options: TextOptions = {},
) {
  const size = options.size ?? 9;
  const logical = fitText(
    font,
    text?.trim() || '—',
    size,
    options.maxWidth ?? Number.MAX_SAFE_INTEGER,
  );
  const rendered = shape(logical);
  const width = font.widthOfTextAtSize(rendered, size);
  page.drawText(rendered, {
    x: right - width,
    y: y(top, size),
    size,
    font,
    color: options.color ?? COLORS.ink,
  });
}

function drawLtr(
  page: PDFPage,
  font: PDFFont,
  text: string | null | undefined,
  x: number,
  top: number,
  options: TextOptions = {},
) {
  const size = options.size ?? 9;
  const value = fitText(
    font,
    text?.trim() || '—',
    size,
    options.maxWidth ?? Number.MAX_SAFE_INTEGER,
  );
  page.drawText(value, {
    x,
    y: y(top, size),
    size,
    font,
    color: options.color ?? COLORS.ink,
  });
}

function drawCentered(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  top: number,
  width: number,
  options: TextOptions = {},
) {
  const size = options.size ?? 9;
  const logical = fitText(font, text, size, options.maxWidth ?? width - 8);
  const rendered = shape(logical);
  const textWidth = font.widthOfTextAtSize(rendered, size);
  page.drawText(rendered, {
    x: x + Math.max(4, (width - textWidth) / 2),
    y: y(top, size),
    size,
    font,
    color: options.color ?? COLORS.ink,
  });
}

function drawMainHeader(
  page: PDFPage,
  font: PDFFont,
  invoice: Invoice,
  workshop: InvoiceWorkshopSnapshot | null,
  logo: EmbeddedAsset,
) {
  if (logo) {
    const ratio = Math.min(66 / logo.width, 66 / logo.height);
    const width = logo.width * ratio;
    const height = logo.height * ratio;
    page.drawImage(logo, {
      x: MARGIN + (68 - width) / 2,
      y: y(30 + (68 - height) / 2, height),
      width,
      height,
    });
  } else {
    page.drawRectangle({
      x: MARGIN,
      y: y(32, 66),
      width: 6,
      height: 66,
      color: COLORS.gold,
    });
  }

  const identityLeft = logo ? 108 : 48;
  drawRtl(
    page,
    font,
    workshop?.workshopName || workshop?.commercialName || 'الورشة',
    256,
    36,
    { size: 20, color: COLORS.teal, maxWidth: 256 - identityLeft },
  );
  if (workshop?.commercialName) {
    drawLtr(
      page,
      font,
      workshop.commercialName.toUpperCase(),
      identityLeft,
      66,
      {
        size: 9,
        color: COLORS.gold,
        maxWidth: 205,
      },
    );
  }

  const contactRight = 416;
  drawRtl(page, font, workshop?.address, contactRight, 36, {
    size: 8.2,
    color: COLORS.muted,
    maxWidth: 142,
  });
  drawLtr(page, font, workshop?.phone, 276, 56, {
    size: 8.2,
    maxWidth: 140,
  });
  drawLtr(page, font, workshop?.email, 276, 76, {
    size: 8.2,
    maxWidth: 140,
  });
  if (workshop?.taxNumber) {
    drawRtl(page, font, 'الرقم الجبائي:', contactRight, 96, {
      size: 7.6,
      color: COLORS.muted,
      maxWidth: 70,
    });
    drawLtr(page, font, workshop.taxNumber, 276, 96, {
      size: 7.6,
      color: COLORS.muted,
      maxWidth: 76,
    });
  }
  if (workshop?.commercialRegister) {
    drawRtl(page, font, 'السجل التجاري:', contactRight, 112, {
      size: 7.6,
      color: COLORS.muted,
      maxWidth: 70,
    });
    drawLtr(page, font, workshop.commercialRegister, 276, 112, {
      size: 7.6,
      color: COLORS.muted,
      maxWidth: 76,
    });
  }

  const badgeX = 433;
  const badgeWidth = 130;
  page.drawRectangle({
    x: badgeX,
    y: y(30, 32),
    width: badgeWidth,
    height: 32,
    color: COLORS.teal,
  });
  page.drawRectangle({
    x: badgeX,
    y: y(62, 36),
    width: badgeWidth,
    height: 36,
    color: COLORS.beige,
  });
  drawCentered(page, font, 'فاتورة', badgeX, 39, badgeWidth, {
    size: 14,
    color: COLORS.white,
  });
  drawCentered(
    page,
    font,
    invoice.invoiceNumber.startsWith('#')
      ? invoice.invoiceNumber
      : `#${invoice.invoiceNumber}`,
    badgeX,
    72,
    badgeWidth,
    {
      size: 11,
    },
  );
  drawRtl(page, font, 'تاريخ الإصدار:', 563, 108, {
    size: 8,
    maxWidth: 90,
  });
  drawLtr(page, font, formatDate(invoice.date), 433, 108, {
    size: 8,
    maxWidth: 75,
  });
  if (invoice.dueDate) {
    drawRtl(page, font, 'تاريخ الاستحقاق:', 563, 124, {
      size: 8,
      maxWidth: 90,
    });
    drawLtr(page, font, formatDate(invoice.dueDate), 433, 124, {
      size: 8,
      maxWidth: 75,
    });
  }
}

function drawInformationCards(page: PDFPage, font: PDFFont, invoice: Invoice) {
  const customer = invoice.customerSnapshot ?? {
    fullName: invoice.customer.fullName,
    phone: invoice.customer.phone,
    address: invoice.customer.address ?? null,
    email: invoice.customer.email ?? null,
  };
  drawSectionCard(page, font, MARGIN, 151, 255, 105, 'معلومات الزبون');
  drawLabelValue(
    page,
    font,
    MARGIN + 238,
    MARGIN + 78,
    187,
    'الاسم',
    customer.fullName,
  );
  drawLabelValue(
    page,
    font,
    MARGIN + 238,
    MARGIN + 78,
    205,
    'الهاتف',
    customer.phone,
  );
  drawLabelValue(
    page,
    font,
    MARGIN + 238,
    MARGIN + 78,
    223,
    'العنوان',
    customer.address,
  );
  drawLabelValue(
    page,
    font,
    MARGIN + 238,
    MARGIN + 78,
    241,
    'البريد',
    customer.email,
  );

  drawSectionCard(page, font, 303, 151, 260, 105, 'معلومات الفاتورة');
  const paymentMethods = uniqueValues(
    invoice.payments?.map((payment) => payment.paymentMethod) ?? [],
  ).join(' / ');
  drawLabelValue(
    page,
    font,
    546,
    392,
    184,
    'رقم الفاتورة',
    invoice.invoiceNumber,
  );
  drawLabelValue(
    page,
    font,
    546,
    392,
    199,
    'الطلبية',
    invoice.orderNumberSnapshot,
  );
  drawLabelValue(page, font, 546, 392, 214, 'طريقة الدفع', paymentMethods);
  drawLabelValue(
    page,
    font,
    546,
    392,
    229,
    'حالة الدفع',
    invoice.paymentStatus,
  );
  drawLabelValue(
    page,
    font,
    546,
    392,
    244,
    'حالة الفاتورة',
    invoice.invoiceStatus === InvoiceStatus.CANCELLED ? 'ملغاة' : 'صادرة',
  );
}

function drawSectionCard(
  page: PDFPage,
  font: PDFFont,
  x: number,
  top: number,
  width: number,
  height: number,
  title: string,
) {
  drawCard(page, x, top, width, height, COLORS.white);
  page.drawRectangle({
    x,
    y: y(top, 27),
    width,
    height: 27,
    color: COLORS.tealSoft,
    borderColor: COLORS.border,
    borderWidth: 0.5,
  });
  drawRtl(page, font, title, x + width - 12, top + 8, {
    size: 10.5,
    color: COLORS.teal,
    maxWidth: width - 24,
  });
}

function drawLabelValue(
  page: PDFPage,
  font: PDFFont,
  labelRight: number,
  valueRight: number,
  top: number,
  label: string,
  value: string | null | undefined,
) {
  drawRtl(page, font, `${label}:`, labelRight, top, {
    size: 7.8,
    color: COLORS.muted,
    maxWidth: 74,
  });
  drawRtl(page, font, value, valueRight, top, {
    size: 8.2,
    maxWidth: 132,
  });
}

function itemColumns(): TableColumn[] {
  return [
    { x: 32, width: 86, label: 'المجموع' },
    { x: 118, width: 80, label: 'سعر الوحدة' },
    { x: 198, width: 38, label: 'الكمية' },
    { x: 236, width: 90, label: 'التنويعة' },
    { x: 326, width: 72, label: 'المرجع' },
    { x: 398, width: 136, label: 'المنتج' },
    { x: 534, width: 29, label: '#' },
  ];
}

function drawItemsHeader(page: PDFPage, font: PDFFont, top: number) {
  const columns = itemColumns();
  page.drawRectangle({
    x: MARGIN,
    y: y(top, 28),
    width: CONTENT_WIDTH,
    height: 28,
    color: COLORS.teal,
  });
  columns.forEach((column) => {
    drawCentered(page, font, column.label, column.x, top + 10, column.width, {
      size: 8.2,
      color: COLORS.white,
    });
  });
  return top + 28;
}

function drawItemRow(
  page: PDFPage,
  font: PDFFont,
  invoice: Invoice,
  index: number,
  top: number,
) {
  const item = invoice.items[index];
  const variant = uniqueValues([item.size, item.variantSnapshot]).join(' / ');
  const productName = item.productName || item.description;
  const description =
    item.description && item.description !== productName
      ? item.description
      : null;
  const values = [
    money(item.totalMinor, invoice.currency),
    money(item.unitPriceMinor, invoice.currency),
    String(item.quantity),
    variant || item.color || '—',
    item.reference || item.productSku || '—',
    productName,
    String(index + 1),
  ];
  const columns = itemColumns();
  page.drawRectangle({
    x: MARGIN,
    y: y(top, 30),
    width: CONTENT_WIDTH,
    height: 30,
    color: index % 2 === 0 ? COLORS.white : COLORS.row,
    borderColor: COLORS.border,
    borderWidth: 0.45,
  });
  columns.forEach((column, columnIndex) => {
    if (columnIndex > 0) {
      page.drawLine({
        start: { x: column.x, y: y(top, 30) },
        end: { x: column.x, y: y(top) },
        color: COLORS.border,
        thickness: 0.35,
      });
    }
    if (columnIndex === 5 && description) {
      drawCentered(page, font, productName, column.x, top + 4, column.width, {
        size: 7.7,
        maxWidth: column.width - 8,
      });
      drawCentered(page, font, description, column.x, top + 16, column.width, {
        size: 6.5,
        color: COLORS.muted,
        maxWidth: column.width - 8,
      });
    } else if (columnIndex === 3 && item.color && variant) {
      drawCentered(page, font, item.color, column.x, top + 4, column.width, {
        size: 7.2,
        maxWidth: column.width - 8,
      });
      drawCentered(page, font, variant, column.x, top + 16, column.width, {
        size: 6.8,
        color: COLORS.muted,
        maxWidth: column.width - 8,
      });
    } else {
      drawCentered(
        page,
        font,
        values[columnIndex],
        column.x,
        top + 10,
        column.width,
        {
          size: columnIndex === 5 ? 8.2 : 7.7,
          maxWidth: column.width - 8,
        },
      );
    }
  });
}

function drawFinancialSummaries(
  page: PDFPage,
  font: PDFFont,
  invoice: Invoice,
  top: number,
) {
  drawSummaryCard(page, font, MARGIN, top, 255, 'ملخص الفاتورة', [
    [
      'المجموع الفرعي',
      money(invoice.subtotalMinor, invoice.currency),
      COLORS.ink,
    ],
    ['الخصم', money(invoice.discountAmountMinor, invoice.currency), COLORS.ink],
    [
      'الضريبة',
      money(invoice.taxAmountMinor, invoice.currency),
      COLORS.ink,
      invoice.taxEnabled ? `${formatRate(invoice.taxRate)}%` : undefined,
    ],
    [
      'الإجمالي',
      money(invoice.totalAmountMinor, invoice.currency),
      COLORS.teal,
    ],
  ]);
  drawSummaryCard(page, font, 303, top, 260, 'ملخص الدفع', [
    [
      'المبلغ الإجمالي',
      money(invoice.totalAmountMinor, invoice.currency),
      COLORS.ink,
    ],
    [
      'المبلغ المدفوع',
      money(invoice.paidAmountMinor, invoice.currency),
      COLORS.green,
    ],
    [
      'المبلغ المتبقي',
      money(invoice.remainingAmountMinor, invoice.currency),
      COLORS.red,
    ],
    ['الحالة', invoice.paymentStatus, COLORS.teal],
  ]);
}

function drawSummaryCard(
  page: PDFPage,
  font: PDFFont,
  x: number,
  top: number,
  width: number,
  title: string,
  rows: Array<[string, string, RGB, string?]>,
) {
  const height = 124;
  drawCard(page, x, top, width, height, COLORS.white);
  page.drawRectangle({
    x,
    y: y(top, 28),
    width,
    height: 28,
    color: COLORS.beige,
  });
  drawRtl(page, font, title, x + width - 12, top + 8, {
    size: 10,
    color: COLORS.teal,
  });
  rows.forEach(([label, value, color, detail], index) => {
    const rowTop = top + 36 + index * 21;
    drawRtl(page, font, label, x + width - 13, rowTop, {
      size: 8.4,
      maxWidth: 120,
    });
    drawLtr(page, font, value, x + 13, rowTop, {
      size: 8.6,
      color,
      maxWidth: 110,
    });
    if (detail) {
      drawLtr(page, font, detail, x + width - 108, rowTop, {
        size: 7.8,
        color: COLORS.muted,
        maxWidth: 35,
      });
    }
    if (index < rows.length - 1) {
      page.drawLine({
        start: { x: x + 10, y: y(rowTop + 17) },
        end: { x: x + width - 10, y: y(rowTop + 17) },
        color: COLORS.border,
        thickness: 0.35,
      });
    }
  });
}

function drawPaymentsHeader(page: PDFPage, font: PDFFont, top: number) {
  drawCard(page, MARGIN, top, CONTENT_WIDTH, 30, COLORS.tealSoft);
  drawRtl(page, font, 'سجل الدفعات', PAGE_WIDTH - MARGIN - 12, top + 8, {
    size: 10.5,
    color: COLORS.teal,
  });
  const headerTop = top + 30;
  const columns = paymentColumns();
  page.drawRectangle({
    x: MARGIN,
    y: y(headerTop, 23),
    width: CONTENT_WIDTH,
    height: 23,
    color: COLORS.teal,
  });
  columns.forEach((column) => {
    drawCentered(
      page,
      font,
      column.label,
      column.x,
      headerTop + 7,
      column.width,
      {
        size: 8,
        color: COLORS.white,
      },
    );
  });
  return headerTop + 23;
}

function paymentColumns(): TableColumn[] {
  return [
    { x: 32, width: 125, label: 'المرجع' },
    { x: 157, width: 125, label: 'طريقة الدفع' },
    { x: 282, width: 125, label: 'المبلغ' },
    { x: 407, width: 156, label: 'التاريخ' },
  ];
}

function drawPaymentRow(
  page: PDFPage,
  font: PDFFont,
  invoice: Invoice,
  index: number,
  top: number,
) {
  const payment = invoice.payments[index];
  const values = [
    payment.reference || '—',
    payment.paymentMethod,
    money(payment.amountMinor, invoice.currency),
    formatDate(payment.date),
  ];
  page.drawRectangle({
    x: MARGIN,
    y: y(top, 25),
    width: CONTENT_WIDTH,
    height: 25,
    color: index % 2 === 0 ? COLORS.white : COLORS.row,
    borderColor: COLORS.border,
    borderWidth: 0.45,
  });
  paymentColumns().forEach((column, columnIndex) => {
    drawCentered(
      page,
      font,
      values[columnIndex],
      column.x,
      top + 8,
      column.width,
      {
        size: 8,
        maxWidth: column.width - 8,
      },
    );
  });
}

function drawNotesAndSignature(
  page: PDFPage,
  font: PDFFont,
  invoice: Invoice,
  workshop: InvoiceWorkshopSnapshot | null,
  stamp: EmbeddedAsset,
  top: number,
) {
  drawCard(page, MARGIN, top, 330, 88, COLORS.row);
  drawRtl(page, font, 'ملاحظات', MARGIN + 314, top + 12, {
    size: 10,
    color: COLORS.teal,
  });
  const notes = invoice.notes || workshop?.invoiceFooter || 'شكراً لثقتكم بنا.';
  wrapText(font, notes, 8.5, 300, 3).forEach((line, index) => {
    drawRtl(page, font, line, MARGIN + 314, top + 36 + index * 14, {
      size: 8.5,
      color: COLORS.muted,
      maxWidth: 300,
    });
  });

  drawCard(page, 378, top, 185, 88, COLORS.white);
  drawCentered(page, font, 'إمضاء وختم الورشة', 378, top + 11, 185, {
    size: 9.2,
    color: COLORS.teal,
  });
  if (stamp) {
    const ratio = Math.min(58 / stamp.width, 50 / stamp.height);
    const width = stamp.width * ratio;
    const height = stamp.height * ratio;
    page.drawImage(stamp, {
      x: 378 + (185 - width) / 2,
      y: y(top + 34 + (50 - height) / 2, height),
      width,
      height,
    });
  }
}

function drawContinuationHeader(
  page: PDFPage,
  font: PDFFont,
  invoice: Invoice,
) {
  page.drawRectangle({
    x: MARGIN,
    y: y(28, 30),
    width: CONTENT_WIDTH,
    height: 30,
    color: COLORS.teal,
  });
  drawRtl(page, font, 'فاتورة - تابع', PAGE_WIDTH - MARGIN - 12, 37, {
    size: 11,
    color: COLORS.white,
  });
  drawLtr(page, font, `#${invoice.invoiceNumber}`, MARGIN + 12, 37, {
    size: 9,
    color: COLORS.white,
  });
}

function drawFooter(
  page: PDFPage,
  font: PDFFont,
  workshop: InvoiceWorkshopSnapshot | null,
  pageNumber: number,
  pageCount: number,
) {
  page.drawRectangle({
    x: MARGIN,
    y: y(FOOTER_TOP, 22),
    width: CONTENT_WIDTH,
    height: 22,
    color: COLORS.teal,
  });
  drawRtl(
    page,
    font,
    workshop?.address || workshop?.invoiceFooter || '',
    490,
    FOOTER_TOP + 7,
    {
      size: 7.2,
      color: COLORS.white,
      maxWidth: 195,
    },
  );
  drawLtr(page, font, workshop?.phone, 230, FOOTER_TOP + 7, {
    size: 7.2,
    color: COLORS.white,
    maxWidth: 85,
  });
  drawLtr(page, font, workshop?.email, 48, FOOTER_TOP + 7, {
    size: 7.2,
    color: COLORS.white,
    maxWidth: 170,
  });
  drawLtr(page, font, `${pageNumber}/${pageCount}`, 515, FOOTER_TOP + 7, {
    size: 7.2,
    color: COLORS.white,
    maxWidth: 40,
  });
}

function drawCancelledWatermark(page: PDFPage, font: PDFFont) {
  const text = shape('ملغاة');
  const size = 62;
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: (PAGE_WIDTH - width) / 2 - 20,
    y: PAGE_HEIGHT / 2 - 20,
    size,
    font,
    color: COLORS.red,
    opacity: 0.11,
    rotate: degrees(28),
  });
}

function money(minor: number, currency: string) {
  const amount = Number.isFinite(minor) ? minor / 100 : 0;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(amount);
  return `${formatted} ${currency}`;
}

function uniqueValues(values: Array<string | null | undefined>) {
  return values.filter(
    (value, index, all): value is string =>
      Boolean(value) && all.indexOf(value) === index,
  );
}

function wrapText(
  font: PDFFont,
  text: string,
  size: number,
  maxWidth: number,
  maxLines: number,
) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let current = '';
  for (let index = 0; index < words.length; index += 1) {
    const candidate = current ? `${current} ${words[index]}` : words[index];
    if (font.widthOfTextAtSize(shape(candidate), size) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = words[index];
    if (lines.length === maxLines - 1) {
      const remaining = [current, ...words.slice(index + 1)].join(' ');
      lines.push(fitText(font, remaining, size, maxWidth));
      return lines;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return '—';
  const date =
    typeof value === 'string'
      ? value.slice(0, 10)
      : value.toISOString().slice(0, 10);
  const [year, month, day] = date.split('-');
  return year && month && day ? `${day}/${month}/${year}` : date;
}

function formatRate(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
