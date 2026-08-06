import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
  ChevronRight
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
            </div>
        </div>
    );
};


export function Reports() {
  const { sales, loading, dailyCash, resetDailyCash, deleteSale } = useSales();
  const { toast } = useToast();
  const [timeFilter, setTimeFilter] = useState('all');
  const [customDate, setCustomDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customMonth, setCustomMonth] = useState(format(new Date(), 'yyyy-MM'));

  const [selectedSale, setSelectedSale] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [saleToDeleteId, setSaleToDeleteId] = useState(null);

  // --- New state for search and pagination ---
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const paginatedData = useMemo(() => {
    if (!sales) return { currentItems: [], totalPages: 0, totalFilteredCount: 0, allFilteredSales: [] };

    // 1. Filter by search term first
    const searchedSales = sales.filter(sale => {
        const term = searchTerm.toLowerCase();
        const customerMatch = sale.customer_name?.toLowerCase().includes(term);
        const invoiceMatch = sale.id?.toString().includes(term);
        return customerMatch || invoiceMatch;
    });

    // 2. Then, filter by the selected time period
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

    // 3. Finally, apply pagination
    const totalPages = Math.ceil(timeFilteredSales.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = timeFilteredSales.slice(indexOfFirstItem, indexOfLastItem);

    return { currentItems, totalPages, totalFilteredCount: timeFilteredSales.length, allFilteredSales: timeFilteredSales };

  }, [sales, timeFilter, customDate, customMonth, searchTerm, currentPage]);

  const { currentItems, totalPages, totalFilteredCount, allFilteredSales } = paginatedData;

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [timeFilter, customDate, customMonth, searchTerm]);

  const totalRevenue = allFilteredSales.reduce((sum, sale) => sum + parseFloat(sale.total), 0);
  const totalProfit = allFilteredSales.reduce((sum, sale) => sum + parseFloat(sale.profit), 0);

  const stats = [
    { title: "Revenue", value: `LKR ${totalRevenue.toFixed(2)}`, icon: DollarSign, color: "from-green-500 to-green-600", description: `${totalFilteredCount} transactions` },
    { title: "Profit", value: `LKR ${totalProfit.toFixed(2)}`, icon: TrendingUp, color: "from-blue-500 to-blue-600", description: `Margin: ${totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}%` },
    { title: "Avg. Sale", value: `LKR ${totalFilteredCount > 0 ? (totalRevenue / totalFilteredCount).toFixed(2) : '0.00'}`, icon: BarChart3, color: "from-purple-500 to-purple-600", description: "Average transaction value" },
    { title: "Cash in Register", value: `LKR ${dailyCash.toFixed(2)}`, icon: Calendar, color: "from-orange-500 to-orange-600", description: "Resets manually" }
  ];

  const handleViewSale = (sale) => {
    setSelectedSale(sale);
    setIsViewOpen(true);
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
    doc.setFontSize(20);
    doc.text("Sales Report", 14, 22);
    doc.setFontSize(12);
    doc.text(`Period: ${filterText}`, 14, 30);
    const statsBody = stats.map(stat => [stat.title, stat.value]);
    autoTable(doc, { startY: 40, head: [['Metric', 'Value']], body: statsBody, theme: 'striped', headStyles: { fillColor: [41, 128, 185] } });
    const tableColumn = ["Invoice ID", "Customer", "Items", "Total (LKR)", "Profit (LKR)", "Date"];
    const tableRows = allFilteredSales.map(sale => [ `#${sale.id}`, sale.customer_name, sale.items.length, parseFloat(sale.total).toFixed(2), parseFloat(sale.profit).toFixed(2), format(parseISO(sale.created_at), 'yyyy-MM-dd h:mm a') ]);

    // FIX: Check if doc.lastAutoTable exists before trying to get its finalY property.
    const lastTableY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 40;
    autoTable(doc, { startY: lastTableY + 10, head: [tableColumn], body: tableRows });

    const date = new Date();
    doc.save(`sales_report_${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}.pdf`);
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
          <div className="flex items-center gap-2 text-white"><Filter className="w-5 h-5" /> <span className="font-semibold">Filters:</span></div>
          <div>
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-[180px] bg-white/10 border-white/20 text-white"><SelectValue placeholder="Time Period" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="daily">Today</SelectItem>
                <SelectItem value="monthly">This Month</SelectItem>
                <SelectItem value="customDay">Custom Day</SelectItem>
                <SelectItem value="customMonth">Custom Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {timeFilter === 'customDay' && ( <div><Input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="w-[180px] bg-white/10 border-white/20 text-white" /></div> )}
          {timeFilter === 'customMonth' && ( <div><Input type="month" value={customMonth} onChange={(e) => setCustomMonth(e.target.value)} className="w-[180px] bg-white/10 border-white/20 text-white" /></div> )}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
                placeholder="Search by Invoice ID or Customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => ( <motion.div key={stat.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}> <Card className="glass-effect border-white/10 card-hover"> <CardContent className="p-6"> <div className="flex items-center justify-between"> <div> <p className="text-sm text-gray-400 mb-1">{stat.title}</p> <p className="text-2xl font-bold text-white">{stat.value}</p> <p className="text-xs text-gray-500 mt-1">{stat.description}</p> </div> <div className={`p-3 rounded-full bg-gradient-to-r ${stat.color}`}> <stat.icon className="w-6 h-6 text-white" /> </div> </div> </CardContent> </Card> </motion.div> ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="glass-effect border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><Activity className="w-5 h-5 text-purple-500" /> Sales Log ({totalFilteredCount})</CardTitle>
            <CardDescription>Detailed log of all sales transactions for the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? ( <p className="text-gray-400 text-center py-4">Loading sales data...</p> ) : currentItems.length === 0 ? ( <p className="text-gray-400 text-center py-4">No sales to display for the selected filters.</p> ) : (
              <>
                <div className="overflow-x-auto max-h-[600px]">
                  <Table>
                    <TableHeader><TableRow className="border-white/10 sticky top-0 bg-slate-800/80 backdrop-blur-sm"><TableHead>Invoice ID</TableHead><TableHead>Customer</TableHead><TableHead>Items</TableHead><TableHead>Total</TableHead><TableHead>Profit</TableHead><TableHead>Date</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {currentItems.map((sale) => (
                        <TableRow key={sale.id} className="border-white/10 hover:bg-white/5">
                          <TableCell>#{sale.id}</TableCell>
                          <TableCell>{sale.customer_name}</TableCell>
                          <TableCell>{sale.items.length}</TableCell>
                          <TableCell>LKR {parseFloat(sale.total).toFixed(2)}</TableCell>
                          <TableCell>LKR {parseFloat(sale.profit).toFixed(2)}</TableCell>
                          <TableCell>{format(parseISO(sale.created_at), 'MMM d, yyyy h:mm a')}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={() => handleViewSale(sale)}><Eye className="w-4 h-4" /></Button>
                              <Button size="sm" variant="destructive" onClick={() => openDeleteConfirmation(sale.id)}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
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

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="glass-effect border-white/20 max-w-2xl">
            <DialogHeader>
                <DialogTitle className="text-white">Receipt Details</DialogTitle>
            </DialogHeader>
            <ReceiptView sale={selectedSale} />
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="glass-effect border-white/20 max-w-md">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-500">
                  <AlertTriangle /> Confirm Deletion
                </DialogTitle>
                <CardDescription className="text-gray-300 pt-2">
                    Are you sure you want to delete Sale #{saleToDeleteId}? This action will permanently remove the sale record and restock the sold items. This cannot be undone.
                </CardDescription>
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
