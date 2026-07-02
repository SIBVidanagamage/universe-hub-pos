import React from 'react';

const Bill = React.forwardRef(({ saleData }, ref) => {
  if (!saleData) return null;

  const getWarrantyEndDate = (warrantyPeriod) => {
    if (!warrantyPeriod || warrantyPeriod === 0) return 'N/A';
    const saleDate = new Date(saleData.timestamp);
    saleDate.setMonth(saleDate.getMonth() + warrantyPeriod);
    return saleDate.toLocaleDateString();
  };

  return (
    <div ref={ref} className="p-8 font-mono text-sm bg-white text-black">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">UNIVERSE HUB</h1>
        <p>123 Tech Street, Silicon Valley, CA 94000</p>
        <p>Phone: (123) 456-7890</p>
        <h2 className="text-xl font-bold mt-4 border-t border-b border-dashed border-black py-1">
          INVOICE
        </h2>
      </div>

      <div className="flex justify-between mb-4">
        <div>
          <p><strong>Invoice #:</strong> {saleData.id}</p>
          <p><strong>Date:</strong> {new Date(saleData.timestamp).toLocaleString()}</p>
        </div>
        <div>
          <p><strong>Cashier:</strong> {saleData.cashier}</p>
          <p><strong>Customer:</strong> {saleData.customerName}</p>
        </div>
      </div>

      <table className="w-full mb-4">
        <thead>
          <tr className="border-b-2 border-dashed border-black">
            <th className="text-left pb-1">Item</th>
            <th className="text-right pb-1">Qty</th>
            <th className="text-right pb-1">Price</th>
            <th className="text-right pb-1">Total</th>
          </tr>
        </thead>
        <tbody>
          {saleData.items.map(item => (
            <React.Fragment key={item.id}>
              <tr>
                <td className="pt-1">{item.name}</td>
                <td className="text-right pt-1">{item.quantity}</td>
                <td className="text-right pt-1">${item.sellingPrice.toFixed(2)}</td>
                <td className="text-right pt-1">${(item.sellingPrice * item.quantity).toFixed(2)}</td>
              </tr>
              {item.warrantyPeriod > 0 && (
                <tr>
                  <td colSpan="4" className="text-xs pl-2 pb-1">
                    Warranty until: {getWarrantyEndDate(item.warrantyPeriod)}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end">
        <div className="w-1/2">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>${saleData.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax (10%):</span>
            <span>${saleData.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t-2 border-dashed border-black mt-1 pt-1">
            <span>Total:</span>
            <span>${saleData.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="text-center mt-8">
        <p>Thank you for your purchase!</p>
        <p className="text-xs">All sales are final. Please check warranty details.</p>
      </div>
    </div>
  );
});

export { Bill };
