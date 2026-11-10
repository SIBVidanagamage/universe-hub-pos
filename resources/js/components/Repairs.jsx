import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useSales } from '@/hooks/useSales';
import { useQZ } from '@/hooks/useQZ';
import { useAuth } from '@/hooks/useAuth';
import { 
  Plus, 
  Minus, 
  Trash2, 
  Receipt, 
  Printer, 
  Wrench, 
  Search, 
  Smartphone, 
  MessageCircle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  RefreshCw, 
  User, 
  Lock, 
  DollarSign, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { supabase, webSupabase } from '@/lib/supabase';

export function Repairs() {
  const { sales, addSale } = useSales();
  const { isConnected, connect, print } = useQZ();
  const { toast } = useToast();
  const { user } = useAuth();

  // Active Main View Tab
  const isTechnician = user?.role === 'technician';
  const [activeTab, setActiveTab] = useState(isTechnician ? 'active-repairs' : 'intake');

  // ==========================================
  // STATE: Active Repairs (From Web Supabase)
  // ==========================================
  const [repairJobs, setRepairJobs] = useState([]);
  const [isLoadingRepairs, setIsLoadingRepairs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // ==========================================
  // STATE: New Repair Intake Form
  // ==========================================
  const [intakeForm, setIntakeForm] = useState({
    customerTitle: 'Mr.',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    deviceBrand: 'Apple',
    deviceModel: '',
    deviceColor: '',
    imei: '',
    passcode: '',
    issueType: 'Screen Replacement',
    issueDescription: '',
    physicalCondition: '',
    accessories: '',
    estimatedCost: '',
    advancePaid: '',
    advancePaymentMethod: 'cash',
    expectedDate: '',
  });

  const [isSubmittingIntake, setIsSubmittingIntake] = useState(false);

  // Settlement Dialog state (when customer picks up phone)
  const [settlingJob, setSettlingJob] = useState(null);
  const [settlePaymentMethod, setSettlePaymentMethod] = useState('cash');
  const [isProcessingSettle, setIsProcessingSettle] = useState(false);

  // ==========================================
  // STATE: Quick / Final Billing
  // ==========================================
  const [cart, setCart] = useState([]);
  const [directCustomerTitle, setDirectCustomerTitle] = useState('Mr.');
  const [directCustomerName, setDirectCustomerName] = useState('');
  const [directCustomerEmail, setDirectCustomerEmail] = useState('');
  const [directCustomerPhone, setDirectCustomerPhone] = useState('');
  const [sendEmailReceipt, setSendEmailReceipt] = useState(true);
  const [paymentCash, setPaymentCash] = useState(0);
  const [paymentCard, setPaymentCard] = useState(0);
  const [paymentTransfer, setPaymentTransfer] = useState(0);
  const [paymentKoko, setPaymentKoko] = useState(0);
  const [isProcessingDirect, setIsProcessingDirect] = useState(false);

  // Tracking Code Lookup in Quick Billing
  const [trackingLookup, setTrackingLookup] = useState('');
  const [activeLinkedJob, setActiveLinkedJob] = useState(null);

  const [directRepairForm, setDirectRepairForm] = useState({
      name: '',
      warrantyPeriod: '3',
      sellingPrice: '',
      discount: '',
      costPrice: ''
  });

  // Connect QZ Tray on mount
  useEffect(() => {
    if (!isConnected) connect();
  }, [connect, isConnected]);

  // Load Active Repair Jobs from Web Supabase (for live website sync)
  const fetchRepairJobs = async () => {
    setIsLoadingRepairs(true);
    try {
      const { data, error } = await webSupabase
        .from('repair_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRepairJobs(data || []);
    } catch (err) {
      console.error("Failed to load repair orders from cloud:", err);
      toast({
        title: "Cloud Sync Note",
        description: "Could not fetch live repairs from cloud: " + err.message,
        variant: "destructive"
      });
    } finally {
      setIsLoadingRepairs(false);
    }
  };

  useEffect(() => {
    fetchRepairJobs();
  }, []);

  // Customer phone auto-fill for Intake Form
  useEffect(() => {
    const searchCustomer = async () => {
      const query = intakeForm.customerPhone;
      if (!query || query.length < 4) return;

      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .ilike('phone', `%${query}%`)
          .limit(1)
          .maybeSingle();

        if (data && !error) {
          if (!intakeForm.customerName) {
            const nameParts = data.name.split(' ');
            if (['Mr.', 'Mrs.', 'Miss', 'Dr.'].includes(nameParts[0])) {
              setIntakeForm(prev => ({
                ...prev,
                customerTitle: nameParts[0],
                customerName: nameParts.slice(1).join(' '),
                customerEmail: data.email || prev.customerEmail
              }));
            } else {
              setIntakeForm(prev => ({
                ...prev,
                customerName: data.name,
                customerEmail: data.email || prev.customerEmail
              }));
            }
          }
        }
      } catch (e) {
        console.error("Customer lookup error", e);
      }
    };

    const timer = setTimeout(searchCustomer, 500);
    return () => clearTimeout(timer);
  }, [intakeForm.customerPhone]);

  // ==========================================
  // CONVERT REPAIR JOB TO FINAL BILL (Cart Load)
  // ==========================================
  const loadJobIntoQuickBilling = (job) => {
    if (!job) return;

    // Extract Advance Paid from issue_description or field
    const advMatch = (job.issue_description || '').match(/\[Adv Paid:\s*LKR\s*([0-9.]+)\]/);
    const advPaid = parseFloat(job.advance_paid) || (advMatch ? parseFloat(advMatch[1]) : 0);
    const estCost = parseFloat(job.estimated_cost) || 0;
    const balanceDue = Math.max(0, estCost - advPaid);

    // Parse Customer Name & Title
    let title = 'Mr.';
    let cleanName = job.customer_name || 'Walk-in Customer';
    const parts = cleanName.split(' ');
    if (['Mr.', 'Mrs.', 'Miss', 'Dr.'].includes(parts[0])) {
      title = parts[0];
      cleanName = parts.slice(1).join(' ');
    }

    setDirectCustomerTitle(title);
    setDirectCustomerName(cleanName);
    setDirectCustomerPhone(job.phone || '');
    setDirectCustomerEmail(job.email || '');

    // Build Cart Item
    const itemName = `${job.device_brand || ''} ${job.device_model} - ${job.issue_type} (#${job.ticket_number})`.trim();
    const repairItem = {
      uniqueCartId: `repair-${Date.now()}`,
      name: itemName,
      type: 'repair',
      warrantyPeriod: 3, // Default 3 Months repair warranty
      sellingPrice: estCost,
      discount: advPaid, // Advance already paid is applied as deduction
      advancePaid: advPaid,
      costPrice: 0,
      quantity: 1,
      itemCodes: [],
      jobTicketNumber: job.ticket_number,
      jobId: job.id
    };

    setCart([repairItem]);
    setPaymentCash(balanceDue);
    setPaymentCard(0);
    setPaymentTransfer(0);
    setPaymentKoko(0);
    setActiveLinkedJob(job);
    setTrackingLookup(job.ticket_number);

    // Switch to Quick Billing Tab
    setActiveTab('direct');

    toast({
      title: "Repair Job Loaded! 🧾",
      description: `Loaded #${job.ticket_number} for ${cleanName}. Balance due: LKR ${balanceDue.toFixed(2)}`,
    });
  };

  const handleLookupRepairJob = async (codeToSearch) => {
    const cleanCode = (codeToSearch || trackingLookup || '').trim().toUpperCase();
    if (!cleanCode) {
      toast({ title: "Tracking Code Required", description: "Please enter a tracking number (e.g. UH-5130).", variant: "destructive" });
      return;
    }

    // 1. Check local list first
    let found = repairJobs.find(j => (j.ticket_number || '').toUpperCase() === cleanCode);

    // 2. Fallback to Cloud Web Supabase lookup
    if (!found) {
      try {
        const { data, error } = await webSupabase
          .from('repair_orders')
          .select('*')
          .ilike('ticket_number', cleanCode)
          .limit(1);

        if (!error && data && data.length > 0) {
          found = data[0];
        }
      } catch (err) {
        console.error("Lookup error:", err);
      }
    }

    if (found) {
      loadJobIntoQuickBilling(found);
    } else {
      toast({
        title: "Repair Job Not Found",
        description: `No repair found with Tracking Code: ${cleanCode}`,
        variant: "destructive"
      });
    }
  };

  // ==========================================
  // PRINTING HELPERS (Dual Slips & Browser Fallback)
  // ==========================================
  const printViaBrowser = (htmlContent) => {
    const printWindow = window.open('', '_blank', 'width=450,height=700');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 300);
    }
  };

  const generateSlipsHtml = (jobData, slipMode = 'customer') => {
    const formattedDate = new Date(jobData.created_at || Date.now()).toLocaleString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });

    // Extract packed fields if reloaded from Supabase
    const passcodeMatch = (jobData.issue_description || '').match(/\[Passcode:\s*([^\]]+)\]/);
    const condMatch = (jobData.issue_description || '').match(/\[Cond:\s*([^\]]+)\]/);
    const accMatch = (jobData.issue_description || '').match(/\[Acc:\s*([^\]]+)\]/);
    const advMatch = (jobData.issue_description || '').match(/\[Adv Paid:\s*LKR\s*([0-9.]+)\]/);

    const passcode = jobData.passcode || (passcodeMatch ? passcodeMatch[1] : '');
    const physicalCondition = jobData.physical_condition || (condMatch ? condMatch[1] : '');
    const accessories = jobData.accessories || (accMatch ? accMatch[1] : '');

    const cleanIssueDesc = (jobData.issue_description || '')
      .replace(/\[Passcode:\s*[^\]]+\]/g, '')
      .replace(/\[Cond:\s*[^\]]+\]/g, '')
      .replace(/\[Acc:\s*[^\]]+\]/g, '')
      .replace(/\[Adv Paid:\s*[^\]]+\]/g, '')
      .trim();

    const estCost = parseFloat(jobData.estimated_cost) || 0;
    const advPaid = parseFloat(jobData.advance_paid) || (advMatch ? parseFloat(advMatch[1]) : 0);
    const balance = Math.max(0, estCost - advPaid);

    // SLIP 1: CUSTOMER HANDOVER RECEIPT
    const customerSlipHtml = `
      <div style="font-family: Arial, sans-serif; font-size: 9pt; width: 72mm; margin: 0 auto; padding: 2mm;">
        <div style="text-align: center; margin-bottom: 5px;">
          <h2 style="font-size: 13pt; margin: 0; font-weight: bold; letter-spacing: 0.5px;">UNIVERSE HUB</h2>
          <p style="margin: 1px 0; font-size: 7.5pt; color: #333;">Mobile Store & Certified Repair Lab</p>
          <p style="margin: 1px 0; font-size: 7.5pt;">188/8 C, High Level Road, Maharagama</p>
          <p style="margin: 1px 0; font-size: 8pt; font-weight: bold;">Hotline: 074-021-9239</p>
        </div>
        
        <div style="text-align: center; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 3px 0; margin: 5px 0;">
          <strong style="font-size: 9.5pt; letter-spacing: 0.5px;">DEVICE HANDOVER RECEIPT</strong><br/>
          <span style="font-size: 7pt; color: #555;">[ CUSTOMER COPY ]</span>
        </div>

        <div style="border: 2px solid #000; border-radius: 6px; padding: 6px; text-align: center; margin: 6px 0; background: #f8fafc;">
          <div style="font-size: 7.5pt; text-transform: uppercase; font-weight: bold; color: #555;">LIVE TRACKING NUMBER</div>
          <div style="font-size: 18pt; font-weight: 900; letter-spacing: 1.5px; color: #0284c7;">${jobData.ticket_number}</div>
          <div style="font-size: 7.5pt; color: #333; margin-top: 2px;">
            Track live: <strong>universehub.store</strong>
          </div>
        </div>

        <table style="width: 100%; font-size: 8pt; border-collapse: collapse; margin-top: 4px;">
          <tr><td style="padding: 2px 0; color: #555; width: 38%;">Date / Time:</td><td style="text-align: right; font-weight: 600;">${formattedDate}</td></tr>
          <tr><td style="padding: 2px 0; color: #555;">Customer:</td><td style="text-align: right; font-weight: 600;">${jobData.customer_name}</td></tr>
          <tr><td style="padding: 2px 0; color: #555;">Phone:</td><td style="text-align: right; font-weight: 600;">${jobData.phone}</td></tr>
          <tr><td colspan="2" style="border-top: 1px dotted #ccc; padding-top: 3px;"></td></tr>
          <tr><td style="padding: 2px 0; color: #555;">Device:</td><td style="text-align: right; font-weight: bold;">${jobData.device_brand || ''} ${jobData.device_model || 'Mobile'}</td></tr>
          ${jobData.device_color ? `<tr><td style="padding: 2px 0; color: #555;">Color:</td><td style="text-align: right;">${jobData.device_color}</td></tr>` : ''}
          ${jobData.imei ? `<tr><td style="padding: 2px 0; color: #555;">IMEI/SN:</td><td style="text-align: right; font-family: monospace;">${jobData.imei}</td></tr>` : ''}
          <tr><td style="padding: 2px 0; color: #555;">Fault / Issue:</td><td style="text-align: right; font-weight: 600;">${jobData.issue_type}</td></tr>
          ${jobData.expected_date ? `<tr><td style="padding: 2px 0; color: #555;">Est. Ready:</td><td style="text-align: right; font-weight: bold; color: #059669;">${jobData.expected_date}</td></tr>` : ''}
          <tr><td colspan="2" style="border-top: 1px dashed #000; padding-top: 4px;"></td></tr>
          <tr><td style="padding: 2px 0; font-size: 8.5pt;">Est. Total Cost:</td><td style="text-align: right; font-size: 8.5pt; font-weight: 600;">LKR ${estCost.toFixed(2)}</td></tr>
          <tr><td style="padding: 2px 0; font-size: 8.5pt;">Advance Paid:</td><td style="text-align: right; font-size: 8.5pt; font-weight: 600;">LKR ${advPaid.toFixed(2)}</td></tr>
          <tr style="border-top: 1px solid #000;"><td style="padding: 3px 0; font-size: 9.5pt; font-weight: bold;">Balance Due:</td><td style="text-align: right; font-size: 9.5pt; font-weight: bold; color: #dc2626;">LKR ${balance.toFixed(2)}</td></tr>
        </table>

        <div style="border-top: 1px dashed #777; margin-top: 8px; padding-top: 4px; font-size: 6.8pt; color: #555; line-height: 1.2;">
          • Please present this receipt to collect your mobile device.<br/>
          • Universe Hub is not liable for data loss. Please back up data.<br/>
          • Devices uncollected after 30 days may incur storage fees.
        </div>
        
        <div style="margin-top: 18px; display: flex; justify-content: space-between; font-size: 7pt; text-align: center;">
          <div>........................<br/>Customer Sign</div>
          <div>........................<br/>Shop Officer</div>
        </div>
      </div>
    `;

    // SLIP 2: TECHNICIAN JOB SHEET (STUCK TO / KEPT WITH THE DEVICE)
    const technicianSlipHtml = `
      <div style="font-family: Arial, sans-serif; font-size: 9pt; width: 72mm; margin: 0 auto; padding: 2mm;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 3px; margin-bottom: 5px;">
          <div style="font-size: 11pt; font-weight: 900; letter-spacing: 0.5px;">UNIVERSE HUB - LAB</div>
          <div style="font-size: 8pt; font-weight: bold; background: #000; color: #fff; padding: 2px 4px; border-radius: 2px; margin-top: 2px; display: inline-block;">
            ⚡ TECHNICIAN JOB SHEET ⚡
          </div>
        </div>

        <div style="border: 2px solid #000; padding: 4px; text-align: center; margin-bottom: 6px; background: #fafafa;">
          <div style="font-size: 7.5pt; font-weight: bold; text-transform: uppercase;">JOB TRACKING ID</div>
          <div style="font-size: 18pt; font-weight: 900; letter-spacing: 1.5px; color: #000;">${jobData.ticket_number}</div>
        </div>

        <table style="width: 100%; font-size: 8pt; border-collapse: collapse;">
          <tr><td style="padding: 2px 0; color: #555; width: 35%;">Date / Time:</td><td style="text-align: right; font-weight: 600;">${formattedDate}</td></tr>
          <tr><td style="padding: 2px 0; color: #555;">Customer:</td><td style="text-align: right; font-weight: 600;">${jobData.customer_name} (${jobData.phone})</td></tr>
          <tr><td colspan="2" style="border-top: 1px solid #000; padding-top: 3px;"></td></tr>
          <tr><td style="padding: 2px 0; font-size: 9pt; font-weight: bold;">DEVICE:</td><td style="text-align: right; font-size: 9pt; font-weight: bold;">${jobData.device_brand || ''} ${jobData.device_model || 'Mobile'}</td></tr>
          ${jobData.device_color ? `<tr><td style="padding: 2px 0; color: #555;">Color:</td><td style="text-align: right;">${jobData.device_color}</td></tr>` : ''}
          ${jobData.imei ? `<tr><td style="padding: 2px 0; color: #555;">IMEI/SN:</td><td style="text-align: right; font-family: monospace;">${jobData.imei}</td></tr>` : ''}
          
          <!-- PASSCODE PROMINENTLY DISPLAYED FOR TECHNICIAN -->
          <tr style="background: #e2e8f0;">
            <td style="padding: 4px; font-weight: 900; color: #000;">LOCK CODE:</td>
            <td style="padding: 4px; text-align: right; font-weight: 900; font-size: 11pt; color: #000; font-family: monospace;">
              ${passcode || 'NO LOCK'}
            </td>
          </tr>

          <tr><td colspan="2" style="border-top: 1px solid #000; padding-top: 3px;"></td></tr>
          <tr><td style="padding: 2px 0; font-weight: bold;">FAULT:</td><td style="text-align: right; font-weight: bold; color: #b91c1c;">${jobData.issue_type}</td></tr>
          <tr>
            <td colspan="2" style="padding: 4px 0;">
              <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 4px; border-radius: 3px; font-size: 8pt;">
                <strong>Work to be done:</strong> ${cleanIssueDesc || 'Standard repair & inspection.'}
              </div>
            </td>
          </tr>

          ${physicalCondition ? `
          <tr><td colspan="2" style="padding: 2px 0; font-size: 7.5pt; color: #444;">
            <strong>Condition:</strong> ${physicalCondition}
          </td></tr>` : ''}

          ${accessories ? `
          <tr><td colspan="2" style="padding: 2px 0; font-size: 7.5pt; color: #444;">
            <strong>Left with phone:</strong> ${accessories}
          </td></tr>` : ''}
          
          <tr><td colspan="2" style="border-top: 1px dashed #666; padding-top: 3px;"></td></tr>
          <tr><td style="padding: 2px 0; color: #555;">Target:</td><td style="text-align: right; font-weight: bold;">${jobData.expected_date || 'ASAP'}</td></tr>
          <tr><td style="padding: 2px 0; color: #555;">Balance Due:</td><td style="text-align: right; font-weight: bold; color: #b91c1c;">LKR ${balance.toFixed(2)}</td></tr>
        </table>

        <div style="border-top: 1px solid #000; margin-top: 8px; padding-top: 4px; font-size: 7.5pt;">
          <strong>Technician Notes / Parts Used:</strong>
          <div style="height: 28px; border-bottom: 1px dotted #888;"></div>
          <div style="height: 25px; border-bottom: 1px dotted #888;"></div>
        </div>

        <div style="margin-top: 6px; font-size: 6.8pt; text-align: center; color: #666;">
          Universe Hub Service Lab - Internal Device Tag
        </div>
      </div>
    `;

    let finalBody = '';
    if (slipMode === 'technician') finalBody = technicianSlipHtml;
    else finalBody = customerSlipHtml;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Universe Hub Repair Slip - ${jobData.ticket_number}</title>
          <style>
            @media print {
              body { margin: 0; padding: 0; }
              @page { margin: 2mm; size: 76mm auto; }
            }
          </style>
        </head>
        <body style="margin: 0; padding: 4px; background: #fff; color: #000;">
          ${finalBody}
        </body>
      </html>
    `;
  };

  const handlePrintSlips = async (jobData, slipMode = 'customer') => {
    const htmlContent = generateSlipsHtml(jobData, slipMode);

    if (isConnected && window.qz) {
      try {
        const printerName = "Xprinter XP-365B";
        const config = window.qz.configs.create(printerName, {
          size: { width: 76 }, units: 'mm',
          margins: { top: 0, right: 0, bottom: 0, left: 0 }
        });
        const printData = [{ type: 'html', format: 'plain', data: htmlContent }];
        await print(config, printData);
        toast({ title: "Printed Successfully", description: `Slip sent to ${printerName}.` });
        return;
      } catch (e) {
        console.warn("QZ Tray printing failed, falling back to browser print:", e);
      }
    }

    // Direct Browser Print Fallback (Works on mobile & without QZ Tray)
    printViaBrowser(htmlContent);
  };

  // ==========================================
  // FINAL SALES BILL PRINTING (Thermal & EPSON)
  // ==========================================
  const handlePrintFinalBill = async (saleData, printerType = 'thermal') => {
    const printerName = printerType === 'thermal' ? "Xprinter XP-365B" : "EPSON LQ-310";

    const formattedDate = new Date(saleData.created_at || Date.now()).toLocaleString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });

    const billItems = saleData.items || [];
    let billHtml = '';

    if (printerType === 'thermal') {
      const thermalItemsHtml = billItems.map((item, index) => {
        const itemTotal = (item.quantity * item.price_at_sale) - ((item.discount || 0) * item.quantity);
        const name = item.saleable?.name || item.name || 'Repair Service';
        const warranty = item.saleable?.warranty_period_months;
        return `
          <tr>
            <td style="padding: 2px 0; border-bottom: 1px dotted #ccc;" colspan="4">
              ${name}
              ${warranty ? `<br/><small style="font-size: 7.5pt; color: #555;">(${warranty} Months Warranty)</small>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding: 2px 0; text-align: left;">${item.quantity}</td>
            <td style="padding: 2px 0; text-align: right;">${parseFloat(item.price_at_sale).toFixed(2)}</td>
            <td style="padding: 2px 0; text-align: right;">${parseFloat(item.discount || 0).toFixed(2)}</td>
            <td style="padding: 2px 0; text-align: right; font-weight: bold;">${itemTotal.toFixed(2)}</td>
          </tr>
        `;
      }).join('');

      billHtml = `
        <!DOCTYPE html>
        <html>
          <body style="font-family: Arial, sans-serif; font-size: 9pt; width: 72mm; margin: 0 auto; padding: 2mm;">
            <div style="text-align: center; margin-bottom: 5px;">
              <h1 style="font-size: 14pt; margin: 0; font-weight: bold;">UNIVERSE HUB</h1>
              <p style="margin: 0; font-size: 8pt;">188/8 C, High Level Road, Maharagama</p>
              <p style="margin: 0; font-size: 8pt;">Phone: 074-021-9239</p>
            </div>
            <div style="text-align: center; border-top: 1px dashed black; border-bottom: 1px dashed black; padding: 2px 0; margin-bottom: 5px;">
              <strong>FINAL REPAIR INVOICE</strong>
            </div>
            <table style="width: 100%; font-size: 8pt; margin-bottom: 5px;">
              <tr><td style="text-align: left;"><strong>Inv #:</strong> ${saleData.id || 'N/A'}</td><td style="text-align: right;">${formattedDate}</td></tr>
              <tr><td style="text-align: left;"><strong>Cashier:</strong> ${saleData.user?.name || user?.name || 'Staff'}</td><td style="text-align: right;"><strong>Cust:</strong> ${saleData.customer_name}</td></tr>
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
            <table style="width: 100%; margin-top: 5px; font-size: 8.5pt;">
              <tr><td style="text-align: right; padding-right: 10px;">Subtotal:</td><td style="text-align: right;">${parseFloat(saleData.subtotal).toFixed(2)}</td></tr>
              ${parseFloat(saleData.discount) > 0 ? `<tr><td style="text-align: right; padding-right: 10px; color: #059669;">Advance / Dis:</td><td style="text-align: right; color: #059669;">- ${parseFloat(saleData.discount).toFixed(2)}</td></tr>` : ''}
              <tr style="border-top: 1px solid black;"><td style="text-align: right; padding-right: 10px; font-size: 10pt; font-weight: bold;">Amount Paid:</td><td style="text-align: right; font-size: 10pt; font-weight: bold;">LKR ${parseFloat(saleData.total).toFixed(2)}</td></tr>
            </table>
            <div style="text-align: center; margin-top: 12px; font-size: 8pt; border-top: 1px dashed #666; padding-top: 5px;">
              <p style="margin: 0;">Thank you for trusting Universe Hub Repair Lab!</p>
              <p style="margin: 2px 0 0 0; font-size: 7pt; color: #555;">Please bring this bill for any warranty claims.</p>
            </div>
          </body>
        </html>
      `;
    } else {
      // EPSON LQ-310 Dot Matrix / Warranty Format
      const dotMatrixItemsHtml = billItems.map((item, index) => {
        const itemTotal = (item.quantity * item.price_at_sale) - ((item.discount || 0) * item.quantity);
        const name = item.saleable?.name || item.name || 'Repair Service';
        const warranty = item.saleable?.warranty_period_months;
        return `
          <tr>
            <td style="padding: 3px 5px; text-align: left;">${index + 1}.</td>
            <td style="padding: 3px 5px; text-align: left;">
              ${name}
              ${warranty ? `<br/><small>(${warranty} Months Warranty)</small>` : ''}
            </td>
            <td style="padding: 3px 5px; text-align: right;">${item.quantity}</td>
            <td style="padding: 3px 5px; text-align: right;">${parseFloat(item.price_at_sale).toFixed(2)}</td>
            <td style="padding: 3px 5px; text-align: right;">${parseFloat(item.discount || 0).toFixed(2)}</td>
            <td style="padding: 3px 5px; text-align: right; font-weight: bold;">${itemTotal.toFixed(2)}</td>
          </tr>
        `;
      }).join('');

      billHtml = `
        <!DOCTYPE html>
        <html>
          <body style="font-family: 'Courier New', monospace; font-size: 10pt; width: 100%; padding: 0.1in;">
            <div style="text-align: center; margin-bottom: 10px;">
              <h1 style="font-size: 16pt; margin: 0; font-weight: bold;">UNIVERSE HUB</h1>
              <p style="margin: 0; font-size: 9pt;">188/8 C, High Level Road, Maharagama</p>
              <p style="margin: 0; font-size: 9pt;">Hotline: 074-021-9239</p>
            </div>
            <h2 style="font-size: 10pt; border-top: 1px dashed black; border-bottom: 1px dashed black; padding: 4px 0; text-align: center;">REPAIR WARRANTY INVOICE</h2>
            <table style="width: 100%; font-size: 8.5pt; margin-top: 8px;">
              <tr><td><strong>Invoice #:</strong> ${saleData.id}</td><td style="text-align: right;"><strong>Date:</strong> ${formattedDate}</td></tr>
              <tr><td><strong>Cashier:</strong> ${saleData.user?.name || user?.name || 'Staff'}</td><td style="text-align: right;"><strong>Customer:</strong> ${saleData.customer_name}</td></tr>
              ${saleData.customer_phone ? `<tr><td><strong>Phone:</strong> ${saleData.customer_phone}</td><td></td></tr>` : ''}
            </table>
            <hr style="border: 1px dashed black; margin: 8px 0;" />
            <table style="width: 100%; font-size: 8.5pt; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 1px solid black;">
                  <th style="text-align: left; padding: 2px;">#</th>
                  <th style="text-align: left; padding: 2px;">Item / Service</th>
                  <th style="text-align: right; padding: 2px;">Qty</th>
                  <th style="text-align: right; padding: 2px;">Price</th>
                  <th style="text-align: right; padding: 2px;">Dis.</th>
                  <th style="text-align: right; padding: 2px;">Total</th>
                </tr>
              </thead>
              <tbody>${dotMatrixItemsHtml}</tbody>
            </table>
            <hr style="border: 1px dashed black; margin: 8px 0;" />
            <table style="width: 100%; font-size: 8.5pt;">
              <tr><td style="text-align: right; width: 80%;">Subtotal:</td><td style="text-align: right;">LKR ${parseFloat(saleData.subtotal).toFixed(2)}</td></tr>
              ${parseFloat(saleData.discount) > 0 ? `<tr><td style="text-align: right; width: 80%;">Advance / Discount:</td><td style="text-align: right;">- LKR ${parseFloat(saleData.discount).toFixed(2)}</td></tr>` : ''}
              <tr><td style="text-align: right; width: 80%; font-size: 10pt; font-weight: bold;">Grand Total:</td><td style="text-align: right; font-size: 10pt; font-weight: bold;">LKR ${parseFloat(saleData.total).toFixed(2)}</td></tr>
            </table>
            <div style="text-align: center; margin-top: 15px; font-size: 8.5pt;">
              <p>Thank you for trusting Universe Hub Repair Lab!</p>
            </div>
          </body>
        </html>
      `;
    }

    if (isConnected && window.qz) {
      try {
        const config = window.qz.configs.create(printerName, 
          printerType === 'thermal'
            ? { size: { width: 76 }, units: 'mm', margins: { top: 0, right: 0, bottom: 0, left: 0 } }
            : { size: { width: 9.5, height: 5.5 }, units: 'in', margins: { top: 0.25, right: 0.25, bottom: 0.25, left: 0.25 } }
        );
        const data = [{ type: 'html', format: 'plain', data: billHtml }];
        await print(config, data);
        toast({ title: "Printed Successfully", description: `Final Bill sent to ${printerName}.` });
        return;
      } catch (e) {
        console.warn("QZ Tray printing failed, falling back to browser print:", e);
      }
    }

    // Direct Browser Print Fallback
    printViaBrowser(billHtml);
  };

  // ==========================================
  // INTAKE: Create New Repair Job
  // ==========================================
  const handleIntakeSubmit = async (e) => {
    e.preventDefault();

    if (!intakeForm.customerName || !intakeForm.customerPhone || !intakeForm.deviceModel) {
      toast({
        title: "Required Fields Missing",
        description: "Customer Name, Phone, and Device Model are required.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmittingIntake(true);

    try {
      // 1. Generate unique Tracking Number UH-XXXX (matching universehub.store style)
      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      const trackingCode = `UH-${randomDigits}`;
      const recordId = `rep-${Date.now()}`;

      const fullName = `${intakeForm.customerTitle} ${intakeForm.customerName}`.trim();
      const estCost = parseFloat(intakeForm.estimatedCost) || 0;
      const advPaid = parseFloat(intakeForm.advancePaid) || 0;

      // Pack additional rich details into issue_description so the website displays it
      let fullIssueDesc = intakeForm.issueDescription || '';
      if (intakeForm.passcode) fullIssueDesc += ` [Passcode: ${intakeForm.passcode}]`;
      if (intakeForm.physicalCondition) fullIssueDesc += ` [Cond: ${intakeForm.physicalCondition}]`;
      if (intakeForm.accessories) fullIssueDesc += ` [Acc: ${intakeForm.accessories}]`;
      if (advPaid > 0) fullIssueDesc += ` [Adv Paid: LKR ${advPaid.toFixed(2)}]`;

      const newJobPayload = {
        id: recordId,
        ticket_number: trackingCode,
        customer_name: fullName,
        phone: intakeForm.customerPhone,
        device_brand: intakeForm.deviceBrand,
        device_model: intakeForm.deviceModel,
        issue_type: intakeForm.issueType,
        issue_description: fullIssueDesc,
        estimated_cost: estCost,
        status: 'Received',
        created_at: new Date().toISOString()
      };

      // 2. Insert into Web Supabase (mukctesllfgdgvkttjkb) for live tracking on universehub.store
      const { error: webError } = await webSupabase
        .from('repair_orders')
        .insert([newJobPayload]);

      if (webError) {
        console.error("Web Supabase insert error:", webError);
        throw new Error("Could not sync repair to cloud: " + webError.message);
      }

      // Also ensure customer exists in POS customers table
      try {
        await supabase.from('customers').upsert([{
          name: fullName,
          phone: intakeForm.customerPhone,
          email: intakeForm.customerEmail || null
        }], { onConflict: 'phone' });
      } catch (custErr) {
        // Non-fatal
      }

      // 3. Keep full local representation for slips
      const fullJobData = {
        ...newJobPayload,
        device_color: intakeForm.deviceColor,
        imei: intakeForm.imei,
        passcode: intakeForm.passcode,
        physical_condition: intakeForm.physicalCondition,
        accessories: intakeForm.accessories,
        advance_paid: advPaid,
        expected_date: intakeForm.expectedDate
      };

      // Update local state list
      setRepairJobs(prev => [fullJobData, ...prev]);

      toast({
        title: "Repair Registered & Synced Live! 🎉",
        description: `Tracking ID: ${trackingCode}. Customer can now track at universehub.store!`,
      });

      // 4. Print ONLY Customer Handover Receipt (clean single slip, no alignment issues)
      await handlePrintSlips(fullJobData, 'customer');

      // Reset Form
      setIntakeForm({
        customerTitle: 'Mr.',
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        deviceBrand: 'Apple',
        deviceModel: '',
        deviceColor: '',
        imei: '',
        passcode: '',
        issueType: 'Screen Replacement',
        issueDescription: '',
        physicalCondition: '',
        accessories: '',
        estimatedCost: '',
        advancePaid: '',
        advancePaymentMethod: 'cash',
        expectedDate: '',
      });

      // Switch to active repairs view
      setActiveTab('active-repairs');

    } catch (err) {
      toast({
        title: "Intake Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmittingIntake(false);
    }
  };

  // ==========================================
  // STATUS UPDATE: 1-Click for Technicians
  // ==========================================
  const handleUpdateStatus = async (jobId, newStatus) => {
    try {
      const { error } = await webSupabase
        .from('repair_orders')
        .update({ status: newStatus })
        .eq('id', jobId);

      if (error) throw error;

      setRepairJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, status: newStatus } : job
      ));

      toast({
        title: "Status Updated! ⚡",
        description: `Marked as "${newStatus}". Website live tracker updated immediately!`,
      });
    } catch (err) {
      toast({
        title: "Update Failed",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  // 1-Click WhatsApp Notification Composer
  const handleSendWhatsApp = (job) => {
    const rawDigits = (job.phone || '').replace(/[^0-9]/g, '');
    let waPhone = rawDigits;
    if (waPhone.startsWith('0')) waPhone = '94' + waPhone.slice(1);
    else if (!waPhone.startsWith('94')) waPhone = '94' + waPhone;

    const deviceName = `${job.device_brand || ''} ${job.device_model || 'Device'}`.trim();
    const statusMsg = job.status === 'Ready for Pickup' 
      ? `✅ GREAT NEWS! Your ${deviceName} repair is COMPLETE and READY FOR PICKUP at our front desk.`
      : `Current repair status is: "${job.status}".`;

    const msg = `Hello ${job.customer_name || 'Customer'}! 👋\nThis is Universe Hub Mobile Repair Lab (Maharagama).\n\n📱 Device: ${deviceName}\n🔖 Tracking ID: #${job.ticket_number}\n⚡ ${statusMsg}\n\nYou can track live progress anytime at:\n👉 https://universehub.store#repair-center\n\nHotline: 074-021-9239\nThank you!`;

    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // ==========================================
  // FINAL DELIVERY & BALANCE SETTLEMENT MODAL
  // ==========================================
  const handleOpenSettleDialog = (job) => {
    setSettlingJob(job);
  };

  const handleConfirmSettle = async () => {
    if (!settlingJob) return;
    setIsProcessingSettle(true);

    try {
      // 1. Mark status as 'Completed' on Web Supabase
      const { error } = await webSupabase
        .from('repair_orders')
        .update({ status: 'Completed' })
        .eq('id', settlingJob.id);

      if (error) throw error;

      setRepairJobs(prev => prev.map(j => j.id === settlingJob.id ? { ...j, status: 'Completed' } : j));

      toast({
        title: "Repair Completed & Delivered! 🎉",
        description: `Job #${settlingJob.ticket_number} marked as Completed.`,
      });

      setSettlingJob(null);
    } catch (err) {
      toast({
        title: "Settlement Error",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessingSettle(false);
    }
  };

  // ==========================================
  // QUICK BILLING / FINAL REPAIR SALES CHECKOUT
  // ==========================================
  const addRepairToCart = (e) => {
    e.preventDefault();
    if (!directRepairForm.name || !directRepairForm.sellingPrice) {
      toast({ title: "Required Fields", description: "Repair Name and Price are required.", variant: "destructive" });
      return;
    }

    const newItem = {
      uniqueCartId: `repair-${Date.now()}`,
      name: directRepairForm.name,
      type: 'repair',
      warrantyPeriod: parseInt(directRepairForm.warrantyPeriod) || 0,
      sellingPrice: parseFloat(directRepairForm.sellingPrice) || 0,
      discount: parseFloat(directRepairForm.discount) || 0,
      costPrice: parseFloat(directRepairForm.costPrice) || 0,
      quantity: 1,
      itemCodes: []
    };

    setCart([...cart, newItem]);
    setDirectRepairForm({
      name: '',
      warrantyPeriod: '3',
      sellingPrice: '',
      discount: '',
      costPrice: ''
    });
  };

  const updateQuantity = (uniqueCartId, newQuantity) => {
    if (newQuantity <= 0) {
      setCart(cart.filter(item => item.uniqueCartId !== uniqueCartId));
      return;
    }
    setCart(cart.map(item => item.uniqueCartId === uniqueCartId ? { ...item, quantity: newQuantity } : item));
  };

  const updateItemDiscount = (uniqueCartId, discountValue) => {
    const newDiscount = discountValue === '' ? '' : (parseFloat(discountValue) || 0);
    setCart(cart.map(item => item.uniqueCartId === uniqueCartId ? { ...item, discount: newDiscount } : item));
  };

  const calculateSubtotal = () => cart.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
  const calculateTotalDiscount = () => cart.reduce((sum, item) => sum + ((parseFloat(item.discount) || 0) * item.quantity), 0);

  const subtotal = calculateSubtotal();
  const totalDiscount = calculateTotalDiscount();
  const grandTotal = Math.max(0, subtotal - totalDiscount);

  const processDirectSale = async (printerType) => {
    if (cart.length === 0) {
      toast({ title: "Empty Cart", variant: "destructive" });
      return;
    }

    setIsProcessingDirect(true);

    try {
      const transformedCart = [];
      for (const item of cart) {
        const { data, error } = await supabase.from('products').insert([{
           name: item.name,
           category: 'Repair',
           sku: 'REP-' + Date.now() + Math.floor(Math.random()*1000),
           barcode: item.jobTicketNumber || ('REP-' + Date.now() + Math.floor(Math.random()*1000)),
           quantity: 1, 
           min_stock_level: 0,
           cost_price: item.costPrice || 0,
           selling_price: item.sellingPrice,
           warranty_period_months: item.warrantyPeriod || 0,
           product_type: 'general' 
        }]).select('id, name, warranty_period_months').single();
        
        if (error) throw new Error("Failed to record repair service in DB: " + error.message);
        
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
        customerName: directCustomerName ? `${directCustomerTitle} ${directCustomerName}` : 'Walk-in Customer',
        customerEmail: directCustomerEmail || null,
        customerPhone: directCustomerPhone || null,
        sendEmailReceipt,
        paymentCash: parseFloat(paymentCash) || 0,
        paymentCard: parseFloat(paymentCard) || 0,
        paymentTransfer: parseFloat(paymentTransfer) || 0,
        paymentKoko: parseFloat(paymentKoko) || 0,
        exchangeValue: 0, 
        cart: transformedCart
      };

      const newSaleData = await addSale(salePayload);

      // If this checkout was linked to an active repair job, mark it as 'Completed' in Web Supabase
      const linkedJob = activeLinkedJob || cart.find(i => i.jobTicketNumber);
      if (linkedJob) {
        const ticketCode = linkedJob.ticket_number || linkedJob.jobTicketNumber;
        try {
          await webSupabase
            .from('repair_orders')
            .update({ status: 'Completed' })
            .eq('ticket_number', ticketCode);

          setRepairJobs(prev => prev.map(j => 
            j.ticket_number === ticketCode ? { ...j, status: 'Completed' } : j
          ));
        } catch (e) {
          console.warn("Could not update linked repair status to Completed:", e);
        }
      }

      toast({ 
        title: "Final Repair Bill Recorded! 🎉", 
        description: `Total: LKR ${newSaleData.total}. Status updated to Completed.` 
      });

      // Print the chosen bill format (Thermal or EPSON)
      const printData = {
        ...newSaleData,
        items: newSaleData.items.map((it, idx) => ({
          ...it,
          saleable: { ...it.saleable, name: cart[idx]?.name || 'Repair Service' }
        }))
      };

      await handlePrintFinalBill(printData, printerType);

      // Reset Quick Billing
      setCart([]);
      setDirectCustomerName('');
      setDirectCustomerEmail('');
      setDirectCustomerPhone('');
      setPaymentCash(0);
      setPaymentCard(0);
      setPaymentTransfer(0);
      setPaymentKoko(0);
      setActiveLinkedJob(null);
      setTrackingLookup('');
    } catch (err) {
      toast({ title: "Checkout Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsProcessingDirect(false);
    }
  };

  // Filtered Repair Jobs for Active Repairs View
  const filteredJobs = useMemo(() => {
    return repairJobs.filter(job => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q || 
        (job.ticket_number || '').toLowerCase().includes(q) ||
        (job.customer_name || '').toLowerCase().includes(q) ||
        (job.phone || '').toLowerCase().includes(q) ||
        (job.device_model || '').toLowerCase().includes(q);

      const status = (job.status || 'received').toLowerCase();
      const matchStatus = statusFilter === 'all' || 
        (statusFilter === 'received' && status.includes('receive')) ||
        (statusFilter === 'diagnostic' && status.includes('diag')) ||
        (statusFilter === 'in-progress' && (status.includes('progress') || status.includes('process'))) ||
        (statusFilter === 'ready' && status.includes('ready')) ||
        (statusFilter === 'completed' && status.includes('complete'));

      return matchQuery && matchStatus;
    });
  }, [repairJobs, searchQuery, statusFilter]);

  const getStatusBadge = (status = '') => {
    const s = status.toLowerCase();
    if (s.includes('ready')) {
      return <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40">✅ Ready for Pickup</Badge>;
    }
    if (s.includes('progress') || s.includes('process')) {
      return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40">⚙️ In Progress</Badge>;
    }
    if (s.includes('diag')) {
      return <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40">🔍 Diagnostic</Badge>;
    }
    if (s.includes('complete')) {
      return <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40">🎉 Completed</Badge>;
    }
    return <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/40">📥 Received</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <span className="p-2 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 text-cyan-400">
              <Wrench className="w-8 h-8" />
            </span>
            Mobile Repair Lab
          </h1>
          <p className="text-cosmic-titanium text-sm sm:text-base mt-1">
            Intake handover receipts, technician job slip, final sales billing & live web tracking
          </p>
        </div>

        {/* Tab Switcher Buttons */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10 overflow-x-auto">
          <Button
            size="sm"
            variant={activeTab === 'active-repairs' ? 'default' : 'ghost'}
            className={activeTab === 'active-repairs' ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg' : 'text-gray-300 hover:text-white'}
            onClick={() => setActiveTab('active-repairs')}
          >
            <Clock className="w-4 h-4 mr-2" />
            Active Repairs ({repairJobs.length})
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'intake' ? 'default' : 'ghost'}
            className={activeTab === 'intake' ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg' : 'text-gray-300 hover:text-white'}
            onClick={() => setActiveTab('intake')}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Device Intake (Handover)
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'direct' ? 'default' : 'ghost'}
            className={activeTab === 'direct' ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg' : 'text-gray-300 hover:text-white'}
            onClick={() => setActiveTab('direct')}
          >
            <Receipt className="w-4 h-4 mr-2" />
            Quick / Final Billing
          </Button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: ACTIVE REPAIRS & TECHNICIAN MOBILE WORKBENCH      */}
      {/* ======================================================== */}
      {activeTab === 'active-repairs' && (
        <div className="space-y-4">
          {/* Search & Status Filters */}
          <Card className="glass-effect border-white/10">
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    placeholder="Search by Tracking Code (e.g. UH-5130), Customer, Phone, Model..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                  />
                </div>
                <Button 
                  variant="outline" 
                  onClick={fetchRepairJobs} 
                  disabled={isLoadingRepairs}
                  className="border-white/20 text-white hover:bg-white/10 shrink-0"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingRepairs ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
                {[
                  { id: 'all', label: 'All Jobs' },
                  { id: 'received', label: '📥 Received' },
                  { id: 'diagnostic', label: '🔍 Diagnostic' },
                  { id: 'in-progress', label: '⚙️ In Progress' },
                  { id: 'ready', label: '✅ Ready for Pickup' },
                  { id: 'completed', label: '🎉 Completed' }
                ].map(tab => (
                  <Button
                    key={tab.id}
                    size="sm"
                    variant={statusFilter === tab.id ? 'default' : 'outline'}
                    className={`rounded-xl text-xs whitespace-nowrap ${statusFilter === tab.id ? 'bg-white/20 text-white border-white/30' : 'bg-transparent border-white/10 text-gray-300'}`}
                    onClick={() => setStatusFilter(tab.id)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Repair Jobs Cards (Mobile-Responsive Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredJobs.map(job => {
              // Extract passcode & extra info if packed into issue_description
              const passcodeMatch = (job.issue_description || '').match(/\[Passcode:\s*([^\]]+)\]/);
              const extractedPasscode = passcodeMatch ? passcodeMatch[1] : '';
              
              const advMatch = (job.issue_description || '').match(/\[Adv Paid:\s*LKR\s*([0-9.]+)\]/);
              const advPaid = parseFloat(job.advance_paid) || (advMatch ? parseFloat(advMatch[1]) : 0);

              const cleanDesc = (job.issue_description || '')
                .replace(/\[Passcode:\s*[^\]]+\]/g, '')
                .replace(/\[Cond:\s*[^\]]+\]/g, '')
                .replace(/\[Acc:\s*[^\]]+\]/g, '')
                .replace(/\[Adv Paid:\s*[^\]]+\]/g, '')
                .trim();

              const estCost = parseFloat(job.estimated_cost) || 0;
              const balanceDue = Math.max(0, estCost - advPaid);
              const isCompleted = (job.status || '').toLowerCase().includes('complete');

              return (
                <Card 
                  key={job.id} 
                  className={`glass-effect border-white/10 hover:border-white/25 transition-all shadow-lg flex flex-col justify-between ${isCompleted ? 'opacity-70' : ''}`}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-blue-500/20 text-cyan-300 border border-blue-500/30">
                          {job.ticket_number}
                        </span>
                        <h3 className="font-bold text-lg text-white mt-2 leading-tight">
                          {job.device_brand || ''} {job.device_model}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {job.customer_name} • {job.phone}
                        </p>
                      </div>
                      <div>
                        {getStatusBadge(job.status)}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-2 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      {/* Fault / Work to be done */}
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs">
                        <span className="font-semibold text-rose-400 block mb-0.5">
                          🔧 Fault: {job.issue_type}
                        </span>
                        <p className="text-gray-300 line-clamp-2">
                          {cleanDesc || 'Standard inspection and repair.'}
                        </p>
                      </div>

                      {/* Passcode Pill (Super useful for technician on mobile!) */}
                      {extractedPasscode && (
                        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs">
                          <span className="text-amber-300 font-medium flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5" /> Lock Code:
                          </span>
                          <span className="font-mono font-bold text-amber-200">
                            {extractedPasscode}
                          </span>
                        </div>
                      )}

                      {/* Est. Cost & Balance */}
                      <div className="p-2 rounded-lg bg-white/5 space-y-1 text-xs">
                        <div className="flex items-center justify-between text-gray-300">
                          <span>Est. Cost:</span>
                          <span className="font-bold text-white">LKR {estCost.toFixed(2)}</span>
                        </div>
                        {advPaid > 0 && (
                          <div className="flex items-center justify-between text-emerald-400">
                            <span>Advance Paid:</span>
                            <span>LKR {advPaid.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-rose-300 font-bold border-t border-white/10 pt-1">
                          <span>Balance Due:</span>
                          <span>LKR {balanceDue.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Technician Action Controls */}
                    <div className="pt-3 border-t border-white/10 space-y-2">
                      <Label className="text-[11px] text-gray-400 uppercase tracking-wider block">
                        Technician Quick Status:
                      </Label>

                      <div className="grid grid-cols-2 gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-[11px] border-white/15 bg-white/5 hover:bg-purple-600 hover:text-white"
                          onClick={() => handleUpdateStatus(job.id, 'Diagnostic')}
                        >
                          🔍 Diagnostic
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-[11px] border-white/15 bg-white/5 hover:bg-amber-600 hover:text-white"
                          onClick={() => handleUpdateStatus(job.id, 'In Progress')}
                        >
                          ⚙️ In Progress
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-[11px] border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-600 text-emerald-300 hover:text-white font-semibold"
                          onClick={() => handleUpdateStatus(job.id, 'Ready for Pickup')}
                        >
                          ✅ Ready Pickup
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-[11px] border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-600 text-cyan-300 hover:text-white font-bold"
                          onClick={() => loadJobIntoQuickBilling(job)}
                          title="Convert this repair directly into Final Sales Bill"
                        >
                          🧾 Final Bill <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>

                      {/* Secondary Actions: WhatsApp & Tech Bill */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <Button
                          size="sm"
                          className="h-9 text-xs bg-[#25d366] hover:bg-[#20ba59] text-black font-bold rounded-xl shadow-sm"
                          onClick={() => handleSendWhatsApp(job)}
                          title="Send Customer WhatsApp Notification"
                        >
                          <MessageCircle className="w-4 h-4 mr-1.5" /> WhatsApp
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 text-xs border-amber-500/50 bg-amber-500/15 hover:bg-amber-500 hover:text-black text-amber-300 font-bold rounded-xl shadow-sm transition-all"
                          onClick={() => handlePrintSlips(job, 'technician')}
                          title="Print Technician Job Sheet"
                        >
                          <Printer className="w-4 h-4 mr-1.5" /> Tech Bill 🖨️
                        </Button>
                      </div>

                      <div className="flex justify-end pt-0.5">
                        <button
                          type="button"
                          className="text-[11px] text-gray-400 hover:text-cyan-300 transition-colors flex items-center gap-1 cursor-pointer"
                          onClick={() => handlePrintSlips(job, 'customer')}
                        >
                          <FileText className="w-3 h-3" /> Print Customer Handover Slip
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {filteredJobs.length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-400 glass-effect rounded-2xl border border-white/10">
                <Wrench className="w-12 h-12 mx-auto mb-3 opacity-30 text-cyan-400" />
                <p className="text-lg font-semibold text-white">No repair jobs found</p>
                <p className="text-sm text-gray-400 mt-1">Try changing your search query or add a new device intake.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: NEW DEVICE INTAKE & HANDOVER RECEIPT             */}
      {/* ======================================================== */}
      {activeTab === 'intake' && (
        <Card className="glass-effect border-white/10 shadow-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl text-white flex items-center gap-2">
                  <Plus className="w-6 h-6 text-purple-400" />
                  New Mobile Device Intake Form
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Fill in customer & device details to register repair, sync live to universehub.store, and print customer handover receipt
                </CardDescription>
              </div>
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 px-3 py-1 text-xs">
                Prints Customer Receipt
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleIntakeSubmit} className="space-y-6">
              {/* Section 1: Customer Details */}
              <div className="space-y-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                  <User className="w-4 h-4" /> 1. Customer Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="custPhone">Phone Number *</Label>
                    <Input
                      id="custPhone"
                      placeholder="07X XXX XXXX"
                      value={intakeForm.customerPhone}
                      onChange={e => setIntakeForm({ ...intakeForm, customerPhone: e.target.value })}
                      className="bg-white/10 border-white/20 text-white mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="custName">Customer Name *</Label>
                    <div className="flex gap-2 mt-1">
                      <Select 
                        value={intakeForm.customerTitle} 
                        onValueChange={v => setIntakeForm({ ...intakeForm, customerTitle: v })}
                      >
                        <SelectTrigger className="w-[85px] bg-white/10 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Mr.">Mr.</SelectItem>
                          <SelectItem value="Mrs.">Mrs.</SelectItem>
                          <SelectItem value="Miss">Miss</SelectItem>
                          <SelectItem value="Dr.">Dr.</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        id="custName"
                        placeholder="Customer Name"
                        value={intakeForm.customerName}
                        onChange={e => setIntakeForm({ ...intakeForm, customerName: e.target.value })}
                        className="flex-1 bg-white/10 border-white/20 text-white"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="custEmail">Email (Optional)</Label>
                    <Input
                      id="custEmail"
                      type="email"
                      placeholder="customer@gmail.com"
                      value={intakeForm.customerEmail}
                      onChange={e => setIntakeForm({ ...intakeForm, customerEmail: e.target.value })}
                      className="bg-white/10 border-white/20 text-white mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Device Details */}
              <div className="space-y-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                <h3 className="text-sm font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                  <Smartphone className="w-4 h-4" /> 2. Device Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="deviceBrand">Brand</Label>
                    <Select 
                      value={intakeForm.deviceBrand} 
                      onValueChange={v => setIntakeForm({ ...intakeForm, deviceBrand: v })}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Apple">Apple</SelectItem>
                        <SelectItem value="Samsung">Samsung</SelectItem>
                        <SelectItem value="Xiaomi">Xiaomi / Redmi</SelectItem>
                        <SelectItem value="Google Pixel">Google Pixel</SelectItem>
                        <SelectItem value="OnePlus">OnePlus</SelectItem>
                        <SelectItem value="Huawei">Huawei / Honor</SelectItem>
                        <SelectItem value="Vivo">Vivo</SelectItem>
                        <SelectItem value="Oppo">Oppo</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="deviceModel">Model *</Label>
                    <Input
                      id="deviceModel"
                      placeholder="e.g. iPhone 13 Pro Max"
                      value={intakeForm.deviceModel}
                      onChange={e => setIntakeForm({ ...intakeForm, deviceModel: e.target.value })}
                      className="bg-white/10 border-white/20 text-white mt-1"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="deviceColor">Color</Label>
                    <Input
                      id="deviceColor"
                      placeholder="e.g. Sierra Blue / Black"
                      value={intakeForm.deviceColor}
                      onChange={e => setIntakeForm({ ...intakeForm, deviceColor: e.target.value })}
                      className="bg-white/10 border-white/20 text-white mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="passcode" className="text-amber-300 font-semibold">
                      Passcode / Pattern (For Testing)
                    </Label>
                    <Input
                      id="passcode"
                      placeholder="e.g. 1234 or 'L shape'"
                      value={intakeForm.passcode}
                      onChange={e => setIntakeForm({ ...intakeForm, passcode: e.target.value })}
                      className="bg-white/10 border-amber-500/30 text-white mt-1 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <Label htmlFor="imei">IMEI or Serial Number (Optional)</Label>
                    <Input
                      id="imei"
                      placeholder="e.g. 353504863248716"
                      value={intakeForm.imei}
                      onChange={e => setIntakeForm({ ...intakeForm, imei: e.target.value })}
                      className="bg-white/10 border-white/20 text-white mt-1 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="accessories">Accessories Left with Phone</Label>
                    <Input
                      id="accessories"
                      placeholder="e.g. Back Cover, Dialog SIM Card, Memory Card"
                      value={intakeForm.accessories}
                      onChange={e => setIntakeForm({ ...intakeForm, accessories: e.target.value })}
                      className="bg-white/10 border-white/20 text-white mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Fault & Defect Description */}
              <div className="space-y-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                <h3 className="text-sm font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
                  <Wrench className="w-4 h-4" /> 3. Defect & Work to be Done
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="issueType">Primary Issue Category</Label>
                    <Select 
                      value={intakeForm.issueType} 
                      onValueChange={v => setIntakeForm({ ...intakeForm, issueType: v })}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Screen Replacement">Screen / OLED Replacement</SelectItem>
                        <SelectItem value="Battery Replacement">Battery Replacement</SelectItem>
                        <SelectItem value="Back Glass Replacement">Back Glass / Housing Replacement</SelectItem>
                        <SelectItem value="Charging Port Repair">Charging Port / Not Charging</SelectItem>
                        <SelectItem value="Camera / Lens Repair">Camera / Lens Repair</SelectItem>
                        <SelectItem value="Water Damage Service">Water Damage Ultrasonic Service</SelectItem>
                        <SelectItem value="Motherboard / IC Repair">Motherboard / Chipset / IC Repair</SelectItem>
                        <SelectItem value="Speaker / Mic Issue">Speaker / Earpiece / Mic Issue</SelectItem>
                        <SelectItem value="Software / Bootloop">Software / Restore / Unlock</SelectItem>
                        <SelectItem value="Full Diagnostic">General Inspection & Diagnostic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="physicalCondition">Initial Device Physical Condition</Label>
                    <Input
                      id="physicalCondition"
                      placeholder="e.g. Back glass cracked, bezel minor dent, powers ON"
                      value={intakeForm.physicalCondition}
                      onChange={e => setIntakeForm({ ...intakeForm, physicalCondition: e.target.value })}
                      className="bg-white/10 border-white/20 text-white mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="issueDesc">Work to be Done & Defect Description ("ලෙඩේ සහ කළයුතු දේ")</Label>
                  <Input
                    id="issueDesc"
                    placeholder="e.g. Screen flickering after drop. Replace with 120Hz OLED, check FaceID & TrueTone calibration."
                    value={intakeForm.issueDescription}
                    onChange={e => setIntakeForm({ ...intakeForm, issueDescription: e.target.value })}
                    className="bg-white/10 border-white/20 text-white mt-1"
                  />
                </div>
              </div>

              {/* Section 4: Pricing & Expected Time */}
              <div className="space-y-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> 4. Pricing & Delivery Time
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="estCost">Estimated Total Cost (LKR)</Label>
                    <Input
                      id="estCost"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={intakeForm.estimatedCost}
                      onChange={e => setIntakeForm({ ...intakeForm, estimatedCost: e.target.value })}
                      className="bg-white/10 border-white/20 text-white mt-1 font-semibold"
                    />
                  </div>

                  <div>
                    <Label htmlFor="advPaid">Advance Payment (LKR)</Label>
                    <Input
                      id="advPaid"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={intakeForm.advancePaid}
                      onChange={e => setIntakeForm({ ...intakeForm, advancePaid: e.target.value })}
                      className="bg-white/10 border-white/20 text-white mt-1 font-semibold text-emerald-300"
                    />
                  </div>

                  <div>
                    <Label>Advance Payment Method</Label>
                    <Select 
                      value={intakeForm.advancePaymentMethod} 
                      onValueChange={v => setIntakeForm({ ...intakeForm, advancePaymentMethod: v })}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="transfer">Bank Transfer</SelectItem>
                        <SelectItem value="koko">Koko</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="expectedDate">Target Ready Time</Label>
                    <Input
                      id="expectedDate"
                      placeholder="e.g. Today 6:00 PM or 12/11"
                      value={intakeForm.expectedDate}
                      onChange={e => setIntakeForm({ ...intakeForm, expectedDate: e.target.value })}
                      className="bg-white/10 border-white/20 text-white mt-1"
                    />
                  </div>
                </div>

                {/* Balance Preview */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 text-sm mt-2">
                  <span className="text-gray-300">Calculated Balance Due on Pickup:</span>
                  <span className="font-bold text-lg text-rose-400">
                    LKR {(Math.max(0, (parseFloat(intakeForm.estimatedCost) || 0) - (parseFloat(intakeForm.advancePaid) || 0))).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={isSubmittingIntake}
                  className="flex-1 py-6 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-base shadow-xl"
                >
                  <Printer className="w-5 h-5 mr-2" />
                  {isSubmittingIntake ? 'Registering & Printing...' : 'Register Device & Print Customer Receipt'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ======================================================== */}
      {/* TAB 3: QUICK / FINAL REPAIR BILLING                     */}
      {/* ======================================================== */}
      {activeTab === 'direct' && (
        <div className="space-y-4">
          {/* Top Bar: Load from Repair Job / Tracking Code */}
          <Card className="glass-effect border-cyan-500/30 bg-gradient-to-r from-blue-900/20 to-purple-900/20 shadow-xl">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    <Search className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-white text-base">Load Repair Job by Tracking Code</h3>
                    <p className="text-xs text-gray-300">
                      Enter tracking code from customer slip (e.g. UH-5130) to load device, deduct advance & print final bill
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Input
                    placeholder="Enter Tracking # (e.g. UH-5130)"
                    value={trackingLookup}
                    onChange={e => setTrackingLookup(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleLookupRepairJob(trackingLookup); }}
                    className="w-full md:w-64 bg-white/10 border-white/20 text-white font-mono uppercase"
                  />
                  <Button
                    onClick={() => handleLookupRepairJob(trackingLookup)}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold px-4 shrink-0 shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Load Bill
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Billing Form & Cart Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="glass-effect border-white/10 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl text-white flex items-center justify-between">
                    <span>Add Item / Service to Bill</span>
                    {activeLinkedJob && (
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs">
                        Linked: #{activeLinkedJob.ticket_number}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={addRepairToCart} className="space-y-4">
                    <div>
                      <Label htmlFor="repairName">Repair / Part Name</Label>
                      <Input 
                        id="repairName" 
                        value={directRepairForm.name} 
                        onChange={e => setDirectRepairForm({...directRepairForm, name: e.target.value})} 
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
                          value={directRepairForm.sellingPrice} 
                          onChange={e => setDirectRepairForm({...directRepairForm, sellingPrice: e.target.value})} 
                          placeholder="0.00" 
                          className="bg-white/10 border-white/20 text-white font-semibold"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="repairWarranty">Warranty (Months)</Label>
                        <Input 
                          id="repairWarranty" 
                          type="number"
                          value={directRepairForm.warrantyPeriod} 
                          onChange={e => setDirectRepairForm({...directRepairForm, warrantyPeriod: e.target.value})} 
                          placeholder="e.g. 3" 
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="repairDiscount">Discount / Advance (LKR)</Label>
                        <Input 
                          id="repairDiscount" 
                          type="number"
                          step="0.01"
                          value={directRepairForm.discount} 
                          onChange={e => setDirectRepairForm({...directRepairForm, discount: e.target.value})} 
                          placeholder="0.00" 
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="repairCost">c (LKR Cost)</Label>
                        <Input 
                          id="repairCost" 
                          type="number"
                          step="0.01"
                          value={directRepairForm.costPrice} 
                          onChange={e => setDirectRepairForm({...directRepairForm, costPrice: e.target.value})} 
                          placeholder="0.00" 
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full mt-2"><Plus className="w-4 h-4 mr-2" /> Add Item to Cart</Button>
                  </form>
                </CardContent>
              </Card>

              {/* Cart Table */}
              <Card className="glass-effect border-white/10 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl text-white flex items-center justify-between">
                    <span>Items for Final Billing ({cart.length})</span>
                    {cart.length > 0 && (
                      <span className="text-sm font-normal text-cyan-300">
                        Net Total: LKR {grandTotal.toFixed(2)}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[5%]">#</TableHead>
                        <TableHead>Service / Item</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Advance/Dis.</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cart.map((item, index) => (
                        <TableRow key={item.uniqueCartId}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>
                            <div className="font-semibold text-white">{item.name}</div>
                            {item.warrantyPeriod > 0 && (
                              <div className="text-xs text-cyan-400 mt-0.5">
                                {item.warrantyPeriod} Month{item.warrantyPeriod > 1 ? 's' : ''} Warranty
                              </div>
                            )}
                            {item.advancePaid > 0 && (
                              <div className="text-xs text-emerald-400 mt-0.5">
                                Advance Credited: LKR {item.advancePaid.toFixed(2)}
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
                              className="w-20 bg-white/10 border-white/20 text-right text-xs"
                              placeholder="0.00"
                            />
                          </TableCell>
                          <TableCell className="font-bold text-white">
                            LKR {((item.sellingPrice - (parseFloat(item.discount) || 0)) * item.quantity).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="destructive" onClick={() => updateQuantity(item.uniqueCartId, 0)}><Trash2 className="w-4 h-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {cart.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-gray-400 py-8">
                            Cart is empty. Use the search bar above to load by tracking number (e.g. UH-5130) or add manually.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Payment & Print Section */}
            <div className="space-y-6">
              <Card className="glass-effect border-white/10 shadow-xl">
                <CardHeader><CardTitle className="text-xl text-white">Customer & Payment</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="directCustomer">Customer Name</Label>
                    <div className="flex gap-2 mt-1">
                      <Select value={directCustomerTitle} onValueChange={setDirectCustomerTitle}>
                        <SelectTrigger className="w-[85px] bg-white/10 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Mr.">Mr.</SelectItem>
                          <SelectItem value="Mrs.">Mrs.</SelectItem>
                          <SelectItem value="Miss">Miss</SelectItem>
                          <SelectItem value="Dr.">Dr.</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input 
                        id="directCustomer" 
                        className="flex-1 bg-white/10 border-white/20 text-white font-medium" 
                        value={directCustomerName} 
                        onChange={(e) => setDirectCustomerName(e.target.value)} 
                        placeholder="Customer Name" 
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="directCustomerPhone">Customer Phone</Label>
                    <Input 
                      id="directCustomerPhone" 
                      value={directCustomerPhone} 
                      onChange={(e) => setDirectCustomerPhone(e.target.value)} 
                      placeholder="07X XXX XXXX" 
                      className="bg-white/10 border-white/20 text-white mt-1" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="directCustomerEmail">Customer Email (Optional)</Label>
                    <Input 
                      id="directCustomerEmail" 
                      type="email" 
                      value={directCustomerEmail} 
                      onChange={(e) => setDirectCustomerEmail(e.target.value)} 
                      placeholder="customer@gmail.com" 
                      className="bg-white/10 border-white/20 text-white mt-1" 
                    />
                  </div>

                  <div className="pt-2 border-t border-white/10">
                    <Label className="text-xs uppercase tracking-wider text-gray-400 font-bold">Payments (LKR)</Label>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div>
                        <Label className="text-xs text-gray-400">Cash</Label>
                        <Input type="number" min="0" value={paymentCash} onChange={(e) => setPaymentCash(e.target.value)} className="bg-white/10 border-white/20 text-white font-semibold" />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-400">Card</Label>
                        <Input type="number" min="0" value={paymentCard} onChange={(e) => setPaymentCard(e.target.value)} className="bg-white/10 border-white/20 text-white font-semibold" />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-400">Transfer</Label>
                        <Input type="number" min="0" value={paymentTransfer} onChange={(e) => setPaymentTransfer(e.target.value)} className="bg-white/10 border-white/20 text-white font-semibold" />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-400">Koko</Label>
                        <Input type="number" min="0" value={paymentKoko} onChange={(e) => setPaymentKoko(e.target.value)} className="bg-white/10 border-white/20 text-white font-semibold" />
                      </div>
                    </div>
                  </div>

                  {/* Order Summary & Final Print Buttons */}
                  <div className="border-t border-white/10 pt-4 space-y-3">
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between text-gray-300">
                        <span>Total Service Value:</span>
                        <span>LKR {subtotal.toFixed(2)}</span>
                      </div>
                      {totalDiscount > 0 && (
                        <div className="flex justify-between text-emerald-400">
                          <span>Advance / Discount:</span>
                          <span>- LKR {totalDiscount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-white font-bold text-lg border-t border-white/10 pt-2">
                        <span>Balance Payable:</span>
                        <span className="text-cyan-300">LKR {grandTotal.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <Button 
                        onClick={() => processDirectSale('thermal')} 
                        className="w-full py-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-sm shadow-lg"
                        disabled={cart.length === 0 || isProcessingDirect}
                      >
                        <Receipt className="w-4 h-4 mr-1.5" />
                        {isProcessingDirect ? 'Processing...' : 'Thermal Bill'}
                      </Button>

                      <Button 
                        onClick={() => processDirectSale('epson')} 
                        className="w-full py-5 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg"
                        disabled={cart.length === 0 || isProcessingDirect}
                      >
                        <Printer className="w-4 h-4 mr-1.5" />
                        {isProcessingDirect ? 'Processing...' : 'Warranty (EPSON)'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: SETTLE BALANCE & DELIVER COMPLETED PHONE          */}
      {/* ======================================================== */}
      {settlingJob && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="glass-effect border-white/20 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                Complete Repair & Deliver Device
              </CardTitle>
              <CardDescription className="text-gray-300">
                Mark job #{settlingJob.ticket_number} as Completed or convert to Final Bill
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Customer:</span>
                  <span className="text-white font-semibold">{settlingJob.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Device:</span>
                  <span className="text-white font-semibold">{settlingJob.device_brand} {settlingJob.device_model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Est. Total:</span>
                  <span className="text-white font-semibold">LKR {(parseFloat(settlingJob.estimated_cost) || 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Button 
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-5 rounded-xl shadow-md"
                  onClick={() => {
                    const j = settlingJob;
                    setSettlingJob(null);
                    loadJobIntoQuickBilling(j);
                  }}
                >
                  <Receipt className="w-4 h-4 mr-2" /> Load to Final Billing Checkout
                </Button>

                <div className="flex gap-2 pt-1">
                  <Button 
                    variant="outline" 
                    className="flex-1 border-white/20 text-white"
                    onClick={() => setSettlingJob(null)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1 border-emerald-500/40 text-emerald-300 hover:bg-emerald-600 hover:text-white"
                    onClick={handleConfirmSettle}
                    disabled={isProcessingSettle}
                  >
                    {isProcessingSettle ? 'Saving...' : 'Mark Completed Only'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
