import React, { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Search, ShieldCheck, ClipboardList, RefreshCw, PackageCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useInventory } from '@/hooks/useInventory';
import { useSales } from '@/hooks/useSales';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

const statusStyles = {
  open: 'bg-blue-500/20 text-blue-200 border-blue-400/30',
  in_progress: 'bg-yellow-500/20 text-yellow-200 border-yellow-400/30',
  resolved: 'bg-green-500/20 text-green-200 border-green-400/30',
  rejected: 'bg-red-500/20 text-red-200 border-red-400/30',
};

const formatDate = (value) => (value ? format(parseISO(value), 'MMM d, yyyy') : 'N/A');

export function WarrantyClaims() {
  const { token, user } = useAuth();
  const { sales } = useSales();
  const { inventory, refreshInventory } = useInventory();
  const { toast } = useToast();
  const [claims, setClaims] = useState([]);
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [selectedSaleItemId, setSelectedSaleItemId] = useState('');
  const [claimedItemCode, setClaimedItemCode] = useState('');
  const [replacementProductId, setReplacementProductId] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [claimUpdates, setClaimUpdates] = useState({});

  const fetchClaims = async () => {
    if (!token) return;
    setLoadingClaims(true);
    try {
      const { data, error } = await supabase
        .from('warranty_claims')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setClaims(data);
    } catch (error) {
      toast({ title: 'Warranty Claims Failed', description: error.message, variant: 'destructive' });
    } finally {
      setLoadingClaims(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, [token]);

  const filteredSales = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return sales.slice(0, 12);

    return sales.filter((sale) => {
      const invoiceMatch = sale.id?.toString().includes(term);
      const nameMatch = sale.customer_name?.toLowerCase().includes(term);
      const emailMatch = sale.customer_email?.toLowerCase().includes(term);
      const phoneMatch = sale.customer_phone?.toLowerCase().includes(term);
      const unitCodeMatch = sale.items?.some((item) =>
        item.sold_item_codes?.some((code) => code.toLowerCase().includes(term))
      );
      return invoiceMatch || nameMatch || emailMatch || phoneMatch || unitCodeMatch;
    });
  }, [sales, searchTerm]);

  const selectedSale = useMemo(
    () => sales.find((sale) => sale.id?.toString() === selectedSaleId),
    [sales, selectedSaleId]
  );

  const coveredItems = useMemo(() => {
    if (!selectedSale?.items) return [];

    return selectedSale.items.filter((item) => {
      if (!item.warranty_months || !item.warranty_expires_at) return false;
      return new Date(item.warranty_expires_at) >= new Date(new Date().toDateString());
    });
  }, [selectedSale]);

  const selectedSaleItem = useMemo(
    () => coveredItems.find((item) => item.id?.toString() === selectedSaleItemId),
    [coveredItems, selectedSaleItemId]
  );

  const availableReplacementProducts = useMemo(
    () => inventory.filter((product) => product.quantity > 0),
    [inventory]
  );

  const submitClaim = async () => {
    if (!selectedSaleItemId || !issueDescription.trim()) {
      toast({ title: 'Missing Claim Details', description: 'Select a warranty item and enter the issue.', variant: 'destructive' });
      return;
    }

    if (selectedSaleItem?.sold_item_codes?.length && !claimedItemCode) {
      toast({ title: 'Unit Code Required', description: 'Select the exact unit barcode/serial from the invoice.', variant: 'destructive' });
      return;
    }

    if (!replacementProductId) {
      toast({ title: 'Replacement Required', description: 'Select the product issued as the warranty replacement.', variant: 'destructive' });
      return;
    }

    try {
      const newClaim = {
        sale_item_id: selectedSaleItemId,
        claimed_item_code: claimedItemCode || null,
        replacement_product_id: replacementProductId,
        issue_description: issueDescription,
        status: 'open',
        claim_number: 'CLM-' + Date.now(), // Generate a claim number locally
      };
      const { data, error } = await supabase.from('warranty_claims').insert([newClaim]).select().single();
      if (error) throw error;
      const claim = data;

      setClaims((current) => [claim, ...current]);
      setIssueDescription('');
      setSelectedSaleItemId('');
      setClaimedItemCode('');
      setReplacementProductId('');
      await refreshInventory();
      toast({ title: 'Warranty Claim Created', description: `Claim ${claim.claim_number} is now open.` });
    } catch (error) {
      toast({ title: 'Claim Failed', description: error.message, variant: 'destructive' });
    }
  };

  const updateClaim = async (claim) => {
    const update = claimUpdates[claim.id] || {};
    const status = update.status || claim.status;

    try {
      const updateData = {
        status,
        resolution_notes: update.resolution_notes ?? claim.resolution_notes ?? '',
      };
      const { data: updatedClaim, error } = await supabase.from('warranty_claims').update(updateData).eq('id', claim.id).select().single();
      if (error) throw error;

      setClaims((current) => current.map((item) => (item.id === claim.id ? updatedClaim : item)));
      if (updatedClaim.replacement_stock_deducted_at) {
        await refreshInventory();
      }
      toast({ title: 'Claim Updated', description: `${updatedClaim.claim_number} marked ${status.replace('_', ' ')}.` });
    } catch (error) {
      toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
    }
  };

  const returnClaimToStock = async (claim) => {
    try {
      const updateData = {
        returned_stock_added_at: new Date().toISOString()
      };
      const { data: updatedClaim, error } = await supabase.from('warranty_claims').update(updateData).eq('id', claim.id).select().single();
      if (error) throw error;

      setClaims((current) => current.map((item) => (item.id === claim.id ? updatedClaim : item)));
      await refreshInventory();
      toast({ title: 'Stock Updated', description: `${claim.sale_item?.saleable?.name || 'Returned item'} added back to stock.` });
    } catch (error) {
      toast({ title: 'Return Failed', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Warranty Claims</h1>
          <p className="text-gray-400 mt-1">Find invoices, verify coverage, and manage customer warranty issues</p>
        </div>
        <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={fetchClaims}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="glass-effect border-white/10 xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Search className="w-5 h-5 text-blue-400" />
              Find Customer Sale
            </CardTitle>
            <CardDescription>Search invoice number, customer name, email, or phone.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Invoice, email, phone..."
              className="bg-white/10 border-white/20 text-white"
            />
            <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
              {filteredSales.map((sale) => (
                <button
                  key={sale.id}
                  type="button"
                  onClick={() => {
                    setSelectedSaleId(sale.id.toString());
                    setSelectedSaleItemId('');
                    setClaimedItemCode('');
                    setReplacementProductId('');
                  }}
                  className={`w-full rounded-md border p-3 text-left transition ${
                    selectedSaleId === sale.id.toString()
                      ? 'border-blue-400 bg-blue-500/15'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-white">Invoice #{sale.id}</p>
                    <span className="text-xs text-gray-400">{formatDate(sale.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-300">{sale.customer_name}</p>
                  <p className="text-xs text-gray-400">{sale.customer_email || sale.customer_phone || 'No contact saved'}</p>
                  {sale.items?.some((item) => item.sold_item_codes?.length) && (
                    <p className="mt-1 text-xs text-blue-200">
                      Units: {sale.items.flatMap((item) => item.sold_item_codes || []).join(', ')}
                    </p>
                  )}
                </button>
              ))}
              {filteredSales.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No matching sales found.</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect border-white/10 xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <ShieldCheck className="w-5 h-5 text-green-400" />
              New Warranty Claim
            </CardTitle>
            <CardDescription>Select a covered product from the customer invoice.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedSale ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-md border border-white/10 bg-white/5 p-4 text-sm">
                  <div>
                    <p className="text-gray-400">Customer</p>
                    <p className="text-white font-medium">{selectedSale.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Contact</p>
                    <p className="text-white font-medium">{selectedSale.customer_email || selectedSale.customer_phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Invoice Total</p>
                    <p className="text-white font-medium">LKR {parseFloat(selectedSale.total).toFixed(2)}</p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="warrantyItem">Warranty Item</Label>
                  <Select
                    value={selectedSaleItemId}
                    onValueChange={(value) => {
                      setSelectedSaleItemId(value);
                      setClaimedItemCode('');
                    }}
                  >
                    <SelectTrigger id="warrantyItem" className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Select covered item" />
                    </SelectTrigger>
                    <SelectContent>
                      {coveredItems.map((item) => (
                        <SelectItem key={item.id} value={item.id.toString()}>
                          {item.saleable?.name || 'Item'} - warranty until {formatDate(item.warranty_expires_at)}
                          {item.sold_item_codes?.length ? ` - ${item.sold_item_codes.join(', ')}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {coveredItems.length === 0 && <p className="text-sm text-yellow-300 mt-2">This invoice has no active warranty items.</p>}
                </div>

                {selectedSaleItem?.sold_item_codes?.length > 0 && (
                  <div>
                    <Label htmlFor="claimedItemCode">Claimed Unit Barcode / Serial</Label>
                    <Select value={claimedItemCode} onValueChange={setClaimedItemCode}>
                      <SelectTrigger id="claimedItemCode" className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Select exact unit code" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedSaleItem.sold_item_codes.map((code) => (
                          <SelectItem key={code} value={code}>{code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label htmlFor="replacementProduct">Replacement Product Issued</Label>
                  <Select value={replacementProductId} onValueChange={setReplacementProductId}>
                    <SelectTrigger id="replacementProduct" className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Select product to issue from stock" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableReplacementProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.name} - {product.quantity} in stock
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availableReplacementProducts.length === 0 && (
                    <p className="text-sm text-yellow-300 mt-2">No replacement stock available.</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="issueDescription">Customer Issue</Label>
                  <textarea
                    id="issueDescription"
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    placeholder="Example: Charging port not working after 2 weeks..."
                    className="min-h-28 w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                </div>

                <Button
                  onClick={submitClaim}
                  disabled={!selectedSaleItemId || !replacementProductId || !issueDescription.trim() || (selectedSaleItem?.sold_item_codes?.length > 0 && !claimedItemCode)}
                >
                  <ClipboardList className="w-4 h-4 mr-2" />
                  Create Claim
                </Button>
              </>
            ) : (
              <p className="text-gray-400 text-center py-12">Select a sale to start a warranty claim.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-effect border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Claim History</CardTitle>
          <CardDescription>Track open, in-progress, resolved, and rejected warranty claims.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingClaims ? (
            <p className="text-gray-400 text-center py-4">Loading warranty claims...</p>
          ) : claims.length === 0 ? (
            <p className="text-gray-400 text-center py-4">No warranty claims created yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Claim</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Resolution</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.map((claim) => (
                    <TableRow key={claim.id} className="border-white/10">
                      <TableCell>
                        <p className="font-medium text-white">{claim.claim_number}</p>
                        <p className="text-xs text-gray-400">Invoice #{claim.sale_id}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-white">{claim.customer?.name || claim.sale?.customer_name}</p>
                        <p className="text-xs text-gray-400">{claim.customer?.email || claim.sale?.customer_email}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-white">{claim.sale_item?.saleable?.name || 'Item'}</p>
                        <p className="text-xs text-gray-400">Until {formatDate(claim.sale_item?.warranty_expires_at)}</p>
                        {claim.claimed_item_code && (
                          <p className="text-xs text-blue-200">Unit: {claim.claimed_item_code}</p>
                        )}
                        {claim.replacement_stock_deducted_at && (
                          <p className="text-xs text-green-300">Replacement stock deducted</p>
                        )}
                        {claim.returned_stock_added_at && (
                          <p className="text-xs text-green-300">Returned item added back to stock</p>
                        )}
                        {claim.replacement_product && (
                          <p className="text-xs text-yellow-200">Replacement: {claim.replacement_product.name}</p>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[240px] text-gray-300">{claim.issue_description}</TableCell>
                      <TableCell>
                        <Badge className={statusStyles[claim.status] || statusStyles.open}>{claim.status.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={claimUpdates[claim.id]?.resolution_notes ?? claim.resolution_notes ?? ''}
                          onChange={(e) => setClaimUpdates((current) => ({
                            ...current,
                            [claim.id]: { ...current[claim.id], resolution_notes: e.target.value },
                          }))}
                          placeholder="Resolution notes"
                          className="min-w-[220px] bg-white/10 border-white/20 text-white"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select
                            value={claimUpdates[claim.id]?.status || claim.status}
                            onValueChange={(value) => setClaimUpdates((current) => ({
                              ...current,
                              [claim.id]: { ...current[claim.id], status: value },
                            }))}
                          >
                            <SelectTrigger className="w-[140px] bg-white/10 border-white/20 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="sm" onClick={() => updateClaim(claim)}>Save</Button>
                          {user?.role === 'admin' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-green-400/40 text-green-200 hover:bg-green-500/10"
                              disabled={!!claim.returned_stock_added_at}
                              onClick={() => returnClaimToStock(claim)}
                            >
                              <PackageCheck className="w-4 h-4 mr-1" />
                              Stock In
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
