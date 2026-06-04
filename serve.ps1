# FingerMagic - PowerShell Local Server
# Run this script to serve the site at http://localhost:3456

$port = 3456
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host ""
Write-Host "  ✨ FingerMagic Server Running!" -ForegroundColor Cyan
Write-Host "  ─────────────────────────────────" -ForegroundColor DarkGray
Write-Host "  Open in Chrome: http://localhost:$port" -ForegroundColor Green
Write-Host "  Press Ctrl+C to stop the server." -ForegroundColor Yellow
Write-Host ""

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".ico"  = "image/x-icon"
    ".json" = "application/json"
    ".wasm" = "application/wasm"
}

# Open browser automatically
Start-Process "http://localhost:$port"

try {
    while ($listener.IsListening) {
        $context  = $listener.GetContext()
        $request  = $context.Request
        $response = $context.Response

        $localPath = $request.Url.LocalPath
        if ($localPath -eq "/") { $localPath = "/index.html" }

        $filePath = Join-Path $root $localPath.TrimStart("/").Replace("/", "\")

        if (Test-Path $filePath -PathType Leaf) {
            $ext  = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
            $bytes = [System.IO.File]::ReadAllBytes($filePath)

            $response.ContentType   = $mime
            $response.ContentLength64 = $bytes.Length
            $response.Headers.Add("Cache-Control", "no-cache")
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            Write-Host "  [200] $localPath" -ForegroundColor DarkGreen
        } else {
            $response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $localPath")
            $response.OutputStream.Write($msg, 0, $msg.Length)
            Write-Host "  [404] $localPath" -ForegroundColor DarkRed
        }

        $response.OutputStream.Close()
    }
} finally {
    $listener.Stop()
    Write-Host ""
    Write-Host "  Server stopped." -ForegroundColor Yellow
}
