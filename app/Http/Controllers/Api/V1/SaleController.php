<?php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Bundle;
use App\Mail\SaleReceiptMail;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class SaleController extends Controller
{
    public function index()
    {
        // Eager load related data for efficiency
        return Sale::with(['user:id,name', 'customer', 'items.saleable'])->latest()->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customerName'        => 'nullable|string|max:255',
            'customerEmail'       => 'nullable|email|max:255',
            'customerPhone'       => 'nullable|string|max:30',
            'sendEmailReceipt'    => 'nullable|boolean',
            'paymentCash'         => 'nullable|numeric|min:0',
            'paymentCard'         => 'nullable|numeric|min:0',
            'paymentTransfer'     => 'nullable|numeric|min:0',
            'paymentKoko'         => 'nullable|numeric|min:0',
            'exchangeValue'       => 'nullable|numeric|min:0',
            'exchangePhoneBrand'  => 'nullable|string|max:255',
            'exchangePhoneModel'  => 'nullable|string|max:255',
            'exchangePhoneColor'  => 'nullable|string|max:255',
            'exchangePhoneImei'   => 'nullable|string|max:255',
            'exchangePhoneStorage'=> 'nullable|string|max:255',
            'cart'                => 'required|array|min:1',
            'cart.*.id'           => 'required|integer',
            'cart.*.type'         => 'required|string|in:product,bundle',
            'cart.*.quantity'     => 'required|integer|min:1',
            'cart.*.sellingPrice' => 'required|numeric',
            'cart.*.discount'     => 'required|numeric|min:0', // Validate discount per item
            'cart.*.itemCodes'    => 'nullable|array',
            'cart.*.itemCodes.*'  => 'nullable|string|max:255',
        ]);

        $sale = null;

        DB::transaction(function () use ($validated, &$sale) {
            $customerName = $validated['customerName'] ?? 'Walk-in Customer';
            $customerEmail = $validated['customerEmail'] ?? null;
            $customerPhone = $validated['customerPhone'] ?? null;
            $customer = null;

            if ($customerEmail || $customerPhone) {
                $customer = null;
                
                if ($customerEmail) {
                    $customer = Customer::where('email', $customerEmail)->first();
                }
                
                if (!$customer && $customerPhone) {
                    $customer = Customer::where('phone', $customerPhone)->first();
                }

                if ($customer) {
                    if ($customerName && $customerName !== 'Walk-in Customer') {
                        $customer->name = $customerName;
                    }
                    if ($customerEmail && !$customer->email) {
                        $customer->email = $customerEmail;
                    }
                    if ($customerPhone && !$customer->phone) {
                        $customer->phone = $customerPhone;
                    }
                    $customer->save();
                } else {
                    $customer = Customer::create([
                        'name' => $customerName,
                        'email' => $customerEmail,
                        'phone' => $customerPhone,
                    ]);
                }
            }

            // 1. Create the main Sale record
            $sale = Sale::create([
                'user_id'        => Auth::id(),
                'customer_id'    => $customer?->id,
                'customer_name'  => $customerName,
                'customer_email' => $customerEmail,
                'customer_phone' => $customerPhone,
                'payment_method' => null, // Deprecated, using split payments
                'payment_cash'   => $validated['paymentCash'] ?? 0,
                'payment_card'   => $validated['paymentCard'] ?? 0,
                'payment_transfer'=> $validated['paymentTransfer'] ?? 0,
                'payment_koko'   => $validated['paymentKoko'] ?? 0,
                'subtotal'       => 0,
                'discount'       => 0, // Will be calculated from items
                'exchange_value' => $validated['exchangeValue'] ?? 0,
                'exchange_phone_brand' => $validated['exchangePhoneBrand'] ?? null,
                'exchange_phone_model' => $validated['exchangePhoneModel'] ?? null,
                'exchange_phone_color' => $validated['exchangePhoneColor'] ?? null,
                'exchange_phone_imei' => $validated['exchangePhoneImei'] ?? null,
                'exchange_phone_storage' => $validated['exchangePhoneStorage'] ?? null,
                'tax'            => 0,
                'total'          => 0,
                'profit'         => 0,
            ]);

            $subtotal      = 0;
            $totalProfit   = 0;
            $totalDiscount = 0;
            $saleUnitCodes = [];
            $existingSoldUnitCodes = SaleItem::query()
                ->whereNotNull('sold_item_codes')
                ->get(['sold_item_codes'])
                ->flatMap(fn (SaleItem $saleItem) => $saleItem->sold_item_codes ?? [])
                ->all();

            // 2. Process each item in the cart
            foreach ($validated['cart'] as $item) {
                $saleable         = null;
                $itemDiscount     = $item['discount'] ?? 0;
                $itemSellingPrice = $item['sellingPrice'];
                $rawSoldItemCodes = collect($item['itemCodes'] ?? [])
                    ->map(fn ($code) => trim((string) $code))
                    ->filter()
                    ->values();
                $soldItemCodes = $rawSoldItemCodes->unique()->values()->all();

                if ($rawSoldItemCodes->count() !== count($soldItemCodes)) {
                    throw new \Exception("Duplicate unit barcode/serial numbers are not allowed in one bill.");
                }

                if ($item['type'] === 'product') {
                    $product  = Product::findOrFail($item['id']);
                    $saleable = $product;

                    if ($product->quantity < $item['quantity']) {
                        throw new \Exception("Insufficient stock for {$product->name}.");
                    }
                    $product->decrement('quantity', $item['quantity']);

                    // Profit for a single product is its selling price minus cost price.
                    // The discount is subtracted from this profit.
                    $profitPerUnit = $product->selling_price - $product->cost_price;
                    $totalProfit += $profitPerUnit * $item['quantity'];

                    if ((int) $product->warranty_period_months > 0 && count($soldItemCodes) !== (int) $item['quantity']) {
                        throw new \Exception("Enter one unit barcode/serial number for each {$product->name} warranty item.");
                    }

                } elseif ($item['type'] === 'bundle') {
                    $bundle   = Bundle::with('products')->findOrFail($item['id']);
                    $saleable = $bundle;

                    $bundleTotalCost = 0;
                    foreach ($bundle->products as $product) {
                        if ($product->quantity < $item['quantity']) {
                            throw new \Exception("Insufficient stock for {$product->name} in bundle {$bundle->name}.");
                        }
                        $product->decrement('quantity', $item['quantity']);
                        $bundleTotalCost += $product->cost_price;
                    }

                    // Profit for a bundle is its selling price minus the total cost of its contents.
                    $profitPerBundle = $bundle->price - $bundleTotalCost;
                    $totalProfit += $profitPerBundle * $item['quantity'];
                }

                foreach ($soldItemCodes as $soldItemCode) {
                    if (in_array($soldItemCode, $saleUnitCodes, true)) {
                        throw new \Exception("Unit barcode/serial {$soldItemCode} is repeated in this bill.");
                    }

                    if (in_array($soldItemCode, $existingSoldUnitCodes, true)) {
                        throw new \Exception("Unit barcode/serial {$soldItemCode} has already been sold on another invoice.");
                    }

                    $saleUnitCodes[] = $soldItemCode;
                }

                $warrantyMonths = $saleable instanceof Product ? (int) $saleable->warranty_period_months : 0;

                // 3. Create the SaleItem record with the discount
                $sale->items()->create([
                    'saleable_id'         => $saleable->id,
                    'saleable_type'       => get_class($saleable),
                    'quantity'            => $item['quantity'],
                    'price_at_sale'       => $itemSellingPrice,
                    'discount'            => $itemDiscount, // Store the per-item discount
                    'warranty_months'     => $warrantyMonths,
                    'warranty_expires_at' => $warrantyMonths > 0 ? now()->addMonths($warrantyMonths)->toDateString() : null,
                    'sold_item_codes'     => $soldItemCodes,
                ]);

                $subtotal += $itemSellingPrice * $item['quantity'];
                $totalDiscount += $itemDiscount * $item['quantity'];
            }

            // 4. Update the final totals on the Sale record
            $tax = 0;
            $exchangeValue = $validated['exchangeValue'] ?? 0;
            // The grand total is the subtotal minus discounts and exchange phone value.
            $total = max(0, $subtotal - $totalDiscount - $exchangeValue);
            // Treat the exchange phone value as a sale reduction for profit reporting.
            $finalProfit = $totalProfit - $totalDiscount - $exchangeValue;

            $sale->update([
                'subtotal' => $subtotal,
                'discount' => $totalDiscount,
                'exchange_value' => $exchangeValue,
                'tax'      => $tax,
                'total'    => $total,
                'profit'   => $finalProfit,
            ]);

            // Award loyalty points to customer (1 point per 100 LKR spent)
            if ($customer) {
                $pointsEarned = floor($total / 100);
                $customer->increment('loyalty_points', $pointsEarned);
            }

            // Load the relations for the response
            $sale->load(['user:id,name', 'customer', 'items.saleable']);
        });

        if (($validated['sendEmailReceipt'] ?? true) && $sale->customer_email) {
            try {
                Mail::to($sale->customer_email)->send(new SaleReceiptMail($sale));
                $sale->forceFill([
                    'receipt_emailed_at' => now(),
                    'receipt_email_error' => null,
                ])->save();
            } catch (\Throwable $exception) {
                $sale->forceFill([
                    'receipt_email_error' => $exception->getMessage(),
                ])->save();
            }

            $sale->refresh()->load(['user:id,name', 'customer', 'items.saleable']);
        }

        return response()->json($sale, 201);
    }

    public function stats()
    {
        $today        = now()->startOfDay();
        $startOfMonth = now()->startOfMonth();

        $todaysRevenue    = Sale::where('created_at', '>=', $today)->sum('total');
        $todaysSalesCount = Sale::where('created_at', '>=', $today)->count();

        $monthlyRevenue = Sale::where('created_at', '>=', $startOfMonth)->sum('total');

        // This remains all-time profit unless you specify otherwise
        $totalProfit = Sale::sum('profit');

        // Sales for the last 30 days (for the chart)
        $last30DaysSales = Sale::selectRaw('DATE(created_at) as date, SUM(total) as revenue, COUNT(id) as count')
            ->where('created_at', '>=', now()->subDays(30))
            ->groupBy('date')
            ->orderBy('date', 'asc')
            ->get();

        return response()->json([
            'todaysRevenue'    => $todaysRevenue,
            'todaysSalesCount' => $todaysSalesCount,
            'monthlyRevenue'   => $monthlyRevenue,
            'totalProfit'      => $totalProfit,
            'chartData'        => $last30DaysSales,
        ]);
    }


    public function destroy(Sale $sale)
    {
        DB::transaction(function () use ($sale) {
            // Iterate through each item in the sale and restock it
            foreach ($sale->items as $item) {
                $saleable = $item->saleable; // This gets the underlying Product or Bundle

                if ($saleable instanceof Product) {
                    // If it's a single product, increment its quantity
                    $saleable->increment('quantity', $item->quantity);
                } elseif ($saleable instanceof Bundle) {
                    // If it's a bundle, increment the quantity for each product within the bundle
                    foreach ($saleable->products as $productInBundle) {
                        $productInBundle->increment('quantity', $item->quantity);
                    }
                }
            }

            // After restocking, delete the sale record
            $sale->delete();
        });

        return response()->noContent(); // Return a 204 No Content success response
    }
}
