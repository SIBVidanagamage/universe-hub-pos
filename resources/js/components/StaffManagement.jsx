import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useStaff } from '@/hooks/useStaff'; // <-- Import our new hook
import { useAuth } from '@/hooks/useAuth'; // To check current user
import { Users, Plus, Edit, Trash2 } from 'lucide-react';

const initialNewStaffState = {
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'cashier',
};

export function StaffManagement() {
    // Use the new hook to get staff data and functions
    const { staff, loading, addStaff, updateStaff, deleteStaff } = useStaff();
    const { user: currentUser } = useAuth();

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState(null);
    const [newStaff, setNewStaff] = useState(initialNewStaffState);
    const { toast } = useToast();

    const handleAddStaff = async (e) => {
        e.preventDefault();
        try {
            await addStaff(newStaff);
            toast({ title: "Staff Added", description: `${newStaff.fullName} has been added.` });
            setNewStaff(initialNewStaffState);
            setIsAddDialogOpen(false);
        } catch (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const handleEditStaff = async (e) => {
        e.preventDefault();
        try {
            // Ensure the password field is only sent if it's not empty
            const dataToUpdate = { ...editingStaff };
            if (!dataToUpdate.password) {
                delete dataToUpdate.password;
            }
            await updateStaff(editingStaff.id, dataToUpdate);
            toast({ title: "Staff Updated", description: `${editingStaff.fullName} has been updated.` });
            setIsEditDialogOpen(false);
            setEditingStaff(null);
        } catch (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const handleDeleteStaff = async (staffMember) => {
        if (staffMember.id === currentUser.id) {
            toast({ title: "Action Forbidden", description: "You cannot delete your own account.", variant: "destructive" });
            return;
        }
        // Use a standard confirm dialog
        if (confirm(`Are you sure you want to delete ${staffMember.name}?`)) {
            try {
                await deleteStaff(staffMember.id);
                toast({ title: "Staff Deleted", description: `${staffMember.name} has been removed.` });
            } catch (error) {
                toast({ title: "Error", description: error.message, variant: "destructive" });
            }
        }
    };

    const openEditDialog = (staffMember) => {
        // The backend sends 'name', but the form uses 'fullName'. Let's align them.
        setEditingStaff({ ...staffMember, fullName: staffMember.name, password: '' });
        setIsEditDialogOpen(true);
    };

    const getRoleBadgeVariant = (role) => {
        switch (role) {
            case 'admin': return 'destructive';
            case 'manager': return 'default';
            case 'technician': return 'default';
            case 'cashier': return 'secondary';
            default: return 'outline';
        }
    };

    if (loading) {
        return <div className="text-center p-8">Loading staff members...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold gradient-text">Staff Management</h1>
                    <p className="text-gray-400 mt-1">Manage team members and their roles</p>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Staff
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="glass-effect border-white/20 max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-white">Add New Staff Member</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAddStaff} className="space-y-4 pt-4">
                            <div>
                                <Label htmlFor="fullName" className="text-gray-200">Full Name</Label>
                                <Input id="fullName" value={newStaff.fullName} onChange={(e) => setNewStaff(prev => ({ ...prev, fullName: e.target.value }))} required />
                            </div>
                             <div>
                                <Label htmlFor="email" className="text-gray-200">Email</Label>
                                <Input id="email" type="email" value={newStaff.email} onChange={(e) => setNewStaff(prev => ({ ...prev, email: e.target.value }))} required />
                            </div>
                            <div>
                                <Label htmlFor="phone" className="text-gray-200">Phone</Label>
                                <Input id="phone" value={newStaff.phone} onChange={(e) => setNewStaff(prev => ({ ...prev, phone: e.target.value }))} />
                            </div>
                            <div>
                                <Label htmlFor="password" className="text-gray-200">Password</Label>
                                <Input id="password" type="password" value={newStaff.password} onChange={(e) => setNewStaff(prev => ({ ...prev, password: e.target.value }))} required />
                            </div>
                            <div>
                                <Label htmlFor="role" className="text-gray-200">Role</Label>
                                <Select value={newStaff.role} onValueChange={(value) => setNewStaff(prev => ({ ...prev, role: value }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="manager">Manager</SelectItem>
                                        <SelectItem value="technician">Technician</SelectItem>
                                        <SelectItem value="cashier">Cashier</SelectItem>
                                        <SelectItem value="viewer">Viewer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <DialogFooter><Button type="submit">Add Staff</Button></DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="glass-effect border-white/10">
                <CardHeader><CardTitle className="text-white">Team Members ({staff.length})</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Staff Member</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {staff.map((member) => (
                                <TableRow key={member.id}>
                                    <TableCell>
                                        <p className="font-medium text-white">{member.name}</p>
                                        <p className="text-sm text-gray-400">{member.email}</p>
                                    </TableCell>
                                    <TableCell><Badge variant={getRoleBadgeVariant(member.role)}>{member.role}</Badge></TableCell>
                                    <TableCell>{new Date(member.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={() => openEditDialog(member)}><Edit className="w-4 h-4" /></Button>
                                            <Button variant="destructive" size="sm" onClick={() => handleDeleteStaff(member)}><Trash2 className="w-4 h-4" /></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="glass-effect border-white/20 max-w-md">
                    <DialogHeader><DialogTitle className="text-white">Edit Staff Member</DialogTitle></DialogHeader>
                    {editingStaff && (
                        <form onSubmit={handleEditStaff} className="space-y-4 pt-4">
                            <div>
                                <Label htmlFor="edit-fullName" className="text-gray-200">Full Name</Label>
                                <Input id="edit-fullName" value={editingStaff.fullName} onChange={(e) => setEditingStaff(prev => ({ ...prev, fullName: e.target.value }))} required />
                            </div>
                            <div>
                                <Label htmlFor="edit-email" className="text-gray-200">Email</Label>
                                <Input id="edit-email" type="email" value={editingStaff.email} onChange={(e) => setEditingStaff(prev => ({ ...prev, email: e.target.value }))} required />
                            </div>
                            <div>
                                <Label htmlFor="edit-phone" className="text-gray-200">Phone</Label>
                                <Input id="edit-phone" value={editingStaff.phone} onChange={(e) => setEditingStaff(prev => ({ ...prev, phone: e.target.value }))} />
                            </div>
                            <div>
                                <Label htmlFor="edit-password" className="text-gray-200">New Password (optional)</Label>
                                <Input id="edit-password" placeholder="Leave blank to keep current password" type="password" onChange={(e) => setEditingStaff(prev => ({ ...prev, password: e.target.value }))} />
                            </div>
                            <div>
                                <Label htmlFor="edit-role" className="text-gray-200">Role</Label>
                                <Select value={editingStaff.role} onValueChange={(value) => setEditingStaff(prev => ({ ...prev, role: value }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="manager">Manager</SelectItem>
                                        <SelectItem value="technician">Technician</SelectItem>
                                        <SelectItem value="cashier">Cashier</SelectItem>
                                        <SelectItem value="viewer">Viewer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <DialogFooter><Button type="submit">Update Staff</Button></DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
