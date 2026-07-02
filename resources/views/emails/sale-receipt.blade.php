<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice #{{ $sale->id }}</title>
</head>
<body style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
    <h2 style="margin-bottom: 4px;">UNIVERSE HUB</h2>
    <p style="margin-top: 0;">188/8 C, High Level Road, Maharagama<br>Phone: 074-021-9239</p>

    <h3>Invoice #{{ $sale->id }}</h3>
    <p>
        <strong>Date:</strong> {{ $sale->created_at->format('Y-m-d h:i A') }}<br>
        <strong>Customer:</strong> {{ $sale->customer_name }}<br>
        @if($sale->customer_phone)
            <strong>Phone:</strong> {{ $sale->customer_phone }}<br>
        @endif
        <strong>Cashier:</strong> {{ $sale->user?->name ?? 'Staff' }}<br>
        <strong>Payment:</strong> {{ ucfirst($sale->payment_method) }}
    </p>

    <table width="100%" cellpadding="8" cellspacing="0" border="1" style="border-collapse: collapse; border-color: #d1d5db;">
        <thead>
            <tr style="background: #f3f4f6;">
                <th align="left">Item</th>
                <th align="right">Qty</th>
                <th align="right">Price</th>
                <th align="right">Discount</th>
                <th align="right">Total</th>
                <th align="left">Warranty</th>
            </tr>
        </thead>
        <tbody>
            @foreach($sale->items as $item)
                @php
                    $itemTotal = ($item->price_at_sale * $item->quantity) - (($item->discount ?? 0) * $item->quantity);
                @endphp
                <tr>
                    <td>
                        {{ $item->saleable?->name ?? 'Item' }}
                        @if($item->saleable?->serial_number)
                            <br><small>S/N: {{ $item->saleable->serial_number }}</small>
                        @endif
                    </td>
                    <td align="right">{{ $item->quantity }}</td>
                    <td align="right">LKR {{ number_format((float) $item->price_at_sale, 2) }}</td>
                    <td align="right">LKR {{ number_format((float) ($item->discount ?? 0), 2) }}</td>
                    <td align="right">LKR {{ number_format((float) $itemTotal, 2) }}</td>
                    <td>
                        @if(!empty($item->sold_item_codes))
                            <div><strong>Unit:</strong> {{ implode(', ', $item->sold_item_codes) }}</div>
                        @endif
                        @if($item->warranty_months > 0)
                            {{ $item->warranty_months }} month(s), valid until {{ $item->warranty_expires_at }}
                        @else
                            No warranty
                        @endif
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <p align="right">
        <strong>Subtotal:</strong> LKR {{ number_format((float) $sale->subtotal, 2) }}<br>
        <strong>Discount:</strong> LKR {{ number_format((float) $sale->discount, 2) }}<br>
        <strong>Grand Total:</strong> LKR {{ number_format((float) $sale->total, 2) }}
    </p>

    <p>Keep this email for warranty claims. Thank you for shopping with Universe Hub.</p>
</body>
</html>
