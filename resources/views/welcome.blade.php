<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>UNIVERSE HUB</title>
    <script type="text/javascript" src="{{ asset('js/qz-tray.js') }}"></script>
    <link rel="icon" href="{{ asset('favicon.ico') }}" type="image/x-icon">

    @viteReactRefresh
    @vite(['resources/js/index.css', 'resources/js/main.jsx'])
</head>

<body>
    <div id="root"></div>
</body>

</html>
