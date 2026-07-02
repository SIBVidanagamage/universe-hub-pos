<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>UNIVERSE HUB</title>
    @viteReactRefresh
    @vite(['resources/js/index.css', 'resources/js/main.jsx'])
</head>
<body>
    <!-- This div is where React will mount -->
    <div id="root"></div>

    <!-- Include React's compiled JS -->

</body>
</html>
