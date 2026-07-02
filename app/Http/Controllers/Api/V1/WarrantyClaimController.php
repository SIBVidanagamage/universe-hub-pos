<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\SaleItem;
use App\Models\WarrantyClaim;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class WarrantyClaimController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->query('search');

        return WarrantyClaim::with([
            'sale:id,customer_id,customer_name,customer_email,customer_phone,total,created_at',
            'saleItem.saleable',
            'replacementProduct:id,name,sku,quantity',
            'customer:id,name,email,phone',
            'handler:id,name',
        ])
            ->when($search, function ($query) use ($search) {
                $query->where('claim_number', 'like', "%{$search}%")
                    ->orWhereHas('sale', function ($saleQuery) use ($search) {
                        $saleQuery->where('id', $search)
                            ->orWhere('customer_name', 'like', "%{$search}%")
                            ->orWhere('customer_email', 'like', "%{$search}%")
                            ->orWhere('customer_phone', 'like', "%{$search}%");
                    });
            })
            ->latest()
            ->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'sale_item_id' => 'required|integer|exists:sale_items,id',
            'claimed_item_code' => 'nullable|string|max:255',
            'replacement_product_id' => 'required|integer|exists:products,id',
            'issue_description' => 'required|string|max:2000',
        ]);

        $saleItem = SaleItem::with(['sale.customer', 'saleable'])->findOrFail($validated['sale_item_id']);

        if ((int) $saleItem->warranty_months <= 0 || !$saleItem->warranty_expires_at) {
            return response()->json(['message' => 'This item does not have warranty coverage.'], 422);
        }

        if (now()->toDateString() > $saleItem->warranty_expires_at) {
            return response()->json(['message' => 'This item warranty has expired.'], 422);
        }

        $soldItemCodes = $saleItem->sold_item_codes ?? [];
        $claimedItemCode = trim((string) ($validated['claimed_item_code'] ?? ''));

        if (!empty($soldItemCodes)) {
            if ($claimedItemCode === '') {
                return response()->json(['message' => 'Select the exact sold unit code for this warranty claim.'], 422);
            }

            if (!in_array($claimedItemCode, $soldItemCodes, true)) {
                return response()->json(['message' => 'This unit code was not sold on the selected invoice.'], 422);
            }
        }

        $claim = DB::transaction(function () use ($saleItem, $validated, $claimedItemCode) {
            $replacementProduct = Product::lockForUpdate()->findOrFail($validated['replacement_product_id']);

            if ($replacementProduct->quantity < 1) {
                throw ValidationException::withMessages([
                    'replacement_product_id' => "No replacement stock available for {$replacementProduct->name}.",
                ]);
            }

            $replacementProduct->decrement('quantity');

            return WarrantyClaim::create([
                'sale_id' => $saleItem->sale_id,
                'sale_item_id' => $saleItem->id,
                'customer_id' => $saleItem->sale->customer_id,
                'handled_by' => Auth::id(),
                'claim_number' => $this->nextClaimNumber(),
                'claimed_item_code' => $claimedItemCode ?: null,
                'replacement_product_id' => $replacementProduct->id,
                'replacement_quantity' => 1,
                'replacement_stock_deducted_at' => now(),
                'status' => 'open',
                'issue_description' => $validated['issue_description'],
            ]);
        });

        return response()->json(
            $claim->load(['sale', 'saleItem.saleable', 'replacementProduct:id,name,sku,quantity', 'customer', 'handler:id,name']),
            201
        );
    }

    public function update(Request $request, int $warranty_claim)
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(['open', 'in_progress', 'resolved', 'rejected'])],
            'resolution_notes' => 'nullable|string|max:2000',
        ]);

        $warrantyClaim = DB::transaction(function () use ($warranty_claim, $validated) {
            $claim = WarrantyClaim::with('saleItem.saleable')->lockForUpdate()->findOrFail($warranty_claim);

            $claim->fill([
                'status' => $validated['status'],
                'resolution_notes' => $validated['resolution_notes'] ?? $claim->resolution_notes,
                'handled_by' => Auth::id(),
                'resolved_at' => in_array($validated['status'], ['resolved', 'rejected'], true) ? now() : null,
            ])->save();

            return $claim;
        });

        return response()->json(
            $warrantyClaim->load(['sale', 'saleItem.saleable', 'replacementProduct:id,name,sku,quantity', 'customer', 'handler:id,name'])
        );
    }

    public function returnStock(int $warranty_claim)
    {
        $warrantyClaim = DB::transaction(function () use ($warranty_claim) {
            $claim = WarrantyClaim::with('saleItem.saleable')->lockForUpdate()->findOrFail($warranty_claim);

            if ($claim->returned_stock_added_at) {
                throw ValidationException::withMessages([
                    'claim' => 'Returned item has already been added back to stock.',
                ]);
            }

            $saleable = $claim->saleItem->saleable;

            if (!$saleable instanceof Product) {
                throw ValidationException::withMessages([
                    'claim' => 'Only product warranty claims can be returned to stock.',
                ]);
            }

            $saleable->increment('quantity');

            $claim->forceFill([
                'returned_stock_added_at' => now(),
                'handled_by' => Auth::id(),
            ])->save();

            return $claim;
        });

        return response()->json(
            $warrantyClaim->load(['sale', 'saleItem.saleable', 'replacementProduct:id,name,sku,quantity', 'customer', 'handler:id,name'])
        );
    }

    private function nextClaimNumber(): string
    {
        $nextId = ((int) WarrantyClaim::max('id')) + 1;

        return 'WC-' . now()->format('Ymd') . '-' . str_pad((string) $nextId, 5, '0', STR_PAD_LEFT);
    }
}
