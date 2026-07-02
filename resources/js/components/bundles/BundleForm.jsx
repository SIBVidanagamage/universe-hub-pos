import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";


export function BundleForm({ bundle, setBundle, allProducts }) {
    const [open, setOpen] = React.useState(false);

    const handleSelectProduct = (product) => {
        const selectedIds = bundle.product_ids || [];
        if (selectedIds.includes(product.id)) {
            // Deselect
            setBundle(prev => ({ ...prev, product_ids: selectedIds.filter(id => id !== product.id) }));
        } else {
            // Select
            setBundle(prev => ({ ...prev, product_ids: [...selectedIds, product.id] }));
        }
    };

    return (
        <div className="space-y-4">
            <div>
                <Label htmlFor="name" className="text-gray-200">Bundle Name</Label>
                <Input id="name" value={bundle.name} onChange={(e) => setBundle(prev => ({ ...prev, name: e.target.value }))} required className="bg-white/10 border-white/20 text-white" />
            </div>
            <div>
                <Label htmlFor="price" className="text-gray-200">Bundle Price (LKR)</Label>
                <Input id="price" type="number" step="0.01" value={bundle.price} onChange={(e) => setBundle(prev => ({ ...prev, price: e.target.value }))} required className="bg-white/10 border-white/20 text-white" />
            </div>
            <div>
                <Label className="text-gray-200">Select Products</Label>
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white">
                            {bundle.product_ids?.length > 0 ? `${bundle.product_ids.length} products selected` : "Select products..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-slate-800 border-white/20 text-white">
                        <Command>
                            <CommandInput placeholder="Search products..." className="text-white" />
                            <CommandEmpty>No product found.</CommandEmpty>
                            <CommandGroup className="max-h-60 overflow-auto">
                                {allProducts.map((product) => (
                                    <CommandItem key={product.id} onSelect={() => handleSelectProduct(product)} className="hover:bg-white/10">
                                        <Check className={cn("mr-2 h-4 w-4", bundle.product_ids?.includes(product.id) ? "opacity-100" : "opacity-0")} />
                                        {product.name}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
            {bundle.product_ids?.length > 0 && (
                <div className="space-y-2">
                    <Label className="text-gray-200">Selected Products:</Label>
                    <div className="flex flex-wrap gap-2">
                        {allProducts.filter(p => bundle.product_ids.includes(p.id)).map(p => (
                            <div key={p.id} className="flex items-center gap-1 bg-secondary text-secondary-foreground rounded-full px-2 py-1 text-xs">
                                {p.name}
                                <button onClick={() => handleSelectProduct(p)} className="rounded-full hover:bg-muted"><X className="h-3 w-3" /></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
