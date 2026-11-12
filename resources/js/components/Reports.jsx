import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useSales } from '@/hooks/useSales';
import { format, isToday, isThisMonth, parseISO, isSameDay, isSameMonth, isSameYear } from 'date-fns';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Calendar,
  Download,
  Activity,
  Filter,
  RefreshCw,
  Eye,
  Trash2,
  AlertTriangle,
  Search,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Wrench,
  ShoppingBag
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// A new component to render the receipt details in the popup
const ReceiptView = ({ sale }) => {
  if (!sale) return null;

  return (
    <div className="text-sm text-gray-300">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
        <p><strong>Invoice #:</strong> {sale.id}</p>
        <p className="text-right"><strong>Date:</strong> {format(parseISO(sale.created_at), 'PPpp')}</p>
        <p><strong>Customer:</strong> {sale.customer_name}</p>
        {/* FIX: Added optional chaining to prevent crash if user is null */}
        <p className="text-right"><strong>Cashier:</strong> {sale.user?.name || 'N/A'}</p>
      </div>
      <div className="border-t border-white/10 pt-4">
        <h4 className="font-bold mb-2 text-white">Items Sold</h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Discount</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* FIX: Added optional chaining to prevent crash if items array is missing */}
            {sale.items?.map(item => (
              <TableRow key={item.id}>
                <TableCell>
                  <p>{item.saleable?.name || 'Item not found'}</p>
                  {item.sold_item_codes?.length > 0 && (
                    <p className="text-xs text-blue-200">Units: {item.sold_item_codes.join(', ')}</p>
                  )}
                </TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">{parseFloat(item.price_at_sale).toFixed(2)}</TableCell>
                <TableCell className="text-right">{parseFloat(item.discount).toFixed(2)}</TableCell>
                <TableCell className="text-right">{((item.price_at_sale - item.discount) * item.quantity).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="border-t border-white/10 mt-4 pt-4 text-right space-y-1">
        <p><strong>Subtotal:</strong> LKR {parseFloat(sale.subtotal).toFixed(2)}</p>
        <p><strong>Discount:</strong> LKR {parseFloat(sale.discount).toFixed(2)}</p>
        <p className="text-lg font-bold text-white"><strong>Total:</strong> LKR {parseFloat(sale.total).toFixed(2)}</p>
        <p className="text-sm font-semibold text-emerald-400"><strong>Net Profit:</strong> LKR {parseFloat(sale.profit || 0).toFixed(2)}</p>
      </div>
    </div>
  );
};


export function Reports() {
  const { sales, loading, dailyCash, resetDailyCash, deleteSale, updateSaleCost } = useSales();
  const { toast } = useToast();
  const [timeFilter, setTimeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'products' | 'repairs'
  const [customDate, setCustomDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customMonth, setCustomMonth] = useState(format(new Date(), 'yyyy-MM'));

  const [selectedSale, setSelectedSale] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [saleToDeleteId, setSaleToDeleteId] = useState(null);

  // Edit Cost & Profit dialog state
  const [editingSale, setEditingSale] = useState(null);
  const [editCost, setEditCost] = useState('');
  const [editProfit, setEditProfit] = useState('');
  const [isSavingCost, setIsSavingCost] = useState(false);

  // --- New state for search and pagination ---
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const paginatedData = useMemo(() => {
    if (!sales) return { currentItems: [], totalPages: 0, totalFilteredCount: 0, allFilteredSales: [] };

    // 1. Filter by category (All / Products / Mobile Repairs)
    const categoryFilteredSales = sales.filter(sale => {
      if (categoryFilter === 'repairs') return Boolean(sale.isRepair);
      if (categoryFilter === 'products') return !sale.isRepair;
      return true;
    });

    // 2. Filter by search term
    const searchedSales = categoryFilteredSales.filter(sale => {
      const term = searchTerm.toLowerCase();
      const customerMatch = sale.customer_name?.toLowerCase().includes(term);
      const invoiceMatch = sale.id?.toString().includes(term);
      const itemMatch = sale.items?.some(i => (i.saleable?.name || '').toLowerCase().includes(term));
      return customerMatch || invoiceMatch || itemMatch;
    });

    // 3. Filter by the selected time period
    const timeFilteredSales = (() => {
      switch (timeFilter) {
        case 'all': return searchedSales;
        case 'daily': return searchedSales.filter(item => isToday(parseISO(item.created_at)));
        case 'monthly': return searchedSales.filter(item => isThisMonth(parseISO(item.created_at)));
        case 'customDay': {
          if (!customDate) return [];
          const selected = new Date(customDate + 'T00:00:00');
          return searchedSales.filter(item => isSameDay(parseISO(item.created_at), selected));
        }
        case 'customMonth': {
          if (!customMonth) return [];
          const [year, month] = customMonth.split('-').map(Number);
          const selected = new Date(year, month - 1);
          return searchedSales.filter(item => {
            const itemDate = parseISO(item.created_at);
            return isSameYear(itemDate, selected) && isSameMonth(itemDate, selected);
          });
        }
        default: return searchedSales;
      }
    })();

    // 4. Finally, apply pagination
    const totalPages = Math.ceil(timeFilteredSales.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = timeFilteredSales.slice(indexOfFirstItem, indexOfLastItem);

    return { currentItems, totalPages, totalFilteredCount: timeFilteredSales.length, allFilteredSales: timeFilteredSales };

  }, [sales, categoryFilter, timeFilter, customDate, customMonth, searchTerm, currentPage]);

  const { currentItems, totalPages, totalFilteredCount, allFilteredSales } = paginatedData;

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [timeFilter, categoryFilter, customDate, customMonth, searchTerm]);

  const totalRevenue = allFilteredSales.reduce((sum, sale) => sum + parseFloat(sale.total || 0), 0);
  const totalProfit = allFilteredSales.reduce((sum, sale) => sum + parseFloat(sale.profit || 0), 0);
  const totalCost = Math.max(0, totalRevenue - totalProfit);
  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;

  const stats = useMemo(() => {
    if (categoryFilter === 'repairs') {
      return [
        { title: "Repair Revenue", value: `LKR ${totalRevenue.toFixed(2)}`, icon: DollarSign, color: "from-blue-500 to-cyan-500", description: `${totalFilteredCount} repair jobs billed` },
        { title: "Parts / Material Cost", value: `LKR ${totalCost.toFixed(2)}`, icon: Calendar, color: "from-amber-500 to-orange-600", description: "Display, battery & parts cost" },
        { title: "Net Repair Profit", value: `LKR ${totalProfit.toFixed(2)}`, icon: TrendingUp, color: "from-emerald-500 to-teal-600", description: `Repair Margin: ${profitMargin}%` },
        { title: "Avg. Repair Value", value: `LKR ${totalFilteredCount > 0 ? (totalRevenue / totalFilteredCount).toFixed(2) : '0.00'}`, icon: BarChart3, color: "from-purple-500 to-purple-600", description: "Avg. repair ticket" }
      ];
    }
    if (categoryFilter === 'products') {
      return [
        { title: "Product Revenue", value: `LKR ${totalRevenue.toFixed(2)}`, icon: DollarSign, color: "from-green-500 to-green-600", description: `${totalFilteredCount} transactions` },
        { title: "Inventory Cost", value: `LKR ${totalCost.toFixed(2)}`, icon: Calendar, color: "from-amber-500 to-orange-600", description: "Accessories wholesale cost" },
        { title: "Product Profit", value: `LKR ${totalProfit.toFixed(2)}`, icon: TrendingUp, color: "from-blue-500 to-blue-600", description: `Margin: ${profitMargin}%` },
        { title: "Avg. Sale", value: `LKR ${totalFilteredCount > 0 ? (totalRevenue / totalFilteredCount).toFixed(2) : '0.00'}`, icon: BarChart3, color: "from-purple-500 to-purple-600", description: "Average product sale" }
      ];
    }
    return [
      { title: "Total Revenue", value: `LKR ${totalRevenue.toFixed(2)}`, icon: DollarSign, color: "from-green-500 to-green-600", description: `${totalFilteredCount} transactions` },
      { title: "Total Cost", value: `LKR ${totalCost.toFixed(2)}`, icon: Calendar, color: "from-amber-500 to-orange-600", description: "Stock & repair parts cost" },
      { title: "Net Profit", value: `LKR ${totalProfit.toFixed(2)}`, icon: TrendingUp, color: "from-blue-500 to-blue-600", description: `Overall Margin: ${profitMargin}%` },
      { title: "Cash in Register", value: `LKR ${dailyCash.toFixed(2)}`, icon: Calendar, color: "from-orange-500 to-orange-600", description: "Resets manually" }
    ];
  }, [categoryFilter, totalRevenue, totalCost, totalProfit, totalFilteredCount, profitMargin, dailyCash]);

  const handleViewSale = (sale) => {
    setSelectedSale(sale);
    setIsViewOpen(true);
  };

  const handleOpenEditCost = (sale) => {
    const saleTotal = parseFloat(sale.total || 0);
    const saleProfit = parseFloat(sale.profit || 0);
    const calculatedCost = Math.max(0, saleTotal - saleProfit);

    setEditingSale(sale);
    setEditCost(calculatedCost.toFixed(2));
    setEditProfit(saleProfit.toFixed(2));
  };

  const handleCostInputChange = (newCostVal) => {
    setEditCost(newCostVal);
    if (!editingSale) return;
    const saleTotal = parseFloat(editingSale.total || 0);
    const parsedCost = parseFloat(newCostVal) || 0;
    const calculatedProfit = saleTotal - parsedCost;
    setEditProfit(calculatedProfit.toFixed(2));
  };

  const handleProfitInputChange = (newProfitVal) => {
    setEditProfit(newProfitVal);
    if (!editingSale) return;
    const saleTotal = parseFloat(editingSale.total || 0);
    const parsedProfit = parseFloat(newProfitVal) || 0;
    const calculatedCost = Math.max(0, saleTotal - parsedProfit);
    setEditCost(calculatedCost.toFixed(2));
  };

  const handleSaveCostAndProfit = async () => {
    if (!editingSale) return;
    setIsSavingCost(true);
    try {
      await updateSaleCost(editingSale.id, editCost, editProfit);
      setEditingSale(null);
    } catch (err) {
      toast({ title: "Update Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSavingCost(false);
    }
  };

  const openDeleteConfirmation = (saleId) => {
    setSaleToDeleteId(saleId);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (saleToDeleteId) {
      try {
        await deleteSale(saleToDeleteId);
      } catch (error) {
        toast({ title: "Error", description: `Failed to delete sale: ${error.message}`, variant: "destructive" });
      } finally {
        setIsDeleteConfirmOpen(false);
        setSaleToDeleteId(null);
      }
    }
  };

  const handleExport = () => {
    if (allFilteredSales.length === 0) {
      toast({ title: "No Data to Export", variant: "destructive" });
      return;
    }
    const doc = new jsPDF();
    const filterText = { all: 'All Time', daily: 'Today', monthly: 'This Month', customDay: `for ${format(new Date(customDate + 'T00:00:00'), 'MMM d, yyyy')}`, customMonth: `for ${format(new Date(customMonth + '-02'), 'MMMM yyyy')}` }[timeFilter];
    const catText = categoryFilter === 'repairs' ? 'Mobile Repairs' : (categoryFilter === 'products' ? 'Accessories & Products' : 'All Transactions');
    doc.setFontSize(20);
    doc.text("Sales Report", 14, 22);
    doc.setFontSize(12);
    doc.text(`Period: ${filterText} (${catText})`, 14, 30);
    const statsBody = stats.map(stat => [stat.title, stat.value]);
    autoTable(doc, { startY: 40, head: [['Metric', 'Value']], body: statsBody, theme: 'striped', headStyles: { fillColor: [41, 128, 185] } });
    const tableColumn = ["Invoice ID", "Type", "Customer", "Total (LKR)", "Cost (LKR)", "Profit (LKR)", "Date"];
    const tableRows = allFilteredSales.map(sale => [
      `#${sale.id}`,
      sale.isRepair ? 'Repair' : 'Product',
      sale.customer_name,
      parseFloat(sale.total).toFixed(2),
      (parseFloat(sale.total) - parseFloat(sale.profit)).toFixed(2),
      parseFloat(sale.profit).toFixed(2),
      format(parseISO(sale.created_at), 'yyyy-MM-dd h:mm a')
    ]);

    const lastTableY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 40;
    autoTable(doc, { startY: lastTableY + 10, head: [tableColumn], body: tableRows });

    const date = new Date();
    doc.save(`sales_report_${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}.pdf`);
    toast({ title: "Export Successful" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Reports & Analytics</h1>
          <p className="text-gray-400 mt-1">Track performance and monitor business activities</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> Export PDF
          </Button>
          <Button variant="outline" className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10" onClick={resetDailyCash}>
            Reset Cash
          </Button>
        </div>
      </div>

      <Card className="glass-effect border-white/10">
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-white">
            <Filter className="w-5 h-5 text-cyan-400" />
            <span className="font-semibold">Filters:</span>
          </div>

          {/* Category Filter: All / Products / Repairs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 shrink-0">
            <Button
              size="sm"
              variant={categoryFilter === 'all' ? 'default' : 'ghost'}
              className={`h-8 text-xs rounded-lg ${categoryFilter === 'all' ? 'bg-white/20 text-white font-semibold' : 'text-gray-400 hover:text-white'}`}
              onClick={() => setCategoryFilter('all')}
            >
              All Sales
            </Button>
            <Button
              size="sm"
              variant={categoryFilter === 'products' ? 'default' : 'ghost'}
              className={`h-8 text-xs rounded-lg ${categoryFilter === 'products' ? 'bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 font-semibold' : 'text-gray-400 hover:text-white'}`}
              onClick={() => setCategoryFilter('products')}
            >
              <ShoppingBag className="w-3.5 h-3.5 mr-1" /> Products Only
            </Button>
            <Button
              size="sm"
              variant={categoryFilter === 'repairs' ? 'default' : 'ghost'}
              className={`h-8 text-xs rounded-lg ${categoryFilter === 'repairs' ? 'bg-blue-600/40 text-cyan-300 border border-blue-500/40 font-semibold' : 'text-gray-400 hover:text-white'}`}
              onClick={() => setCategoryFilter('repairs')}
            >
              <Wrench className="w-3.5 h-3.5 mr-1" /> 🔧 Mobile Repairs
            </Button>
          </div>

          <div>
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-[160px] bg-white/10 border-white/20 text-white"><SelectValue placeholder="Time Period" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="daily">Today</SelectItem>
                <SelectItem value="monthly">This Month</SelectItem>
                <SelectItem value="customDay">Custom Day</SelectItem>
                <SelectItem value="customMonth">Custom Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {timeFilter === 'customDay' && (<div><Input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="w-[160px] bg-white/10 border-white/20 text-white" /></div>)}
          {timeFilter === 'customMonth' && (<div><Input type="month" value={customMonth} onChange={(e) => setCustomMonth(e.target.value)} className="w-[160px] bg-white/10 border-white/20 text-white" /></div>)}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by Invoice ID, Customer, or Repair..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (<motion.div key={stat.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}> <Card className="glass-effect border-white/10 card-hover"> <CardContent className="p-6"> <div className="flex items-center justify-between"> <div> <p className="text-sm text-gray-400 mb-1">{stat.title}</p> <p className="text-2xl font-bold text-white">{stat.value}</p> <p className="text-xs text-gray-500 mt-1">{stat.description}</p> </div> <div className={`p-3 rounded-full bg-gradient-to-r ${stat.color}`}> <stat.icon className="w-6 h-6 text-white" /> </div> </div> </CardContent> </Card> </motion.div>))}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="glass-effect border-white/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Activity className="w-5 h-5 text-purple-500" />
                  Sales Log ({totalFilteredCount})
                  {categoryFilter === 'repairs' && <Badge className="bg-blue-500/20 text-cyan-300 ml-2">Mobile Repairs</Badge>}
                  {categoryFilter === 'products' && <Badge className="bg-emerald-500/20 text-emerald-300 ml-2">Products Only</Badge>}
                </CardTitle>
                <CardDescription>Detailed log of transactions with item cost & profit breakdown.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (<p className="text-gray-400 text-center py-4">Loading sales data...</p>) : currentItems.length === 0 ? (<p className="text-gray-400 text-center py-4">No sales to display for the selected filters.</p>) : (
              <>
                <div className="overflow-x-auto max-h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 sticky top-0 bg-slate-800/80 backdrop-blur-sm">
                        <TableHead>Invoice ID</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Cost (Part/Stock)</TableHead>
                        <TableHead>Profit</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentItems.map((sale) => {
                        const saleTotal = parseFloat(sale.total || 0);
                        const saleProfit = parseFloat(sale.profit || 0);
                        const cost = Math.max(0, saleTotal - saleProfit);

                        return (
                          <TableRow key={sale.id} className="border-white/10 hover:bg-white/5">
                            <TableCell className="font-mono text-cyan-300 font-bold">#{sale.id}</TableCell>
                            <TableCell>
                              {sale.isRepair ? (
                                <Badge className="bg-blue-500/20 text-cyan-300 border-blue-500/30 text-[11px] whitespace-nowrap">
                                  🔧 Repair
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[11px] whitespace-nowrap">
                                  🛍️ Product
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>{sale.customer_name}</TableCell>
                            <TableCell>{sale.items?.length || 0}</TableCell>
                            <TableCell className="font-semibold text-white">LKR {saleTotal.toFixed(2)}</TableCell>
                            <TableCell className="text-amber-300 font-medium">LKR {cost.toFixed(2)}</TableCell>
                            <TableCell className={saleProfit >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                              LKR {saleProfit.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-xs text-gray-400">{format(parseISO(sale.created_at), 'MMM d, yyyy h:mm a')}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2 border-white/20 text-white hover:bg-white/10"
                                  onClick={() => handleViewSale(sale)}
                                  title="View Receipt"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2 border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500 hover:text-black font-semibold"
                                  onClick={() => handleOpenEditCost(sale)}
                                  title="Update Part Cost & Profit"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-8 px-2"
                                  onClick={() => openDeleteConfirmation(sale.id)}
                                  title="Delete Bill"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex items-center justify-end space-x-2 py-4">
                  <span className="text-sm text-gray-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* MODAL: VIEW RECEIPT */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="glass-effect border-white/20 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Receipt Details</DialogTitle>
          </DialogHeader>
          <ReceiptView sale={selectedSale} />
        </DialogContent>
      </Dialog>

      {/* MODAL: UPDATE BILL COST & PROFIT */}
      <Dialog open={Boolean(editingSale)} onOpenChange={(open) => !open && setEditingSale(null)}>
        <DialogContent className="glass-effect border-white/20 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-cyan-400" />
              Update Bill Cost & Profit
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              Invoice #{editingSale?.id} • {editingSale?.customer_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Billed to Customer:</span>
                <span className="font-bold text-white text-sm">LKR {parseFloat(editingSale?.total || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Bill Category:</span>
                <span className="font-semibold text-cyan-300">
                  {editingSale?.isRepair ? '🔧 Mobile Repair' : '🛍️ Product / Accessories'}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="partCostInput" className="text-amber-300 font-semibold">
                  Part / Stock Cost (LKR)
                </Label>
                <Input
                  id="partCostInput"
                  type="number"
                  step="0.01"
                  value={editCost}
                  onChange={e => handleCostInputChange(e.target.value)}
                  className="bg-white/10 border-amber-500/40 text-white mt-1 font-semibold"
                  placeholder="0.00"
                />
                <p className="text-[11px] text-gray-400 mt-1">E.g., cost of replacement screen, battery or wholesale item price.</p>
              </div>

              <div>
                <Label htmlFor="profitInput" className="text-emerald-400 font-semibold">
                  Net Profit (LKR)
                </Label>
                <Input
                  id="profitInput"
                  type="number"
                  step="0.01"
                  value={editProfit}
                  onChange={e => handleProfitInputChange(e.target.value)}
                  className="bg-white/10 border-emerald-500/40 text-white mt-1 font-semibold text-emerald-300"
                  placeholder="0.00"
                />
                <p className="text-[11px] text-gray-400 mt-1">Calculated as Total Billed - Cost.</p>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setEditingSale(null)} disabled={isSavingCost}>
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold"
              onClick={handleSaveCostAndProfit}
              disabled={isSavingCost}
            >
              {isSavingCost ? 'Saving...' : 'Save Cost & Profit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: DELETE CONFIRMATION */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="glass-effect border-white/20 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle /> Confirm Deletion
            </DialogTitle>
            <DialogDescription className="text-gray-300 pt-2">
              Are you sure you want to delete Sale #{saleToDeleteId}? This action will permanently remove the sale record. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Confirm Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
