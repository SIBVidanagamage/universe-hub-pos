<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class PromotionMail extends Mailable
{
    use Queueable, SerializesModels;

    public $subjectLine;
    public $messageBody;
    public $imagePath;

    public function __construct($subjectLine, $messageBody, $imagePath = null)
    {
        $this->subjectLine = $subjectLine;
        $this->messageBody = $messageBody;
        $this->imagePath = $imagePath;
    }

    public function build()
    {
        return $this->subject($this->subjectLine)
                    ->view('emails.promotion');
    }
}
