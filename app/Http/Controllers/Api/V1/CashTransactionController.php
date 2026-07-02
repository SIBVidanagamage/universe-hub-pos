<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CashTransaction;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Rule;

class CashTransactionController extends Controller
{
    public function index(Request $request)
    {
        $date = $request->query('date');
        $month = $request->query('month');
        $type = $request->query('type');

        $transactions = CashTransaction::with('user:id,name,role')
            ->when($date, fn ($query) => $query->whereDate('created_at', $date))
            ->when(!$date && $month, function ($query) use ($month) {
                [$year, $monthNumber] = array_map('intval', explode('-', $month));
                $query->whereYear('created_at', $year)->whereMonth('created_at', $monthNumber);
            })
            ->when($type && in_array($type, ['cash_in', 'cash_out'], true), fn ($query) => $query->where('type', $type))
            ->latest()
            ->get();

        return response()->json([
            'transactions' => $transactions,
            'summary' => $this->summary($date, $month),
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        if (!in_array($user?->role, ['admin', 'cashier'], true)) {
            abort(403, 'You are not allowed to record cash transactions.');
        }

        $validated = $request->validate([
            'type' => ['required', Rule::in(['cash_in', 'cash_out'])],
            'amount' => 'required|numeric|min:0.01',
            'reason' => [
                Rule::requiredIf(fn () => $request->input('type') === 'cash_out'),
                'nullable',
                'string',
                'max:255',
            ],
            'notes' => 'nullable|string|max:2000',
        ]);

        if ($user->role === 'cashier' && $validated['type'] !== 'cash_out') {
            throw ValidationException::withMessages([
                'type' => ['Cashiers can record cash out entries only.'],
            ]);
        }

        $transaction = CashTransaction::create([
            'user_id' => $user->id,
            'type' => $validated['type'],
            'amount' => $validated['amount'],
            'reason' => $validated['reason'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json(
            $transaction->load('user:id,name,role'),
            201
        );
    }

    private function summary(?string $date, ?string $month): array
    {
        $baseQuery = CashTransaction::query()
            ->when($date, fn ($query) => $query->whereDate('created_at', $date))
            ->when(!$date && $month, function ($query) use ($month) {
                [$year, $monthNumber] = array_map('intval', explode('-', $month));
                $query->whereYear('created_at', $year)->whereMonth('created_at', $monthNumber);
            });

        $cashIn = (clone $baseQuery)->where('type', 'cash_in')->sum('amount');
        $cashOut = (clone $baseQuery)->where('type', 'cash_out')->sum('amount');

        return [
            'cash_in' => (float) $cashIn,
            'cash_out' => (float) $cashOut,
            'net_cash' => (float) ($cashIn - $cashOut),
            'transactions_count' => (clone $baseQuery)->count(),
        ];
    }
}
