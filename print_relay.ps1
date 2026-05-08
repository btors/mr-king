$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://*:9101/print/")
$listener.Start()
Write-Host "🚀 Micro-Relay de Impresión USB (PowerShell) activo en puerto 9101"
try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        if ($request.HttpMethod -eq "POST") {
            $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
            $body = $reader.ReadToEnd()
            $tempFile = [System.IO.Path]::GetTempFileName()
            [System.IO.File]::WriteAllText($tempFile, $body, [System.Text.Encoding]::UTF8)
            cmd.exe /c "copy /B `"$tempFile`" `"\localhost\Caja_Printer`""
            Remove-Item $tempFile -Force
            $buffer = [System.Text.Encoding]::UTF8.GetBytes("Success")
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        }
        $response.Close()
    }
} finally { $listener.Stop() }
