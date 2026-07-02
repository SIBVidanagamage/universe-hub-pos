<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
        .container { background-color: #ffffff; max-width: 600px; margin: 0 auto; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background-color: #1e293b; color: #ffffff; padding: 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px 20px; color: #333333; line-height: 1.6; }
        .footer { background-color: #f8fafc; color: #64748b; padding: 15px; text-align: center; font-size: 12px; border-top: 1px solid #e2e8f0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Universe Hub</h1>
        </div>
        @if(isset($imagePath) && $imagePath)
        <div style="text-align: center; padding: 20px 20px 0 20px; background-color: #ffffff;">
            <img src="{{ $message->embed($imagePath) }}" style="max-width: 100%; height: auto; border-radius: 8px;" alt="Promotion Image">
        </div>
        @endif
        <div class="content">
            {!! nl2br(e($messageBody)) !!}
        </div>
        <div class="footer">
            <p>Thank you for being a valued customer at Universe Hub.</p>
            <p>&copy; {{ date('Y') }} Universe Hub. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
