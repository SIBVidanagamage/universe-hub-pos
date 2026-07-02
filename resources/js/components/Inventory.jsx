import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useInventory } from '@/hooks/useInventory';
import { useAuth } from '@/hooks/useAuth';
import { useQZ } from '@/hooks/useQZ';
import { Plus, Search, ChevronLeft, ChevronRight, Smartphone } from 'lucide-react';
import { InventoryTable } from '@/components/inventory/InventoryTable';
import { InventoryForm } from '@/components/inventory/InventoryForm';
import JsBarcode from 'jsbarcode';

const initialNewItemState = {
  name: '',
  category: '',
  productType: 'general',
  phoneBrand: '',
  phoneModel: '',
  phoneColor: '',
  phoneImei: '',
  phoneStorage: '',
  sku: '',
  quantity: 0,
  minStock: 10,
  costPrice: 0,
  sellingPrice: 0,
  supplier: '',
  warrantyPeriod: 0,
};

export function Inventory() {
  const { inventory, loading, addItem, updateItem, deleteItem } = useInventory();
  const { user } = useAuth();
  const { isConnected, connect, print } = useQZ();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState(initialNewItemState);
  const { toast } = useToast();
  const barcodeCanvasRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [itemToPrint, setItemToPrint] = useState(null);
  const [printCopies, setPrintCopies] = useState(1);

  useEffect(() => {
    if (!isConnected) {
      connect();
    }
  }, [isConnected, connect]);

  // --- SKU Generation Logic ---
  const generateNextSku = () => {
    if (!inventory || inventory.length === 0) {
      return '1001'; // Starting SKU if inventory is empty
    }
    // Find the maximum numeric SKU from the inventory
    const maxSku = inventory.reduce((max, item) => {
      const currentSku = parseInt(item.sku, 10);
      return !isNaN(currentSku) && currentSku > max ? currentSku : max;
    }, 0);
    // Return the next number as a string
    return (maxSku + 1).toString();
  };

  const handleOpenAddDialog = (type = 'general') => {
    const nextSku = generateNextSku();
    setNewItem({ ...initialNewItemState, sku: nextSku, productType: type, category: type === 'phone' ? 'Phones' : '', quantity: type === 'phone' ? 1 : 0, minStock: type === 'phone' ? 1 : 10 });
    setIsAddDialogOpen(true);
  };

  const handleAddItem = async (e) => { e.preventDefault(); try { await addItem(newItem); setIsAddDialogOpen(false); setNewItem(initialNewItemState); toast({ title: "Success", description: "Item added." }); } catch (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); } };
  const handleEditItem = async (e) => { e.preventDefault(); try { await updateItem(editingItem.id, editingItem); setIsEditDialogOpen(false); setEditingItem(null); toast({ title: "Success", description: "Item updated." }); } catch (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); } };
  const handleDeleteItem = async (item) => { if (confirm(`Delete ${item.name}?`)) { try { await deleteItem(item.id); toast({ title: "Success", description: "Item deleted." }); } catch (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); } } };
  const openEditDialog = (item) => { setEditingItem(item); setIsEditDialogOpen(true); };

  const paginatedData = useMemo(() => {
    const sortedInventory = [...inventory].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const filtered = sortedInventory.filter(item =>
      (item.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (item.sku?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (item.category?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
    return { currentItems, totalPages, totalFilteredCount: filtered.length };
  }, [inventory, searchTerm, currentPage, itemsPerPage]);

  const { currentItems, totalPages, totalFilteredCount } = paginatedData;

  const handleNextPage = () => { if (currentPage < totalPages) { setCurrentPage(currentPage + 1); } };
  const handlePrevPage = () => { if (currentPage > 1) { setCurrentPage(currentPage - 1); } };

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const generateBarcodeBase64 = (barcodeValue) => {
    const canvas = barcodeCanvasRef.current;
    if (canvas) {
      JsBarcode(canvas, barcodeValue, { format: "CODE128", width: 1.5, height: 30, displayValue: false, margin: 5 });
      return canvas.toDataURL("image/png");
    }
    return '';
  };

  const openPrintDialog = (item) => {
    if (!item.barcode) {
        toast({ title: "Barcode Error", description: "This item does not have a barcode.", variant: "destructive" });
        return;
    }
    setItemToPrint(item);
    setPrintCopies(1);
    setIsPrintDialogOpen(true);
  };

  const handlePrintBarcode = async () => {
    if (!isConnected || !itemToPrint) {
        toast({ title: "Printer Error", description: "QZ Tray is not connected or no item is selected.", variant: "destructive" });
        return;
    }
    const printerName = "Xprinter XP-365B";
    try {
        const barcodeBase64 = generateBarcodeBase64(itemToPrint.barcode);
        const labelHtml = `
          <div style="font-family: Arial, sans-serif; text-align: center; width: 36mm; padding: 1mm; line-height: 1.2;">
            <div style="font-size: 8pt; font-weight: bold; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${itemToPrint.name}</div>
            <div style="font-size: 7pt; margin-bottom: 2px;">SKU: ${itemToPrint.sku}</div>
            <img src="${barcodeBase64}" style="margin: 0;" />
            <div style="font-size: 7pt; letter-spacing: 1px; margin-bottom: 2px;">${itemToPrint.barcode}</div>
            <div style="font-size: 10pt; font-weight: bold; margin: 0;">LKR ${itemToPrint.sellingPrice.toFixed(2)}</div>
          </div>`;
        const data = [{ type: 'html', format: 'plain', data: labelHtml }];
        const config = window.qz.configs.create(printerName, { size: { width: 38, height: 25 }, units: 'mm', margins: { top: 1, right: 1, bottom: 1, left: 1 } });
        const printDataWithCopies = Array(printCopies).fill(data[0]);
        await print(config, printDataWithCopies);
        setIsPrintDialogOpen(false);
    } catch (err) {
        console.error("Printing failed:", err);
        toast({ title: "Printing Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
        <canvas ref={barcodeCanvasRef} style={{ display: 'none' }}></canvas>

        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-md">Inventory Management</h1>
                <p className="text-cosmic-titanium mt-1 text-lg">Manage your product inventory and stock levels</p>
            </div>
            <div className="flex gap-3">
                <Button onClick={() => handleOpenAddDialog('general')} className="liquid-button bg-gradient-to-r from-cosmic-success to-emerald-500 hover:from-emerald-400 hover:to-emerald-600 rounded-xl px-6">
                    <Plus className="w-5 h-5 mr-2" /> Add Item
                </Button>
                <Button onClick={() => handleOpenAddDialog('phone')} className="liquid-button bg-gradient-to-r from-cosmic-blue to-cyan-500 hover:from-cyan-400 hover:to-cyan-600 rounded-xl px-6">
                    <Smartphone className="w-5 h-5 mr-2" /> Add Phone
                </Button>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="glass-effect border-white/20 max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-white">{newItem.productType === 'phone' ? 'Add New Phone' : 'Add New Item'}</DialogTitle>
                        <DialogDescription>
                            Fill in the details below. The SKU is auto-generated.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddItem}>
                        <InventoryForm item={newItem} setItem={setNewItem} />
                        <DialogFooter className="mt-4">
                            <Button type="submit">{newItem.productType === 'phone' ? 'Add Phone' : 'Add Item'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>

        <Card className="glass-effect shadow-xl">
            <CardContent className="p-6">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                    <Input
                        placeholder="Search by name, SKU, or category..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 py-6 text-lg bg-white/5 border-white/10 text-white rounded-2xl focus-visible:ring-cosmic-blue"
                    />
                </div>
            </CardContent>
        </Card>

        <Card className="glass-effect shadow-xl">
            <CardHeader>
                <CardTitle className="text-2xl tracking-wide text-white">Inventory Items ({totalFilteredCount})</CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? <p>Loading inventory...</p> :
                    <>
                        <InventoryTable
                            inventory={currentItems}
                            onEdit={openEditDialog}
                            onDelete={handleDeleteItem}
                            onGenerateBarcode={openPrintDialog}
                            user={user}
                        />
                        <div className="flex items-center justify-end space-x-2 py-4">
                            <span className="text-sm text-gray-400">Page {currentPage} of {totalPages}</span>
                            <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage === 1}>
                                <ChevronLeft className="h-4 w-4" /> Previous
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages}>
                                Next <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </>
                }
            </CardContent>
        </Card>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="glass-effect border-white/20 max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-white">Edit Item</DialogTitle>
                    <DialogDescription>
                        Update the details for the selected item. Click "Update Item" when you're done.
                    </DialogDescription>
                </DialogHeader>
                {editingItem && (
                    <form onSubmit={handleEditItem}>
                        <InventoryForm item={editingItem} setItem={setEditingItem} isEditing={true} />
                        <DialogFooter className="mt-4">
                            <Button type="submit">Update Item</Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>

        <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
            <DialogContent className="glass-effect border-white/20 max-w-sm">
                <DialogHeader>
                    <DialogTitle className="text-white">Print Barcode</DialogTitle>
                    <DialogDescription className="text-sm text-gray-300 pt-2">Item: {itemToPrint?.name}</DialogDescription>
                </DialogHeader>
                <div className="pt-4 space-y-2">
                    <Label htmlFor="copies" className="text-gray-200">Number of Copies</Label>
                    <Input id="copies" type="number" min="1" value={printCopies} onChange={(e) => setPrintCopies(Number(e.target.value))} className="bg-white/10 border-white/20 text-white" />
                </div>
                <DialogFooter className="mt-4">
                    <Button onClick={handlePrintBarcode} className="w-full">Print {printCopies} Label(s)</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
