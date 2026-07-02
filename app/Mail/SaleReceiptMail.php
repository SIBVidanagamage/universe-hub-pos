<?php

namespace App\Mail;

use App\Models\Sale;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class SaleReceiptMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Sale $sale)
    {
    }

    public function build()
    {
        return $this
            ->subject('Universe Hub Invoice #' . $this->sale->id)
            ->view('emails.sale-receipt');
    }
}
