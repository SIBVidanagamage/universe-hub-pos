import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useSales } from '@/hooks/useSales';
import { useQZ } from '@/hooks/useQZ';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Minus, Trash2, Receipt, History, Printer, Wrench } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function Repairs() {
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
  const [isProcessing, setIsProcessing] = useState(false);

  const [repairForm, setRepairForm] = useState({
      name: '',
      warrantyPeriod: '',
      sellingPrice: '',
      discount: '',
      costPrice: '' // Labeled as 'c' in UI
  });

  // Connect to QZ Tray on component mount
  useEffect(() => {
    if (!isConnected) connect();
  }, [connect, isConnected]);

  // Auto-fill customer details based on phone or email
  useEffect(() => {
    const searchCustomer = async () => {
      const query = customerPhone || customerEmail;
      if (!query || query.length < 4) return; 

      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .or(`phone.ilike.%${query}%,email.ilike.%${query}%`)
          .limit(1)
          .maybeSingle();

        if (data && !error) {
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

  const addRepairToCart = (e) => {
      e.preventDefault();
      
      if (!repairForm.name || !repairForm.sellingPrice) {
          toast({ title: "Required Fields", description: "Repair Name and Price are required.", variant: "destructive" });
          return;
      }

      const newItem = {
          uniqueCartId: `repair-${Date.now()}`,
          name: repairForm.name,
          type: 'repair',
          warrantyPeriod: parseInt(repairForm.warrantyPeriod) || 0,
          sellingPrice: parseFloat(repairForm.sellingPrice) || 0,
          discount: parseFloat(repairForm.discount) || 0,
          costPrice: parseFloat(repairForm.costPrice) || 0,
          quantity: 1,
          itemCodes: []
      };

      setCart([...cart, newItem]);
      
      // Reset form
      setRepairForm({
          name: '',
          warrantyPeriod: '',
          sellingPrice: '',
          discount: '',
          costPrice: ''
      });
  };

  const updateQuantity = (uniqueCartId, newQuantity) => {
    if (newQuantity < 0) return;
    if (newQuantity === 0) {
      removeFromCart(uniqueCartId);
      return;
    }
    setCart(cart.map(item => {
      if (item.uniqueCartId !== uniqueCartId) return item;
      return { ...item, quantity: newQuantity };
    }));
  };

  const updateItemDiscount = (uniqueCartId, discountValue) => {
    const newDiscount = discountValue === '' ? '' : (parseFloat(discountValue) || 0);
    setCart(cart.map(item =>
        item.uniqueCartId === uniqueCartId ? { ...item, discount: newDiscount } : item
    ));
  };

  const removeFromCart = (uniqueCartId) => {
    setCart(cart.filter(item => item.uniqueCartId !== uniqueCartId));
  };

  const calculateSubtotal = () => cart.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
  const calculateTotalDiscount = () => cart.reduce((sum, item) => sum + ((parseFloat(item.discount) || 0) * item.quantity), 0);

  const subtotal = calculateSubtotal();
  const totalDiscount = calculateTotalDiscount();
  const grandTotal = Math.max(0, subtotal - totalDiscount);

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
        const warrantyMonths = item.saleable?.warranty_period_months || item.warranty_months;
        const warrantyText = warrantyMonths && warrantyMonths > 0
            ? `<br><small style="font-size: 8pt;">(${warrantyMonths} Month${warrantyMonths > 1 ? 's' : ''} Warranty)</small>`
            : '';
        const itemSubtotal = item.quantity * item.price_at_sale;
        const itemDiscount = (item.discount || 0) * item.quantity;
        const itemTotal = itemSubtotal - itemDiscount;
        const name = item.saleable?.name || 'Repair Service';

        return `
            <tr>
                <td style="padding: 2px; text-align: left; vertical-align: top;">${index + 1}.</td>
                <td style="padding: 2px; text-align: left; word-break: break-all;">
                    ${name}
                    ${warrantyText}
                </td>
                <td style="padding: 2px; text-align: right; vertical-align: top;">${item.quantity}</td>
                <td style="padding: 2px; text-align: right; vertical-align: top;">${parseFloat(item.price_at_sale).toFixed(2)}</td>
                <td style="padding: 2px; text-align: right; vertical-align: top;">${parseFloat(item.discount || 0).toFixed(2)}</td>
                <td style="padding: 2px; text-align: right; vertical-align: top;">${itemTotal.toFixed(2)}</td>
            </tr>
        `;
    }).join('');

    let billHtml = '';

    if (printerType === 'thermal') {
        const thermalItemsHtml = saleData.items.map((item, index) => {
            const itemTotal = (item.quantity * item.price_at_sale) - ((item.discount || 0) * item.quantity);
            const name = item.saleable?.name || 'Repair Service';
            return `
                <tr>
                    <td style="padding: 2px 0; border-bottom: 1px dotted #ccc;" colspan="4">
                        ${name}
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
                    <strong>REPAIR RECEIPT</strong>
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
                    <tr><td style="text-align: right; padding-right: 10px; font-size: 10pt; font-weight: bold;">Total:</td><td style="text-align: right; font-size: 10pt; font-weight: bold;">${parseFloat(saleData.total).toFixed(2)}</td></tr>
                </table>
                <div style="text-align: center; margin-top: 10px; font-size: 8pt;">
                    <p style="margin: 0;">Thank you for trusting us with your repairs!</p>
                </div>
            </body>
        </html>`;
    } else {
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
            <h2 style="font-size: 10pt; border-top: 1px dashed black; border-bottom: 1px dashed black; padding: 5px 0; text-align: center;">REPAIR INVOICE</h2>
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
                        <td style="text-align: right; font-size: 10pt; padding-right: 40px; font-weight: bold;">Grand Total:</td>
                        <td style="text-align: right; font-size: 10pt; padding-right: 200px; font-weight: bold;">LKR ${parseFloat(saleData.total).toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>
            <div style="text-align: center; margin-top: 20px;"><p>Thank you for trusting us with your repairs!</p></div>
        </body>
        </html>`;
    }

    const data = [{ type: 'html', format: 'plain', data: billHtml }];
    
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

    setIsProcessing(true);

    try {
      // 1. Create a "Product" in the database for each repair item
      // This ensures we don't break existing useSales / receipt / reporting logic,
      // while also properly tracking the 'c' (cost price) for profit calculation!
      const transformedCart = [];
      
      for (const item of cart) {
        const { data, error } = await supabase.from('products').insert([{
           name: item.name,
           category: 'Repair', // This will keep it somewhat distinct in inventory
           sku: 'REP-' + Date.now() + Math.floor(Math.random()*1000),
           barcode: 'REP-' + Date.now() + Math.floor(Math.random()*1000),
           quantity: 1, 
           min_stock_level: 0,
           cost_price: item.costPrice,
           selling_price: item.sellingPrice,
           warranty_period_months: item.warrantyPeriod,
           product_type: 'general' 
        }]).select('id, name, warranty_period_months').single();
        
        if (error) throw new Error("Failed to create repair record: " + error.message);
        
        transformedCart.push({
           id: data.id,
           type: 'product',
           quantity: item.quantity,
           sellingPrice: item.sellingPrice,
           discount: item.discount,
           itemCodes: []
        });
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
        exchangeValue: 0, 
        exchangePhoneBrand: null,
        exchangePhoneModel: null,
        exchangePhoneColor: null,
        exchangePhoneImei: null,
        exchangePhoneStorage: null,
        cart: transformedCart
      };

      const newSaleData = await addSale(salePayload);

      // Send Email via local Nodemailer server
      if (salePayload.sendEmailReceipt && salePayload.customerEmail) {
        try {
          let itemsHtml = '<table border="1" cellpadding="5" style="border-collapse: collapse; width: 100%; margin-top: 20px;">';
          itemsHtml += '<tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>';
          cart.forEach(item => {
            const itemTotal = (item.quantity * item.sellingPrice) - (parseFloat(item.discount) * item.quantity);
            itemsHtml += `<tr><td>${item.name}</td><td>${item.quantity}</td><td>LKR ${item.sellingPrice}</td><td>LKR ${itemTotal}</td></tr>`;
          });
          itemsHtml += '</table>';

          const htmlReceipt = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #4f46e5;">UNIVERSE HUB - REPAIRS</h2>
              <h3>Receipt for Your Repair Service</h3>
              <p>Dear ${salePayload.customerName},</p>
              <p>Thank you for trusting us! Here are your repair details:</p>
              ${itemsHtml}
              <h3 style="margin-top: 20px;"><strong>Grand Total: LKR ${newSaleData.total}</strong></h3>
              <p>Date: ${new Date().toLocaleString()}</p>
              <p style="font-size: 12px; color: #888;">For any inquiries or warranty claims, please bring this email or your printed receipt.</p>
            </div>
          `;
          
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: salePayload.customerEmail,
              subject: 'Your Repair Receipt - Universe Hub',
              html: htmlReceipt
            })
          });
        } catch (e) {
          console.error("Email sending failed:", e);
        }
      }

      toast({
        title: "Repair Bill Recorded",
        description: `Total: LKR ${newSaleData.total}`
      });
      
      // Override saleData items with original cart names for immediate printing before re-fetch finishes
      const printData = {
          ...newSaleData,
          items: newSaleData.items.map((it, idx) => ({
              ...it,
              saleable: { ...it.saleable, name: cart[idx]?.name || 'Repair Service' }
          }))
      };

      await handlePrintBill(printData, printerType);
      
      setCart([]);
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setPaymentCash(0);
      setPaymentCard(0);
      setPaymentTransfer(0);
      setPaymentKoko(0);
    } catch (error) {
      toast({ title: "Checkout Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const recentSales = useMemo(() => {
    // Filter out only repair sales? For now just show all sales to be consistent.
    return sales.slice(0, 5);
  }, [sales]);

  const cartHasWarrantyItems = cart.some(item => item.warrantyPeriod > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-md">Repair Billing</h1>
          <p className="text-cosmic-titanium mt-1 text-lg">Process repair jobs and print receipts</p>
        </div>
        <div className="text-2xl font-bold text-white">
          Total: LKR {grandTotal.toFixed(2)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-effect shadow-xl">
            <CardHeader><CardTitle className="text-2xl tracking-wide text-white">Add Repair Item</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={addRepairToCart} className="space-y-4">
                <div>
                  <Label htmlFor="repairName">Repair / Part Name</Label>
                  <Input 
                    id="repairName" 
                    value={repairForm.name} 
                    onChange={e => setRepairForm({...repairForm, name: e.target.value})} 
                    placeholder="e.g., iPhone 11 Screen Replacement" 
                    className="bg-white/10 border-white/20 text-white w-full"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="repairPrice">Price (LKR)</Label>
                    <Input 
                      id="repairPrice" 
                      type="number"
                      step="0.01"
                      value={repairForm.sellingPrice} 
                      onChange={e => setRepairForm({...repairForm, sellingPrice: e.target.value})} 
                      placeholder="0.00" 
                      className="bg-white/10 border-white/20 text-white"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="repairWarranty">Warranty (Months)</Label>
                    <Input 
                      id="repairWarranty" 
                      type="number"
                      value={repairForm.warrantyPeriod} 
                      onChange={e => setRepairForm({...repairForm, warrantyPeriod: e.target.value})} 
                      placeholder="e.g. 3" 
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="repairDiscount">Discount (LKR)</Label>
                    <Input 
                      id="repairDiscount" 
                      type="number"
                      step="0.01"
                      value={repairForm.discount} 
                      onChange={e => setRepairForm({...repairForm, discount: e.target.value})} 
                      placeholder="0.00" 
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="repairCost">c (LKR)</Label>
                    <Input 
                      id="repairCost" 
                      type="number"
                      step="0.01"
                      value={repairForm.costPrice} 
                      onChange={e => setRepairForm({...repairForm, costPrice: e.target.value})} 
                      placeholder="0.00" 
                      className="bg-white/10 border-white/20 text-white"
                      title="Cost Price of Part"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full mt-2"><Plus className="w-4 h-4 mr-2" /> Add to Cart</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="glass-effect shadow-xl">
            <CardHeader><CardTitle className="text-2xl tracking-wide text-white">Repair Cart ({cart.length})</CardTitle></CardHeader>
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
                        <div className="font-medium text-white">{item.name}</div>
                        {item.warrantyPeriod > 0 && (
                            <div className="text-xs text-cosmic-blue mt-1">
                                {item.warrantyPeriod} Month{item.warrantyPeriod > 1 ? 's' : ''} Warranty
                            </div>
                        )}
                        {item.costPrice > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                                c: {item.costPrice}
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
                  {cart.length === 0 && (
                      <TableRow>
                          <TableCell colSpan={7} className="text-center text-gray-400 py-6">No repairs added yet.</TableCell>
                      </TableRow>
                  )}
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
                <Input id="customerEmail" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="customer@gmail.com" className="bg-white/10 border-white/20 text-white" />
              </div>
              <div>
                <Label htmlFor="customerPhone">Customer Phone</Label>
                <Input id="customerPhone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="07X XXX XXXX" className="bg-white/10 border-white/20 text-white" />
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
              
              <div className="pt-2">
                <Label>Payments</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label htmlFor="paymentCash" className="text-xs text-gray-400">Cash</Label>
                    <Input id="paymentCash" type="number" min="0" value={paymentCash} onChange={(e) => setPaymentCash(e.target.value)} className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <div>
                    <Label htmlFor="paymentCard" className="text-xs text-gray-400">Card</Label>
                    <Input id="paymentCard" type="number" min="0" value={paymentCard} onChange={(e) => setPaymentCard(e.target.value)} className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <div>
                    <Label htmlFor="paymentTransfer" className="text-xs text-gray-400">Transfer</Label>
                    <Input id="paymentTransfer" type="number" min="0" value={paymentTransfer} onChange={(e) => setPaymentTransfer(e.target.value)} className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <div>
                    <Label htmlFor="paymentKoko" className="text-xs text-gray-400">Koko</Label>
                    <Input id="paymentKoko" type="number" min="0" value={paymentKoko} onChange={(e) => setPaymentKoko(e.target.value)} className="bg-white/10 border-white/20 text-white" />
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
                <div className="flex justify-between text-white font-bold text-lg border-t border-white/20 pt-2">
                    <span>Grand Total</span>
                    <span>LKR {grandTotal.toFixed(2)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <Button 
                    onClick={() => processSale('thermal')} 
                    className={`liquid-button w-full text-base py-6 rounded-2xl transition-all ${!cartHasWarrantyItems ? 'bg-gradient-to-r from-cosmic-success to-emerald-500 hover:from-emerald-400 hover:to-emerald-600 shadow-[0_0_15px_rgba(52,199,89,0.4)] text-white' : 'bg-white/10 hover:bg-white/20 text-gray-300'}`} 
                    disabled={cart.length === 0 || isProcessing}
                >
                    <Receipt className="w-5 h-5 mr-2" />
                    {isProcessing ? 'Processing...' : 'Normal Bill'}
                </Button>
                <Button 
                    onClick={() => processSale('epson')} 
                    className={`liquid-button w-full text-base py-6 rounded-2xl transition-all ${cartHasWarrantyItems ? 'bg-gradient-to-r from-cosmic-blue to-purple-500 hover:from-blue-400 hover:to-purple-400 shadow-[0_0_15px_rgba(123,97,255,0.4)] text-white' : 'bg-white/10 hover:bg-white/20 text-gray-300'}`} 
                    disabled={cart.length === 0 || isProcessing}
                >
                    <Printer className="w-5 h-5 mr-2" />
                    {isProcessing ? 'Processing...' : 'Warranty Bill'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
