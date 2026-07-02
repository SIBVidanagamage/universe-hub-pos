import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function InventoryForm({ item, setItem, isEditing = false }) {
  const handleInputChange = (e) => {
    const { id, value, type } = e.target;
    const parsedValue = type === 'number' ? (value ? parseFloat(value) : 0) : value;
    setItem(prev => ({ ...prev, [id]: parsedValue }));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name" className="text-gray-200">Product Name</Label>
          <Input
            id="name"
            value={item.name}
            onChange={handleInputChange}
            className="bg-white/10 border-white/20 text-white"
            required
          />
        </div>
        <div>
          <Label htmlFor="category" className="text-gray-200">Category</Label>
          <Input
            id="category"
            value={item.category}
            onChange={handleInputChange}
            className="bg-white/10 border-white/20 text-white"
            placeholder={item.productType === 'phone' ? 'Phones' : 'Example: Charger, Cable, Case'}
            required
          />
        </div>
      </div>

      {item.productType === 'phone' && (
        <div className="rounded-md border border-white/10 bg-white/5 p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phoneBrand" className="text-gray-200">Phone Brand</Label>
              <Input
                id="phoneBrand"
                value={item.phoneBrand || ''}
                onChange={handleInputChange}
                className="bg-white/10 border-white/20 text-white"
                placeholder="Apple, Samsung"
              />
            </div>
            <div>
              <Label htmlFor="phoneModel" className="text-gray-200">Phone Model</Label>
              <Input
                id="phoneModel"
                value={item.phoneModel || ''}
                onChange={handleInputChange}
                className="bg-white/10 border-white/20 text-white"
                placeholder="iPhone 13"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phoneColor" className="text-gray-200">Phone Color</Label>
              <Input
                id="phoneColor"
                value={item.phoneColor || ''}
                onChange={handleInputChange}
                className="bg-white/10 border-white/20 text-white"
                placeholder="Black"
              />
            </div>
            <div>
              <Label htmlFor="phoneStorage" className="text-gray-200">Phone Storage</Label>
              <Input
                id="phoneStorage"
                value={item.phoneStorage || ''}
                onChange={handleInputChange}
                className="bg-white/10 border-white/20 text-white"
                placeholder="128GB"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="phoneImei" className="text-gray-200">Phone IMEI</Label>
            <Input
              id="phoneImei"
              value={item.phoneImei || ''}
              onChange={handleInputChange}
              className="bg-white/10 border-white/20 text-white"
              placeholder="IMEI number"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="sku" className="text-gray-200">SKU (Auto-generated)</Label>
          <Input
            id="sku"
            value={item.sku}
            readOnly
            className="bg-white/5 border-white/10 text-gray-400 cursor-not-allowed"
          />
        </div>
        <div>
          <Label htmlFor="serialNumber" className="text-gray-200">Serial Number (Optional)</Label>
          <Input
            id="serialNumber"
            value={item.serialNumber || ''}
            onChange={handleInputChange}
            className="bg-white/10 border-white/20 text-white"
            placeholder="e.g. S/N 12345"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label htmlFor="supplier" className="text-gray-200">Supplier</Label>
          <Input
            id="supplier"
            value={item.supplier}
            onChange={handleInputChange}
            className="bg-white/10 border-white/20 text-white"
          />
        </div>
      </div>
      {item.productType !== 'phone' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="quantity" className="text-gray-200">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              value={item.quantity}
              onChange={handleInputChange}
              className="bg-white/10 border-white/20 text-white"
              required
            />
          </div>
          <div>
            <Label htmlFor="minStock" className="text-gray-200">Min Stock</Label>
            <Input
              id="minStock"
              type="number"
              value={item.minStock}
              onChange={handleInputChange}
              className="bg-white/10 border-white/20 text-white"
              required
            />
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="costPrice" className="text-gray-200">Cost Price</Label>
          <Input
            id="costPrice"
            type="number"
            step="0.01"
            value={item.costPrice}
            onChange={handleInputChange}
            className="bg-white/10 border-white/20 text-white"
            required
          />
        </div>
        <div>
          <Label htmlFor="sellingPrice" className="text-gray-200">Selling Price</Label>
          <Input
            id="sellingPrice"
            type="number"
            step="0.01"
            value={item.sellingPrice}
            onChange={handleInputChange}
            className="bg-white/10 border-white/20 text-white"
            required
          />
        </div>
      </div>
      <div>
        <Label htmlFor="warrantyPeriod" className="text-gray-200">Warranty Period (Months)</Label>
        <Input
          id="warrantyPeriod"
          type="number"
          value={item.warrantyPeriod}
          onChange={handleInputChange}
          className="bg-white/10 border-white/20 text-white"
          placeholder="0 for no warranty"
        />
      </div>
    </div>
  );
}
