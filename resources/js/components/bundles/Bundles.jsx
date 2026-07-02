import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useBundles } from '@/hooks/useBundles';
import { useInventory } from '@/hooks/useInventory'; // To get the list of all products
import { BundleForm } from './BundleForm';
import { Package, Plus, Edit, Trash2, Search, AlertTriangle } from 'lucide-react';

const initialNewBundleState = { name: '', price: '', product_ids: [] };

export function Bundles() {
    const { bundles, loading, addBundle, updateBundle, deleteBundle } = useBundles();
    const { inventory: allProducts, lowStockItems } = useInventory(); // Get lowStockItems
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingBundle, setEditingBundle] = useState(null);
    const [newBundle, setNewBundle] = useState(initialNewBundleState);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();

    // Create a Set of low stock product IDs for efficient lookup.
    // useMemo ensures this is only recalculated when the lowStockItems array changes.
    const lowStockProductIds = useMemo(() => new Set(lowStockItems.map(item => item.id)), [lowStockItems]);

    const handleAddBundle = async (e) => {
        e.preventDefault();
        try {
            await addBundle(newBundle);
            setIsAddDialogOpen(false);
            setNewBundle(initialNewBundleState);
            toast({ title: "Success", description: "Bundle created successfully." });
        } catch (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const handleEditBundle = async (e) => {
        e.preventDefault();
        try {
            await updateBundle(editingBundle.id, {
                name: editingBundle.name,
                price: editingBundle.price,
                product_ids: editingBundle.product_ids,
            });
            setIsEditDialogOpen(false);
            setEditingBundle(null);
            toast({ title: "Success", description: "Bundle updated successfully." });
        } catch (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const handleDeleteBundle = async (bundle) => {
        if (confirm(`Are you sure you want to delete the bundle "${bundle.name}"?`)) {
            try {
                await deleteBundle(bundle.id);
                toast({ title: "Success", description: "Bundle deleted successfully." });
            } catch (error) {
                toast({ title: "Error", description: error.message, variant: "destructive" });
            }
        }
    };

    const openEditDialog = (bundle) => {
        setEditingBundle({
            ...bundle,
            product_ids: bundle.products.map(p => p.id) // Extract IDs for the form
        });
        setIsEditDialogOpen(true);
    };

    const isBundleLowOnStock = (bundle) => {
        // A bundle is low on stock if any of its products are in the low stock set.
        if (!bundle.products) return false;
        return bundle.products.some(product => lowStockProductIds.has(product.id));
    };

    const filteredBundles = bundles.filter(bundle =>
        bundle.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold gradient-text">Bundle Management</h1>
                    <p className="text-gray-400 mt-1">Create and manage product bundles</p>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700">
                            <Plus className="w-4 h-4 mr-2" /> Add Bundle
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="glass-effect border-white/20 max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-white">Add New Bundle</DialogTitle>
                            <DialogDescription>Create a new product bundle by selecting items from your inventory.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddBundle}>
                            <BundleForm bundle={newBundle} setBundle={setNewBundle} allProducts={allProducts} />
                            <DialogFooter className="mt-4"><Button type="submit" className="bg-gradient-to-r from-green-500 to-green-600">Create Bundle</Button></DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="glass-effect border-white/10">
                <CardContent className="p-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search by bundle name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-white/10 border-white/20 text-white"
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className="glass-effect border-white/10">
                <CardHeader>
                    <CardTitle className="text-white">All Bundles ({filteredBundles.length})</CardTitle>
                    <CardDescription>A list of all product bundles.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? <p>Loading...</p> : (
                        <Table>
                            <TableHeader>
                                <TableRow className="border-white/10">
                                    <TableHead className="text-gray-300">Name</TableHead>
                                    <TableHead className="text-gray-300">Price</TableHead>
                                    <TableHead className="text-gray-300">Items</TableHead>
                                    <TableHead className="text-gray-300">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredBundles.map(bundle => (
                                    <TableRow key={bundle.id} className="border-white/10 hover:bg-white/5">
                                        <TableCell className="font-medium text-white">
                                            <div className="flex items-center gap-2">
                                                <span>{bundle.name}</span>
                                                {isBundleLowOnStock(bundle) && (
                                                    <Badge variant="destructive" className="flex items-center gap-1">
                                                        <AlertTriangle className="h-3 w-3" />
                                                        Low Stock
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-300">LKR {parseFloat(bundle.price).toFixed(2)}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {bundle.products.map(p => <Badge key={p.id} variant="secondary">{p.name}</Badge>)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10" onClick={() => openEditDialog(bundle)}><Edit className="w-4 h-4" /></Button>
                                                <Button variant="outline" size="sm" className="border-red-500/50 text-red-400 hover:bg-red-500/10" onClick={() => handleDeleteBundle(bundle)}><Trash2 className="w-4 h-4" /></Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="glass-effect border-white/20 max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-white">Edit Bundle</DialogTitle>
                        <DialogDescription>Update the bundle details.</DialogDescription>
                    </DialogHeader>
                    {editingBundle && (
                        <form onSubmit={handleEditBundle}>
                            <BundleForm bundle={editingBundle} setBundle={setEditingBundle} allProducts={allProducts} />
                            <DialogFooter className="mt-4"><Button type="submit" className="bg-gradient-to-r from-blue-500 to-blue-600">Update Bundle</Button></DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
