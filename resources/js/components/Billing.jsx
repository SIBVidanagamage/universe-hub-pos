import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useInventory } from '@/hooks/useInventory';
import { useBundles } from '@/hooks/useBundles';
import { useSales } from '@/hooks/useSales';
import { useQZ } from '@/hooks/useQZ';
import { useAuth } from '@/hooks/useAuth';
import { ShoppingCart, Plus, Minus, Trash2, Receipt, History, Printer, Smartphone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';

export function Billing() {
  const { inventory } = useInventory();
  const { bundles } = useBundles();
  // Get all sales data for the history section
  const { sales, addSale } = useSales();
  const { isConnected, connect, print } = useQZ();
  const { toast } = useToast();
  const { token } = useAuth();

  const [cart, setCart] = useState([]);
  const [customerTitle, setCustomerTitle] = useState('Mr.');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [sendEmailReceipt, setSendEmailReceipt] = useState(true);
  const [paymentCash, setPaymentCash] = useState(0);
  const [paymentCard, setPaymentCard] = useState(0);
  const [paymentTransfer, setPaymentTransfer] = useState(0);
  const [paymentKoko, setPaymentKoko] = useState(0);
  const [exchangeValue, setExchangeValue] = useState(0);
  const [exchangePhone, setExchangePhone] = useState({
    brand: '',
    model: '',
    color: '',
    imei: '',
    storage: '',
  });
  const barcodeInputRef = useRef();

  // Connect to QZ Tray on component mount
  useEffect(() => {
    if (!isConnected) connect();
  }, [connect, isConnected]);

  // Auto-fill customer details based on phone or email
  useEffect(() => {
    const searchCustomer = async () => {
      // Prioritize phone for search if both exist, otherwise use email
      const query = customerPhone || customerEmail;
      if (!query || query.length < 4) return; // Only search if length >= 4

      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .or(`phone.ilike.%${query}%,email.ilike.%${query}%`)
          .limit(1)
          .maybeSingle();

        if (data && !error) {
            // Only auto-fill if the current fields are empty or match the typed query
            // to avoid overwriting user input constantly
            if (!customerName || customerName === data.name.replace(/^(Mr\.|Mrs\.|Miss|Dr\.)\s+/, '')) {
              const nameParts = data.name.split(' ');
              if (['Mr.', 'Mrs.', 'Miss', 'Dr.'].includes(nameParts[0])) {
                setCustomerTitle(nameParts[0]);
                setCustomerName(nameParts.slice(1).join(' '));
              } else {
                setCustomerName(data.name);
              }
            }
            if (!customerEmail && data.email) setCustomerEmail(data.email);
            if (!customerPhone && data.phone) setCustomerPhone(data.phone);
        }
      } catch (error) {
        console.error("Error searching customer", error);
      }
    };

    const debounceTimer = setTimeout(searchCustomer, 500);
    return () => clearTimeout(debounceTimer);
  }, [customerPhone, customerEmail]);

  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, [isConnected, connect]);

  const addItemToCart = (item, type) => {
    if (!item) return;

    const uniqueCartId = `${type}-${item.id}`;
    const existingItem = cart.find(cartItem => cartItem.uniqueCartId === uniqueCartId);

    if (existingItem) {
      if (type === 'product' && existingItem.quantity >= item.quantity) {
          toast({ title: "Stock Limit", description: `No more stock for ${item.name}.`, variant: "destructive" });
          return;
      }
      setCart(cart.map(cartItem =>
        cartItem.uniqueCartId === uniqueCartId
          ? { ...cartItem, quantity: cartItem.quantity + 1, itemCodes: [...(cartItem.itemCodes || []), ''] }
          : cartItem
      ));
    } else {
      setCart([...cart, {
          ...item,
          quantity: 1,
          type: type,
          sellingPrice: parseFloat(item.price || item.selling_price || item.sellingPrice),
          discount: 0, // Initialize discount for the item
          itemCodes: [item.phoneImei || ''],
          uniqueCartId: uniqueCartId
      }]);
    }
  };

  const handleBarcodeScan = (e) => {
      e.preventDefault();
      const barcode = barcodeInputRef.current.value;
      if (!barcode) return;

      const product = inventory.find(item => item.barcode === barcode);
      if (product) {
          addItemToCart(product, 'product');
          barcodeInputRef.current.value = '';
      } else {
          toast({ title: "Product Not Found", description: "No product with that barcode exists.", variant: "destructive" });
      }
  };

  const updateQuantity = (uniqueCartId, newQuantity) => {
    if (newQuantity < 0) return;
    if (newQuantity === 0) {
      removeFromCart(uniqueCartId);
      return;
    }
    setCart(cart.map(item => {
      if (item.uniqueCartId !== uniqueCartId) return item;

      const currentCodes = item.itemCodes || [];
      const nextCodes = Array.from({ length: newQuantity }, (_, index) => currentCodes[index] || '');

      return { ...item, quantity: newQuantity, itemCodes: nextCodes };
    }));
  };

  const updateItemDiscount = (uniqueCartId, discountValue) => {
    // Allow empty string to be handled, default to 0 if not a valid number
    const newDiscount = discountValue === '' ? '' : (parseFloat(discountValue) || 0);
    setCart(cart.map(item =>
        item.uniqueCartId === uniqueCartId ? { ...item, discount: newDiscount } : item
    ));
  };

  const updateItemCode = (uniqueCartId, codeIndex, codeValue) => {
    setCart(cart.map(item => {
      if (item.uniqueCartId !== uniqueCartId) return item;

      const nextCodes = [...(item.itemCodes || [])];
      nextCodes[codeIndex] = codeValue;

      return { ...item, itemCodes: nextCodes };
    }));
  };

  const updateExchangePhone = (field, value) => {
    setExchangePhone(prev => ({ ...prev, [field]: value }));
  };

  const removeFromCart = (uniqueCartId) => {
    setCart(cart.filter(item => item.uniqueCartId !== uniqueCartId));
  };

  const calculateSubtotal = () => cart.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
  const calculateTotalDiscount = () => cart.reduce((sum, item) => sum + ((parseFloat(item.discount) || 0) * item.quantity), 0);

  const subtotal = calculateSubtotal();
  const totalDiscount = calculateTotalDiscount();
  const exchangeCredit = parseFloat(exchangeValue) || 0;
  const grandTotal = Math.max(0, subtotal - totalDiscount - exchangeCredit);

  const handlePrintBill = async (saleData, printerType = 'epson') => {
    if (!isConnected) {
        toast({ title: "Printer Error", description: "QZ Tray is not connected. Please start it and refresh.", variant: "destructive" });
        return;
    }

    const printerName = printerType === 'thermal' ? "Xprinter XP-365B" : "EPSON LQ-310";

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        let hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const strTime = String(hours).padStart(2, '0') + ':' + minutes + ' ' + ampm;
        return `${day}/${month}/${year} ${strTime}`;
    };
    const formattedDate = formatDate(saleData.created_at);

    const billItemsHtml = saleData.items.map((item, index) => {
        const warrantyMonths = item.saleable?.warranty_period_months;
        const warrantyText = warrantyMonths && warrantyMonths > 0
            ? `<br><small style="font-size: 8pt;">(${warrantyMonths} Month${warrantyMonths > 1 ? 's' : ''} Warranty)</small>`
            : '';
        const unitCodeText = item.sold_item_codes?.length
            ? `<br><small style="font-size: 8pt;">Unit: ${item.sold_item_codes.join(', ')}</small>`
            : '';
        const serialNumberText = item.saleable?.serial_number
            ? `<br><small style="font-size: 8pt;">S/N: ${item.saleable.serial_number}</small>`
            : '';
        const phoneDetails = item.saleable?.product_type === 'phone'
            ? `<br><small style="font-size: 8pt;">${item.saleable.phone_brand || ''} ${item.saleable.phone_model || ''} | ${item.saleable.phone_color || ''} | ${item.saleable.phone_storage || ''} <br> IMEI: ${item.saleable.phone_imei || ''}</small>`
            : '';
        const itemSubtotal = item.quantity * item.price_at_sale;
        const itemDiscount = (item.discount || 0) * item.quantity;
        const itemTotal = itemSubtotal - itemDiscount;

        return `
            <tr>
                <td style="padding: 2px; text-align: left; vertical-align: top;">${index + 1}.</td>
                <td style="padding: 2px; text-align: left; word-break: break-all;">
                    ${item.saleable.name}
                    ${warrantyText}
                    ${unitCodeText}
                    ${serialNumberText}
                    ${phoneDetails}
                </td>
                <td style="padding: 2px; text-align: right; vertical-align: top;">${item.quantity}</td>
                <td style="padding: 2px; text-align: right; vertical-align: top;">${parseFloat(item.price_at_sale).toFixed(2)}</td>
                <td style="padding: 2px; text-align: right; vertical-align: top;">${parseFloat(item.discount || 0).toFixed(2)}</td>
                <td style="padding: 2px; text-align: right; vertical-align: top;">${itemTotal.toFixed(2)}</td>
            </tr>
        `;
    }).join('');

    const hasExchangePhone = parseFloat(saleData.exchange_value || 0) > 0;
    const exchangePhoneHtml = hasExchangePhone ? `
            <table style="width: 100%; font-size: 8pt; margin-top: 10px; border-collapse: collapse;">
                <tr>
                    <td colspan="2" style="padding: 3px 5px;"><strong>Exchange Device</strong></td>
                </tr>
                <tr>
                    <td style="padding: 3px 5px;">${saleData.exchange_phone_brand || '-'} ${saleData.exchange_phone_model || ''}</td>
                    <td style="padding: 3px 5px;">Color: ${saleData.exchange_phone_color || '-'} | Storage: ${saleData.exchange_phone_storage || '-'}</td>
                </tr>
                <tr>
                    <td colspan="2" style="padding: 3px 5px;">IMEI: ${saleData.exchange_phone_imei || '-'}</td>
                </tr>
            </table>` : '';

    let billHtml = '';

    if (printerType === 'thermal') {
        // --- THERMAL RECEIPT FORMAT (Xprinter XP-365B) ---
        const thermalItemsHtml = saleData.items.map((item, index) => {
            const itemTotal = (item.quantity * item.price_at_sale) - ((item.discount || 0) * item.quantity);
            const serialText = item.saleable?.serial_number ? `<br><small style="font-size: 7pt;">S/N: ${item.saleable.serial_number}</small>` : '';
            return `
                <tr>
                    <td style="padding: 2px 0; border-bottom: 1px dotted #ccc;" colspan="4">
                        ${item.saleable.name}
                        ${item.sold_item_codes?.length ? `<br><small style="font-size: 7pt;">SN: ${item.sold_item_codes.join(', ')}</small>` : ''}
                        ${serialText}
                    </td>
                </tr>
                <tr>
                    <td style="padding: 2px 0; text-align: left;">${item.quantity}</td>
                    <td style="padding: 2px 0; text-align: right;">${parseFloat(item.price_at_sale).toFixed(2)}</td>
                    <td style="padding: 2px 0; text-align: right;">${parseFloat(item.discount || 0).toFixed(2)}</td>
                    <td style="padding: 2px 0; text-align: right;">${itemTotal.toFixed(2)}</td>
                </tr>
            `;
        }).join('');

        billHtml = `
        <html>
            <body style="font-family: Arial, sans-serif; font-size: 9pt; width: 72mm; margin: 0 auto; padding: 0;">
                <div style="text-align: center; margin-bottom: 5px;">
                    <h1 style="font-size: 14pt; margin: 0; font-weight: bold;">UNIVERSE HUB</h1>
                    <p style="margin: 0; font-size: 8pt;">188/8 C, High Level Road, Maharagama</p>
                    <p style="margin: 0; font-size: 8pt;">Phone: 074-021-9239</p>
                </div>
                <div style="text-align: center; border-top: 1px dashed black; border-bottom: 1px dashed black; padding: 2px 0; margin-bottom: 5px;">
                    <strong>RECEIPT</strong>
                </div>
                <table style="width: 100%; font-size: 8pt; margin-bottom: 5px;">
                    <tr><td style="text-align: left;"><strong>Inv #:</strong> ${saleData.id}</td><td style="text-align: right;">${formattedDate}</td></tr>
                    <tr><td style="text-align: left;"><strong>Cashier:</strong> ${saleData.user.name}</td><td style="text-align: right;"><strong>Cust:</strong> ${saleData.customer_name}</td></tr>
                </table>
                <table style="width: 100%; font-size: 8pt; border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th style="text-align: left; padding: 2px 0; border-bottom: 1px solid black; border-top: 1px solid black; width: 10%;">Qty</th>
                            <th style="text-align: right; padding: 2px 0; border-bottom: 1px solid black; border-top: 1px solid black; width: 30%;">Price</th>
                            <th style="text-align: right; padding: 2px 0; border-bottom: 1px solid black; border-top: 1px solid black; width: 30%;">Dis.</th>
                            <th style="text-align: right; padding: 2px 0; border-bottom: 1px solid black; border-top: 1px solid black; width: 30%;">Total</th>
                        </tr>
                    </thead>
                    <tbody>${thermalItemsHtml}</tbody>
                </table>
                <table style="width: 100%; margin-top: 5px; font-size: 8pt;">
                    <tr><td style="text-align: right; padding-right: 10px;">Subtotal:</td><td style="text-align: right;">${parseFloat(saleData.subtotal).toFixed(2)}</td></tr>
                    <tr><td style="text-align: right; padding-right: 10px;">Discount:</td><td style="text-align: right;">${parseFloat(saleData.discount).toFixed(2)}</td></tr>
                    <tr><td style="text-align: right; padding-right: 10px;">Exch. Device:</td><td style="text-align: right;">${parseFloat(saleData.exchange_value || 0).toFixed(2)}</td></tr>
                    <tr><td style="text-align: right; padding-right: 10px; font-size: 10pt; font-weight: bold;">Total:</td><td style="text-align: right; font-size: 10pt; font-weight: bold;">${parseFloat(saleData.total).toFixed(2)}</td></tr>
                </table>
                <div style="text-align: center; margin-top: 10px; font-size: 8pt;">
                    <p style="margin: 0;">Thank you for your purchase!</p>
                    <p style="margin: 0; font-size: 7pt; margin-top: 5px;">No warranty for these items.</p>
                </div>
            </body>
        </html>`;
    } else {
        // --- EPSON DOT MATRIX FORMAT ---
        billHtml = `
        <html>
        <body style="font-family: 'Courier New', monospace; font-size: 10pt; width: 100%; padding: 0.1in;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
                <tr>
                    <td style="width: 160px; vertical-align: top;"><img src="https://i.ibb.co/JRg1bTsg/Artboard-1.png" alt="Logo" style="width: 150px; height: auto;"/></td>
                    <td style="vertical-align: top; padding-left: 15px;">
                        <h1 style="font-size: 16pt; margin: 0; text-align: left;">UNIVERSE HUB</h1>
                        <p style="margin: 0; text-align: left;">188/8 C, High Level Road, Maharagama</p>
                        <p style="margin: 0; text-align: left;">Phone: 074-021-9239</p>
                    </td>
                </tr>
            </table>
            <h2 style="font-size: 10pt; border-top: 1px dashed black; border-bottom: 1px dashed black; padding: 5px 0; text-align: center;">INVOICE</h2>
            <table style="width: 100%; font-size: 8pt; margin-top: 15px; border-collapse: collapse;">
                <tr>
                    <td style="text-align: left; width: 50%; padding: 3px 5px;"><strong>Invoice #:</strong> ${saleData.id}</td>
                    <td style="text-align: right; width: 50%; padding: 3px 180px 3px 5px;"><strong>Date:</strong> ${formattedDate}</td>
                </tr>
                <tr>
                    <td style="text-align: left; width: 50%; padding: 3px 5px;"><strong>Cashier:</strong> ${saleData.user.name}</td>
                    <td style="text-align: right; width: 50%; word-break: break-all; padding: 3px 180px 3px 5px;"><strong>Customer:</strong> ${saleData.customer_name}</td>
                </tr>
                ${saleData.customer_email || saleData.customer_phone ? `
                <tr>
                    <td style="text-align: left; width: 50%; padding: 3px 5px;"><strong>Email:</strong> ${saleData.customer_email || '-'}</td>
                    <td style="text-align: right; width: 50%; padding: 3px 180px 3px 5px;"><strong>Phone:</strong> ${saleData.customer_phone || '-'}</td>
                </tr>` : ''}
            </table>
            <hr style="border: 1px dashed black; margin-top: 10px;" />
            <table style="width: 100%;font-size: 8pt; margin-top: 10px; border-collapse: collapse;">
                <thead>
                    <tr>
                        <th style="text-align: left; padding: 2px; width: 5%;">#</th>
                        <th style="text-align: left; padding: 2px; width: 30%;">Item</th>
                        <th style="text-align: right; padding: 2px; width: 5%;">Qty</th>
                        <th style="text-align: right; padding: 2px; width: 10%;">Price</th>
                        <th style="text-align: right; padding: 2px; width: 10%;">Discount</th>
                        <th style="text-align: right; padding: 2px; width: 10%;">Total</th>
                    </tr>
                </thead>
                <tbody>${billItemsHtml}</tbody>
            </table>
            ${exchangePhoneHtml}
            <hr style="border: 1px dashed black; margin-top: 10px;" />
            <table style="width: 100%; margin-top: 10px; font-size: 8pt;">
                <tbody>
                    <tr>
                        <td style="text-align: right; font-size: 8pt; padding-right: 40px;">Subtotal:</td>
                        <td style="text-align: right; font-size: 8pt; padding-right: 200px;">LKR ${parseFloat(saleData.subtotal).toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td style="text-align: right; font-size: 8pt; padding-right: 40px;">Total Discount:</td>
                        <td style="text-align: right; font-size: 8pt; padding-right: 200px;">LKR ${parseFloat(saleData.discount).toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td style="text-align: right; font-size: 8pt; padding-right: 40px;">Exchange Device:</td>
                        <td style="text-align: right; font-size: 8pt; padding-right: 200px;">LKR ${parseFloat(saleData.exchange_value || 0).toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td style="text-align: right; font-size: 10pt; padding-right: 40px; font-weight: bold;">Grand Total:</td>
                        <td style="text-align: right; font-size: 10pt; padding-right: 200px; font-weight: bold;">LKR ${parseFloat(saleData.total).toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>
            <div style="text-align: center; margin-top: 20px;"><p>Thank you for your purchase!</p></div>

        </body>
    </html>`;
    }

    const data = [{ type: 'html', format: 'plain', data: billHtml }];
    
    // Configure based on printer type
    const config = window.qz.configs.create(printerName, 
        printerType === 'thermal'
        ? { size: { width: 76 }, units: 'mm', margins: { top: 0, right: 0, bottom: 0, left: 0 } }
        : { size: { width: 9.5, height: 5.5 }, units: 'in', margins: { top: 0.25, right: 0.25, bottom: 0.25, left: 0.25 } }
    );
    
    try { await print(config, data); toast({ title: "Printing", description: `Bill sent to ${printerName}.` }); }
    catch (error) { toast({ title: "Printing Failed", description: `Could not print to ${printerName}. Please check QZ Tray.`, variant: "destructive" }); }
  };

  const processSale = async (printerType) => {
    if (cart.length === 0) {
      toast({ title: "Empty Cart", variant: "destructive" });
      return;
    }

    if (exchangeCredit > 0) {
      const missingExchangeFields = [
        ['Brand', exchangePhone.brand],
        ['Model', exchangePhone.model],
        ['IMEI', exchangePhone.imei],
      ].filter(([, value]) => !String(value || '').trim());

      if (missingExchangeFields.length > 0) {
        toast({
          title: "Exchange Phone Details Required",
          description: `Enter ${missingExchangeFields.map(([label]) => label).join(', ')} for the exchange device.`,
          variant: "destructive",
        });
        return;
      }
    }

    const enteredUnitCodes = [];
    for (const item of cart) {
      const itemCodes = (item.itemCodes || []).map(code => code.trim()).filter(Boolean);

      // Validation removed to make unit barcodes optional

      for (const code of itemCodes) {
        if (enteredUnitCodes.includes(code)) {
          toast({
            title: "Duplicate Unit Barcode",
            description: `${code} is entered more than once in this bill.`,
            variant: "destructive",
          });
          return;
        }
        enteredUnitCodes.push(code);
      }
    }

    const salePayload = {
      customerName: customerName ? `${customerTitle} ${customerName}` : 'Walk-in Customer',
      customerEmail: customerEmail || null,
      customerPhone: customerPhone || null,
      sendEmailReceipt,
      paymentCash: parseFloat(paymentCash) || 0,
      paymentCard: parseFloat(paymentCard) || 0,
      paymentTransfer: parseFloat(paymentTransfer) || 0,
      paymentKoko: parseFloat(paymentKoko) || 0,
      exchangeValue: exchangeCredit,
      exchangePhoneBrand: exchangePhone.brand.trim() || null,
      exchangePhoneModel: exchangePhone.model.trim() || null,
      exchangePhoneColor: exchangePhone.color.trim() || null,
      exchangePhoneImei: exchangePhone.imei.trim() || null,
      exchangePhoneStorage: exchangePhone.storage.trim() || null,
      cart: cart.map(item => ({
        id: item.id,
        type: item.type,
        quantity: item.quantity,
        sellingPrice: item.sellingPrice,
        discount: parseFloat(item.discount) || 0,
        itemCodes: (item.itemCodes || []).map(code => code.trim()).filter(Boolean)
      }))
    };

    try {
      const newSaleData = await addSale(salePayload);

      // Send Email via local Nodemailer server
      if (salePayload.sendEmailReceipt && salePayload.customerEmail) {
        try {
          // Generate a simple HTML table for the cart items
          let itemsHtml = '<table border="1" cellpadding="5" style="border-collapse: collapse; width: 100%; margin-top: 20px;">';
          itemsHtml += '<tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>';
          cart.forEach(item => {
            const itemTotal = (item.quantity * item.sellingPrice) - (parseFloat(item.discount) * item.quantity);
            itemsHtml += `<tr><td>${item.name}</td><td>${item.quantity}</td><td>LKR ${item.sellingPrice}</td><td>LKR ${itemTotal}</td></tr>`;
          });
          itemsHtml += '</table>';

          const htmlReceipt = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #4f46e5;">UNIVERSE HUB</h2>
              <h3>Receipt for Your Purchase</h3>
              <p>Dear ${salePayload.customerName},</p>
              <p>Thank you for shopping with us! Here are your purchase details:</p>
              ${itemsHtml}
              <h3 style="margin-top: 20px;"><strong>Grand Total: LKR ${newSaleData.total}</strong></h3>
              <p>Date: ${new Date().toLocaleString()}</p>
              <p style="font-size: 12px; color: #888;">For any inquiries or warranty claims, please bring this email or your printed receipt.</p>
            </div>
          `;
          
          const response = await fetch('http://127.0.0.1:3001/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: salePayload.customerEmail,
              subject: 'Your Receipt - Universe Hub',
              html: htmlReceipt
            })
          });
          
          if (!response.ok) throw new Error('Email server returned ' + response.status);
          
          newSaleData.receipt_emailed_at = new Date().toISOString();
        } catch (e) {
          console.error("Email sending failed:", e);
          newSaleData.receipt_email_error = 'Email failed: ' + e.message;
        }
      }

      toast({
        title: "Sale Recorded",
        description: newSaleData.receipt_emailed_at
          ? `Total: LKR ${newSaleData.total}. Receipt emailed.`
          : `Total: LKR ${newSaleData.total}`,
      });
      if (newSaleData.receipt_email_error) {
        toast({
          title: "Email Not Sent",
          description: newSaleData.receipt_email_error,
          variant: "destructive",
        });
      }
      
      // Print bill to selected printer
      await handlePrintBill(newSaleData, printerType);
      
      setCart([]);
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setPaymentCash(0);
      setPaymentCard(0);
      setPaymentTransfer(0);
      setPaymentKoko(0);
      setExchangeValue(0);
      setExchangePhone({ brand: '', model: '', color: '', imei: '', storage: '' });
    } catch (error) {
      toast({ title: "Sale Failed", description: error.message, variant: "destructive" });
    }
  };

  const recentSales = useMemo(() => {
    // The sales from the hook are already sorted by latest first
    return sales.slice(0, 5);
  }, [sales]);

  // Check if any item in the cart has a warranty
  const cartHasWarrantyItems = cart.some(item => item.warrantyPeriod > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-md">Billing</h1>
          <p className="text-cosmic-titanium mt-1 text-lg">Process sales and print receipts</p>
        </div>
        <div className="text-2xl font-bold text-white">
          Total: LKR {grandTotal.toFixed(2)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-effect shadow-xl">
            <CardHeader><CardTitle className="text-2xl tracking-wide text-white">Add Items</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleBarcodeScan} className="flex gap-2">
                <Input ref={barcodeInputRef} placeholder="Scan barcode..." />
                <Button type="submit">Add</Button>
              </form>
              <div className="flex items-center gap-2">
                <div className="flex-grow border-t border-white/10"></div><span className="text-xs text-gray-400">OR</span><div className="flex-grow border-t border-white/10"></div>
              </div>
              <Select onValueChange={(val) => {
                  if (!val) return;
                  const [type, id] = val.split('-');
                  const item = type === 'product' ? inventory.find(p => p.id == id) : bundles.find(b => b.id == id);
                  addItemToCart(item, type);
              }}>
                <SelectTrigger><SelectValue placeholder="Select an Item or Bundle" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value={null} disabled>--- Products ---</SelectItem>
                    {inventory.map(p => <SelectItem key={`prod-${p.id}`} value={`product-${p.id}`}>{p.name}</SelectItem>)}
                    <SelectItem value={null} disabled>--- Bundles ---</SelectItem>
                    {bundles.map(b => <SelectItem key={`bund-${b.id}`} value={`bundle-${b.id}`}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="glass-effect shadow-xl">
            <CardHeader><CardTitle className="text-2xl tracking-wide text-white">Shopping Cart ({cart.length})</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[5%]">#</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Discount</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                  {cart.map((item, index) => (
                    <TableRow key={item.uniqueCartId}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        {item.name} {item.type === 'bundle' && <Badge>Bundle</Badge>}
                        {item.warrantyPeriod > 0 && (
                            <div className="text-xs text-gray-400">
                                {item.warrantyPeriod} Month{item.warrantyPeriod > 1 ? 's' : ''} Warranty
                            </div>
                        )}
                        {(item.productType === 'phone' || item.warrantyPeriod > 0) && (
                          <div className="mt-3 space-y-2">
                            <p className="text-xs font-medium text-gray-300">
                              Sold Unit Barcode / Serial Numbers (Optional)
                            </p>
                            {(item.itemCodes || []).map((code, codeIndex) => (

                              <Input
                                key={`${item.uniqueCartId}-code-${codeIndex}`}
                                value={code}
                                onChange={(e) => updateItemCode(item.uniqueCartId, codeIndex, e.target.value)}
                                placeholder={`Exact unit code #${codeIndex + 1}`}
                                className="h-8 max-w-sm bg-white/10 border-white/20 text-xs text-white"
                              />
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>LKR {item.sellingPrice.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => updateQuantity(item.uniqueCartId, item.quantity - 1)}><Minus className="w-3 h-3" /></Button>
                          <span>{item.quantity}</span>
                          <Button size="sm" variant="outline" onClick={() => updateQuantity(item.uniqueCartId, item.quantity + 1)}><Plus className="w-3 h-3" /></Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                            type="text"
                            value={item.discount}
                            onBlur={(e) => updateItemDiscount(item.uniqueCartId, e.target.value || '0')}
                            onChange={(e) => updateItemDiscount(item.uniqueCartId, e.target.value)}
                            className="w-20 bg-white/10 border-white/20 text-right"
                            placeholder="0.00"
                        />
                      </TableCell>
                      <TableCell>LKR {((item.sellingPrice - (parseFloat(item.discount) || 0)) * item.quantity).toFixed(2)}</TableCell>
                      <TableCell><Button size="sm" variant="destructive" onClick={() => removeFromCart(item.uniqueCartId)}><Trash2 className="w-4 h-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="glass-effect shadow-xl">
            <CardHeader><CardTitle className="text-2xl tracking-wide text-white">Payment</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customer">Customer Name</Label>
                <div className="flex gap-2 mt-1">
                  <Select value={customerTitle} onValueChange={setCustomerTitle}>
                    <SelectTrigger className="w-[100px] bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Title" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mr.">Mr.</SelectItem>
                      <SelectItem value="Mrs.">Mrs.</SelectItem>
                      <SelectItem value="Miss">Miss</SelectItem>
                      <SelectItem value="Rev.">Rev.</SelectItem>
                      <SelectItem value="Dr.">Dr.</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input id="customer" className="flex-1 bg-white/10 border-white/20 text-white" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Walk-in Customer" />
                </div>
              </div>
              <div>
                <Label htmlFor="customerEmail">Customer Email</Label>
                <Input id="customerEmail" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="customer@gmail.com" />
              </div>
              <div>
                <Label htmlFor="customerPhone">Customer Phone</Label>
                <Input id="customerPhone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="07X XXX XXXX" />
              </div>
              <label htmlFor="sendEmailReceipt" className="flex items-center gap-3 text-sm text-gray-200">
                <input
                  id="sendEmailReceipt"
                  type="checkbox"
                  checked={sendEmailReceipt}
                  onChange={(e) => setSendEmailReceipt(e.target.checked)}
                  className="h-4 w-4"
                />
                Send bill to customer email
              </label>
              <div className="rounded-md border border-white/10 bg-white/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-white">
                  <Smartphone className="h-4 w-4 text-blue-300" />
                  <span className="font-medium">Exchange Phone</span>
                </div>
                <div>
                  <Label htmlFor="exchangeValue">Exchange Value</Label>
                  <Input
                    id="exchangeValue"
                    type="number"
                    min="0"
                    step="0.01"
                    value={exchangeValue}
                    onChange={(e) => setExchangeValue(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="exchangeBrand">Brand</Label>
                    <Input id="exchangeBrand" value={exchangePhone.brand} onChange={(e) => updateExchangePhone('brand', e.target.value)} placeholder="Apple" />
                  </div>
                  <div>
                    <Label htmlFor="exchangeModel">Model</Label>
                    <Input id="exchangeModel" value={exchangePhone.model} onChange={(e) => updateExchangePhone('model', e.target.value)} placeholder="iPhone 13" />
                  </div>
                  <div>
                    <Label htmlFor="exchangeColor">Color</Label>
                    <Input id="exchangeColor" value={exchangePhone.color} onChange={(e) => updateExchangePhone('color', e.target.value)} placeholder="Black" />
                  </div>
                  <div>
                    <Label htmlFor="exchangeStorage">Storage</Label>
                    <Input id="exchangeStorage" value={exchangePhone.storage} onChange={(e) => updateExchangePhone('storage', e.target.value)} placeholder="128GB" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="exchangeImei">IMEI</Label>
                  <Input id="exchangeImei" value={exchangePhone.imei} onChange={(e) => updateExchangePhone('imei', e.target.value)} placeholder="Exchange phone IMEI" />
                </div>
              </div>
              <div>
                <Label>Payments</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label htmlFor="paymentCash" className="text-xs text-gray-400">Cash</Label>
                    <Input id="paymentCash" type="number" min="0" value={paymentCash} onChange={(e) => setPaymentCash(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="paymentCard" className="text-xs text-gray-400">Card</Label>
                    <Input id="paymentCard" type="number" min="0" value={paymentCard} onChange={(e) => setPaymentCard(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="paymentTransfer" className="text-xs text-gray-400">Transfer</Label>
                    <Input id="paymentTransfer" type="number" min="0" value={paymentTransfer} onChange={(e) => setPaymentTransfer(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="paymentKoko" className="text-xs text-gray-400">Koko</Label>
                    <Input id="paymentKoko" type="number" min="0" value={paymentKoko} onChange={(e) => setPaymentKoko(e.target.value)} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-effect shadow-xl">
            <CardHeader><CardTitle className="text-2xl tracking-wide text-white">Order Summary</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between text-white">
                    <span>Subtotal</span>
                    <span>LKR {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-white">
                    <span>Total Discount</span>
                    <span>LKR {totalDiscount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-white">
                    <span>Exchange Device</span>
                    <span>- LKR {exchangeCredit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-white font-bold text-lg border-t border-white/20 pt-2">
                    <span>Grand Total</span>
                    <span>LKR {grandTotal.toFixed(2)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <Button 
                    onClick={() => processSale('thermal')} 
                    className={`liquid-button w-full text-base py-6 rounded-2xl transition-all ${!cartHasWarrantyItems ? 'bg-gradient-to-r from-cosmic-success to-emerald-500 hover:from-emerald-400 hover:to-emerald-600 shadow-[0_0_15px_rgba(52,199,89,0.4)] text-white' : 'bg-white/10 hover:bg-white/20 text-gray-300'}`} 
                    disabled={cart.length === 0}
                >
                    <Receipt className="w-5 h-5 mr-2" />
                    Normal Bill
                </Button>
                <Button 
                    onClick={() => processSale('epson')} 
                    className={`liquid-button w-full text-base py-6 rounded-2xl transition-all ${cartHasWarrantyItems ? 'bg-gradient-to-r from-cosmic-blue to-purple-500 hover:from-blue-400 hover:to-purple-400 shadow-[0_0_15px_rgba(123,97,255,0.4)] text-white' : 'bg-white/10 hover:bg-white/20 text-gray-300'}`} 
                    disabled={cart.length === 0}
                >
                    <Printer className="w-5 h-5 mr-2" />
                    Warranty Bill
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* --- Bill History Section --- */}
          <Card className="glass-effect shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl tracking-wide text-white"><History className="w-6 h-6 mr-3 text-cosmic-blue" />Recent Bills</CardTitle>
            </CardHeader>
            <CardContent>
              {recentSales.length > 0 ? (
                <ul className="space-y-2">
                  {recentSales.map(sale => (
                    <li key={sale.id} className="flex flex-col gap-2 p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-white">Invoice #{sale.id}</p>
                            <p className="text-xs text-gray-400">{sale.customer_name}</p>
                        </div>
                        <p className="font-bold text-white text-sm">LKR {parseFloat(sale.total).toFixed(2)}</p>
                      </div>
                      <div className="flex gap-2 justify-end mt-1">
                        <Button size="sm" variant="secondary" className="text-xs h-7 bg-white/10 text-white hover:bg-white/20 border-0" onClick={() => handlePrintBill(sale, 'thermal')}>
                            <Receipt className="w-3 h-3 mr-1" /> Thermal
                        </Button>
                        <Button size="sm" variant="secondary" className="text-xs h-7 bg-cosmic-blue/20 text-blue-300 hover:bg-cosmic-blue/40 border-0" onClick={() => handlePrintBill(sale, 'epson')}>
                            <Printer className="w-3 h-3 mr-1" /> Warranty (EPSON)
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400 text-center">No recent sales found.</p>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
