import { Sale, AppSettings } from '../types';
import { getSaleNetTotal, getSaleRefundedTotal } from './erpMath';

export const buildReceiptHtml = (
  sale: Sale,
  settings: Pick<AppSettings, 'storeName' | 'storePhone' | 'storeAddress'>,
  customerName?: string
): string => {
  const paymentLabel =
    sale.paymentMethod === 'NAGD' ? 'Nəğd' : sale.paymentMethod === 'KART' ? 'Kart' : 'Borc';

  return `
    <div style="font-family: 'Courier New', monospace; width: 300px; padding: 16px; margin: 0 auto;">
      <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 12px;">
        <h2 style="margin: 0; font-size: 16px;">${settings.storeName || 'İnşaat ERP'}</h2>
        ${settings.storeAddress ? `<p style="margin: 4px 0; font-size: 11px;">${settings.storeAddress}</p>` : ''}
        ${settings.storePhone ? `<p style="margin: 4px 0; font-size: 11px;">Tel: ${settings.storePhone}</p>` : ''}
      </div>
      <p style="font-size: 11px; margin: 4px 0;">Qaimə №: <b>${sale.id.slice(0, 8).toUpperCase()}</b></p>
      <p style="font-size: 11px; margin: 4px 0;">Tarix: ${new Date(sale.date).toLocaleString('az-AZ')}</p>
      ${sale.cashierName ? `<p style="font-size: 11px; margin: 4px 0;">Kassir: ${sale.cashierName}</p>` : ''}
      ${customerName ? `<p style="font-size: 11px; margin: 4px 0;">Müştəri: ${customerName}</p>` : ''}
      <hr style="border: none; border-top: 1px dashed #000; margin: 10px 0;" />
      <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 1px solid #ccc;">
            <th style="text-align: left; padding: 4px 0;">Məhsul</th>
            <th style="text-align: center;">Say</th>
            <th style="text-align: right;">Cəmi</th>
          </tr>
        </thead>
        <tbody>
          ${sale.items
            .map(
              (item) => `
            <tr>
              <td style="padding: 6px 0; vertical-align: top;">${item.name}<br/><span style="color:#666">${item.price.toFixed(2)} x ${item.quantity} ${item.unit}</span></td>
              <td style="text-align: center; vertical-align: top;">${item.quantity}</td>
              <td style="text-align: right; vertical-align: top; font-weight: bold;">${(item.price * item.quantity).toFixed(2)}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>
      <hr style="border: none; border-top: 1px dashed #000; margin: 10px 0;" />
      ${sale.discount ? `<p style="text-align: right; font-size: 12px; margin: 4px 0;">Endirim: -${sale.discount.toFixed(2)} ₼</p>` : ''}
      ${getSaleRefundedTotal(sale) > 0 ? `<p style="text-align: right; font-size: 12px; margin: 4px 0;">Qaytarma: -${getSaleRefundedTotal(sale).toFixed(2)} ₼</p>` : ''}
      <p style="text-align: right; font-size: 18px; font-weight: bold; margin: 8px 0;">YEKUN: ${getSaleNetTotal(sale).toFixed(2)} ₼</p>
      <p style="text-align: right; font-size: 11px; margin: 4px 0;">Ödəniş: ${paymentLabel}</p>
      ${sale.note ? `<p style="font-size: 10px; margin-top: 8px; color: #444;">Qeyd: ${sale.note}</p>` : ''}
      <hr style="border: none; border-top: 1px dashed #000; margin: 12px 0;" />
      <p style="text-align: center; font-size: 11px;">Alış-verişiniz üçün təşəkkür edirik!</p>
    </div>
  `;
};

export const printSaleReceipt = (
  sale: Sale,
  settings: Pick<AppSettings, 'storeName' | 'storePhone' | 'storeAddress'>,
  customerName?: string
) => {
  const html = buildReceiptHtml(sale, settings, customerName);
  const w = window.open('', '_blank');
  if (w) {
    w.document.write(`<html><head><title>Qaimə ${sale.id.slice(0, 8)}</title></head><body>${html}</body></html>`);
    w.document.close();
    w.print();
  }
};
