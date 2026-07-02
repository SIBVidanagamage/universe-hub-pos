import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, QrCode, ShieldCheck } from 'lucide-react';

export function InventoryTable({ inventory, onEdit, onDelete, onGenerateBarcode, user }) {
  const getStockStatus = (item) => {
    if (item.quantity === 0) return { label: 'Out of Stock', variant: 'destructive' };
    if (item.quantity <= item.minStock) return { label: 'Low Stock', variant: 'destructive' };
    return { label: 'In Stock', variant: 'default' };
  };

  const canViewCost = ['admin', 'manager'].includes(user?.role);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-white/10">
            <TableHead className="text-gray-300">Product</TableHead>
            <TableHead className="text-gray-300">SKU</TableHead>
            <TableHead className="text-gray-300">Category</TableHead>
            <TableHead className="text-gray-300">Stock</TableHead>
            <TableHead className="text-gray-300">Status</TableHead>
            <TableHead className="text-gray-300">Price</TableHead>
            <TableHead className="text-gray-300">Warranty</TableHead>
            <TableHead className="text-gray-300">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {inventory.map((item) => {
            const status = getStockStatus(item);
            return (
              <TableRow key={item.id} className="border-white/10 hover:bg-white/5">
                <TableCell>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-white">{item.name}</p>
                      {item.productType === 'phone' && <Badge variant="secondary">Phone</Badge>}
                    </div>
                    {item.productType === 'phone' && (
                      <p className="text-xs text-blue-200">
                        {[item.phoneBrand, item.phoneModel, item.phoneColor, item.phoneStorage].filter(Boolean).join(' / ')}
                        {item.phoneImei ? ` | IMEI: ${item.phoneImei}` : ''}
                      </p>
                    )}
                    <p className="text-sm text-gray-400">{item.supplier}</p>
                  </div>
                </TableCell>
                <TableCell className="text-gray-300">{item.sku}</TableCell>
                <TableCell className="text-gray-300">{item.category}</TableCell>
                <TableCell className="text-gray-300">
                  {item.quantity} / {item.minStock} min
                </TableCell>
                <TableCell>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell>
                  <div>
                    {['admin', 'manager'].includes(user?.role) && (
                      <p className="text-gray-300">Cost: LKR {item.costPrice.toFixed(2)}</p>
                    )}
                    <p className="text-white font-medium">Sell: LKR {item.sellingPrice.toFixed(2)}</p>
                  </div>
                </TableCell>
                <TableCell>
                  {item.warrantyPeriod > 0 ? (
                    <div className="flex items-center gap-2 text-blue-400">
                      <ShieldCheck className="w-4 h-4" />
                      <span>{item.warrantyPeriod} Months</span>
                    </div>
                  ) : (
                    <span className="text-gray-500">None</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10"
                      onClick={() => onGenerateBarcode(item)}
                    >
                      <QrCode className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10"
                      onClick={() => onEdit(item)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                      onClick={() => onDelete(item)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
