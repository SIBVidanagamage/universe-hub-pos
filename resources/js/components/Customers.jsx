import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Search, User, Phone, Mail, Award } from 'lucide-react';
import { useCustomers } from '@/hooks/useCustomers';
import { motion } from 'framer-motion';

export function Customers() {
    const { customers, loading, addCustomer, updateCustomer, deleteCustomer } = useCustomers();
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [currentCustomer, setCurrentCustomer] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        loyalty_points: 0
    });

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        const success = await addCustomer(formData);
        if (success) {
            setIsAddDialogOpen(false);
            setFormData({ name: '', phone: '', email: '', loyalty_points: 0 });
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        const success = await updateCustomer(currentCustomer.id, formData);
        if (success) {
            setIsEditDialogOpen(false);
            setCurrentCustomer(null);
        }
    };

    const openEditDialog = (customer) => {
        setCurrentCustomer(customer);
        setFormData({
            name: customer.name,
            phone: customer.phone || '',
            email: customer.email || '',
            loyalty_points: customer.loyalty_points || 0
        });
        setIsEditDialogOpen(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this customer?")) {
            await deleteCustomer(id);
        }
    };

    const filteredCustomers = customers.filter(c =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm)
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight text-white">Customer Management</h1>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                            <Plus className="w-4 h-4 mr-2" /> Add Customer
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="glass-effect border-white/20 text-white">
                        <DialogHeader>
                            <DialogTitle>Add New Customer</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAddSubmit} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Name *</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                                        placeholder="Enter customer name"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Phone</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                                        placeholder="Enter phone number"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                                        placeholder="Enter email address"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Loyalty Points</label>
                                <div className="relative">
                                    <Award className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        type="number"
                                        min="0"
                                        value={formData.loyalty_points}
                                        onChange={(e) => setFormData({ ...formData, loyalty_points: parseFloat(e.target.value) || 0 })}
                                        className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                                    />
                                </div>
                            </div>
                            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Save Customer</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="glass-effect border-white/10">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-white">Customer Database</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search customers..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 bg-white/5 border-white/10 text-white"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center text-gray-400 py-8">Loading...</div>
                    ) : (
                        <div className="rounded-md border border-white/10 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-white/5">
                                    <TableRow className="border-white/10 hover:bg-transparent">
                                        <TableHead className="text-gray-300 font-semibold">Name</TableHead>
                                        <TableHead className="text-gray-300 font-semibold">Contact Info</TableHead>
                                        <TableHead className="text-gray-300 font-semibold">Loyalty Points</TableHead>
                                        <TableHead className="text-gray-300 font-semibold text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredCustomers.length === 0 ? (
                                        <TableRow className="border-white/10 hover:bg-transparent">
                                            <TableCell colSpan={4} className="text-center text-gray-400 py-8">
                                                No customers found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredCustomers.map((customer) => (
                                            <TableRow key={customer.id} className="border-white/10 hover:bg-white/5 transition-colors">
                                                <TableCell className="font-medium text-white">{customer.name}</TableCell>
                                                <TableCell className="text-gray-300">
                                                    <div className="flex flex-col space-y-1 text-sm">
                                                        {customer.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-gray-400" />{customer.phone}</span>}
                                                        {customer.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-gray-400" />{customer.email}</span>}
                                                        {!customer.phone && !customer.email && <span className="text-gray-500 italic">No contact info</span>}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Award className="w-4 h-4 text-yellow-500" />
                                                        <span className="text-white font-medium">{customer.loyalty_points || 0}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="border-white/20 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                                                            onClick={() => openEditDialog(customer)}
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="border-red-500/50 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                            onClick={() => handleDelete(customer.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="glass-effect border-white/20 text-white">
                    <DialogHeader>
                        <DialogTitle>Edit Customer</DialogTitle>
                    </DialogHeader>
                    {currentCustomer && (
                        <form onSubmit={handleEditSubmit} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Name *</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Phone</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Loyalty Points</label>
                                <div className="relative">
                                    <Award className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        type="number"
                                        min="0"
                                        value={formData.loyalty_points}
                                        onChange={(e) => setFormData({ ...formData, loyalty_points: parseFloat(e.target.value) || 0 })}
                                        className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                                    />
                                </div>
                            </div>
                            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Update Customer</Button>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
