import React, { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ArrowDownCircle, ArrowUpCircle, Calculator, Filter, Printer, RefreshCw, WalletCards } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';

const apiRequest = async (url, token, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.message || Object.values(errorData.errors || {})?.[0]?.[0] || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return response.json();
};

const today = format(new Date(), 'yyyy-MM-dd');
const thisMonth = format(new Date(), 'yyyy-MM');
const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

export function AccountManagement() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ cash_in: 0, cash_out: 0, net_cash: 0, transactions_count: 0 });
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('daily');
  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(thisMonth);
  const [typeFilter, setTypeFilter] = useState('all');
  const [form, setForm] = useState({ type: 'cash_in', amount: '', reason: '', notes: '' });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (period === 'daily') params.set('date', date);
    if (period === 'monthly') params.set('month', month);
    if (typeFilter !== 'all') params.set('type', typeFilter);
    return params.toString();
  }, [period, date, month, typeFilter]);

  const fetchTransactions = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiRequest(`/api/v1/cash-transactions?${queryString}`, token);
      setTransactions(data.transactions || []);
      setSummary(data.summary || { cash_in: 0, cash_out: 0, net_cash: 0, transactions_count: 0 });
    } catch (error) {
      toast({ title: 'Account Data Failed', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [token, queryString]);

  const submitTransaction = async () => {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) {
      toast({ title: 'Invalid Amount', description: 'Enter a cash amount greater than 0.', variant: 'destructive' });
      return;
    }

    if (form.type === 'cash_out' && !form.reason.trim()) {
      toast({ title: 'Reason Required', description: 'Cash out must have a reason.', variant: 'destructive' });
      return;
    }

    try {
      await apiRequest('/api/v1/cash-transactions', token, {
        method: 'POST',
        body: JSON.stringify({
          type: form.type,
          amount,
          reason: form.reason.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });
      setForm({ type: 'cash_in', amount: '', reason: '', notes: '' });
      await fetchTransactions();
      toast({ title: 'Cash Entry Saved', description: `${form.type === 'cash_in' ? 'Cash in' : 'Cash out'} recorded.` });
    } catch (error) {
      toast({ title: 'Save Failed', description: error.message, variant: 'destructive' });
    }
  };

  const printLedger = () => {
    const periodLabel = period === 'daily' ? `Daily: ${date}` : period === 'monthly' ? `Monthly: ${month}` : 'All Time';
    const typeLabel = typeFilter === 'cash_in' ? 'Cash In' : typeFilter === 'cash_out' ? 'Cash Out' : 'All Types';
    const rows = transactions.map((transaction) => `
      <tr>
        <td>${escapeHtml(format(parseISO(transaction.created_at), 'MMM d, yyyy h:mm a'))}</td>
        <td>${escapeHtml(transaction.type === 'cash_in' ? 'Cash In' : 'Cash Out')}</td>
        <td class="amount">LKR ${escapeHtml(parseFloat(transaction.amount || 0).toFixed(2))}</td>
        <td>${escapeHtml(transaction.reason || '-')}</td>
        <td>${escapeHtml(transaction.notes || '-')}</td>
        <td>${escapeHtml(transaction.user?.name || 'System')}</td>
      </tr>
    `).join('');

    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) {
      toast({ title: 'Print Blocked', description: 'Allow popups for this site and try again.', variant: 'destructive' });
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Cash Ledger</title>
          <style>
            body { color: #111827; font-family: Arial, sans-serif; margin: 28px; }
            h1 { font-size: 24px; margin: 0 0 4px; }
            .meta { color: #4b5563; font-size: 13px; margin-bottom: 18px; }
            .summary { display: grid; gap: 10px; grid-template-columns: repeat(4, 1fr); margin-bottom: 18px; }
            .summary div { border: 1px solid #d1d5db; border-radius: 6px; padding: 10px; }
            .summary span { color: #6b7280; display: block; font-size: 12px; margin-bottom: 5px; }
            .summary strong { font-size: 16px; }
            table { border-collapse: collapse; font-size: 12px; width: 100%; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; vertical-align: top; }
            th { background: #f3f4f6; }
            .amount { text-align: right; white-space: nowrap; }
            @media print { body { margin: 16px; } }
          </style>
        </head>
        <body>
          <h1>UNIVERSE HUB Cash Ledger</h1>
          <div class="meta">${escapeHtml(periodLabel)} | ${escapeHtml(typeLabel)} | Printed ${escapeHtml(format(new Date(), 'MMM d, yyyy h:mm a'))}</div>
          <div class="summary">
            <div><span>Cash In</span><strong>LKR ${escapeHtml(parseFloat(summary.cash_in || 0).toFixed(2))}</strong></div>
            <div><span>Cash Out</span><strong>LKR ${escapeHtml(parseFloat(summary.cash_out || 0).toFixed(2))}</strong></div>
            <div><span>Net Cash</span><strong>LKR ${escapeHtml(parseFloat(summary.net_cash || 0).toFixed(2))}</strong></div>
            <div><span>Entries</span><strong>${escapeHtml(summary.transactions_count || 0)}</strong></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th class="amount">Amount</th>
                <th>Reason</th>
                <th>Notes</th>
                <th>Entered By</th>
              </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="6">No cash entries found for this filter.</td></tr>'}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const stats = [
    { title: 'Cash In', value: summary.cash_in, icon: ArrowDownCircle, color: 'text-green-300' },
    { title: 'Cash Out', value: summary.cash_out, icon: ArrowUpCircle, color: 'text-red-300' },
    { title: 'Net Cash', value: summary.net_cash, icon: Calculator, color: summary.net_cash >= 0 ? 'text-blue-300' : 'text-red-300' },
    { title: 'Entries', value: summary.transactions_count, icon: WalletCards, color: 'text-yellow-300', count: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Account Management</h1>
          <p className="text-gray-400 mt-1">Track daily cash in, cash out, reasons, and register balance.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={printLedger}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={fetchTransactions}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="glass-effect border-white/10">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-400">{stat.title}</p>
                  <p className={`mt-1 text-2xl font-bold ${stat.color}`}>
                    {stat.count ? stat.value : `LKR ${parseFloat(stat.value || 0).toFixed(2)}`}
                  </p>
                </div>
                <stat.icon className={`w-7 h-7 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="glass-effect border-white/10">
          <CardHeader>
            <CardTitle className="text-white">New Cash Entry</CardTitle>
            <CardDescription>Use cash out for expenses, withdrawals, or drawer removals.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={form.type === 'cash_in' ? 'default' : 'outline'}
                  className={form.type === 'cash_in'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'border-white/20 text-green-200 hover:bg-green-500/10'}
                  onClick={() => setForm((current) => ({ ...current, type: 'cash_in' }))}
                >
                  <ArrowDownCircle className="w-4 h-4 mr-2" />
                  Cash In
                </Button>
                <Button
                  type="button"
                  variant={form.type === 'cash_out' ? 'default' : 'outline'}
                  className={form.type === 'cash_out'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'border-white/20 text-red-200 hover:bg-red-500/10'}
                  onClick={() => setForm((current) => ({ ...current, type: 'cash_out' }))}
                >
                  <ArrowUpCircle className="w-4 h-4 mr-2" />
                  Cash Out
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((current) => ({ ...current, amount: e.target.value }))}
                placeholder="0.00"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <Label htmlFor="reason">Reason {form.type === 'cash_out' && <span className="text-red-300">*</span>}</Label>
              <Input
                id="reason"
                value={form.reason}
                onChange={(e) => setForm((current) => ({ ...current, reason: e.target.value }))}
                placeholder={form.type === 'cash_out' ? 'Example: Supplier payment' : 'Example: Opening cash'}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
                placeholder="Optional details"
                className="min-h-24 w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>
            <Button onClick={submitTransaction} className="w-full">
              Save Cash Entry
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-effect border-white/10 xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Filter className="w-5 h-5 text-blue-300" />
              Cash Ledger
            </CardTitle>
            <CardDescription>Filter by day, month, and cash movement type.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[160px] bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
              {period === 'daily' && (
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-[170px] bg-white/10 border-white/20 text-white" />
              )}
              {period === 'monthly' && (
                <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-[170px] bg-white/10 border-white/20 text-white" />
              )}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px] bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="cash_in">Cash In</SelectItem>
                  <SelectItem value="cash_out">Cash Out</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <p className="text-gray-400 text-center py-8">Loading cash entries...</p>
            ) : transactions.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No cash entries found for this filter.</p>
            ) : (
              <div className="overflow-x-auto max-h-[520px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Entered By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id} className="border-white/10">
                        <TableCell className="text-gray-300">{format(parseISO(transaction.created_at), 'MMM d, yyyy h:mm a')}</TableCell>
                        <TableCell>
                          <Badge className={transaction.type === 'cash_in' ? 'bg-green-500/20 text-green-200 border-green-400/30' : 'bg-red-500/20 text-red-200 border-red-400/30'}>
                            {transaction.type === 'cash_in' ? 'Cash In' : 'Cash Out'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-white">LKR {parseFloat(transaction.amount).toFixed(2)}</TableCell>
                        <TableCell className="text-gray-300">{transaction.reason || '-'}</TableCell>
                        <TableCell className="max-w-[260px] text-gray-400">{transaction.notes || '-'}</TableCell>
                        <TableCell className="text-gray-300">{transaction.user?.name || 'System'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
