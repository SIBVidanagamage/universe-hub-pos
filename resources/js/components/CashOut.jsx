import React, { useState } from 'react';
import { ArrowUpCircle, Save, WalletCards } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

export function CashOut() {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ amount: '', reason: '', notes: '' });
  const [lastEntry, setLastEntry] = useState(null);

  const submitCashOut = async (event) => {
    event.preventDefault();
    const amount = parseFloat(form.amount);

    if (!amount || amount <= 0) {
      toast({ title: 'Invalid Amount', description: 'Enter a cash out amount greater than 0.', variant: 'destructive' });
      return;
    }

    if (!form.reason.trim()) {
      toast({ title: 'Reason Required', description: 'Add the reason for this cash out.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        type: 'cash_out',
        amount,
        reason: form.reason.trim(),
        notes: form.notes.trim() || null,
        user_id: user?.id,
      };
      const { data: entry, error } = await supabase.from('cash_transactions').insert([payload]).select().single();
      if (error) throw error;
      
      setLastEntry(entry);
      setForm({ amount: '', reason: '', notes: '' });
      toast({ title: 'Cash Out Saved', description: 'The cash out entry is now available to admin accounts.' });
    } catch (error) {
      toast({ title: 'Save Failed', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Cash Out</h1>
        <p className="text-gray-400 mt-1">Record money taken from the shop drawer for admin review.</p>
      </div>

      <Card className="glass-effect border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <ArrowUpCircle className="h-5 w-5 text-red-300" />
            New Cash Out Entry
          </CardTitle>
          <CardDescription>Cashier entries are saved to the admin account ledger.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitCashOut} className="space-y-4">
            <div>
              <Label htmlFor="cash-out-user">Entered By</Label>
              <Input
                id="cash-out-user"
                value={`${user?.name || 'User'} (${user?.role || 'staff'})`}
                readOnly
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <Label htmlFor="cash-out-amount">Amount</Label>
              <Input
                id="cash-out-amount"
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                placeholder="0.00"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <Label htmlFor="cash-out-reason">Reason <span className="text-red-300">*</span></Label>
              <Input
                id="cash-out-reason"
                value={form.reason}
                onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
                placeholder="Example: Supplier payment"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <Label htmlFor="cash-out-notes">Notes</Label>
              <textarea
                id="cash-out-notes"
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Optional details"
                className="min-h-28 w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>
            <Button type="submit" disabled={saving} className="w-full bg-red-600 hover:bg-red-700">
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Cash Out'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {lastEntry && (
        <Card className="glass-effect border-white/10">
          <CardContent className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <WalletCards className="h-6 w-6 text-red-300" />
              <div>
                <p className="font-medium text-white">Last cash out saved</p>
                <p className="text-sm text-gray-400">{lastEntry.reason}</p>
              </div>
            </div>
            <p className="text-xl font-bold text-red-200">LKR {parseFloat(lastEntry.amount || 0).toFixed(2)}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
