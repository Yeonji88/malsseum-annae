$ErrorActionPreference = 'Stop'
$previewRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'dist'))
$previewListener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 4173)
$previewListener.Start()
Write-Output 'Local: http://127.0.0.1:4173'
try {
  while ($true) {
    $previewClient = $previewListener.AcceptTcpClient()
    try {
      $previewClient.ReceiveTimeout = 3000
      $previewStream = $previewClient.GetStream()
      $previewReader = [System.IO.StreamReader]::new($previewStream)
      $previewRequest = $previewReader.ReadLine()
      if (!$previewRequest) { continue }
      while ($previewReader.ReadLine()) {}
      $previewRoute = ($previewRequest.Split(' ')[1]).Split('?')[0]
      $previewFiles = @{'/'='index.html';'/index.html'='index.html';'/styles.css'='styles.css';'/data/topics.js'='data/topics.js';'/data/verses.js'='data/verses.js';'/data/reflections.js'='data/reflections.js';'/services/classifyConcern.js'='services/classifyConcern.js';'/services/findCandidates.js'='services/findCandidates.js';'/services/selectVerse.js'='services/selectVerse.js';'/services/recommendationHistory.js'='services/recommendationHistory.js';'/app.js'='app.js'}
      if ($previewFiles.ContainsKey($previewRoute)) {
        $previewFile = Join-Path $previewRoot $previewFiles[$previewRoute]
        $previewBody = [System.IO.File]::ReadAllBytes($previewFile)
        $previewType = switch ([System.IO.Path]::GetExtension($previewFile)) { '.css' {'text/css'} '.js' {'text/javascript'} default {'text/html'} }
        $previewStatus = '200 OK'
      } else {
        $previewBody = [System.Text.Encoding]::UTF8.GetBytes('Not found')
        $previewType = 'text/plain'
        $previewStatus = '404 Not Found'
      }
      $previewHeader = [System.Text.Encoding]::ASCII.GetBytes("HTTP/1.1 $previewStatus`r`nContent-Type: $previewType; charset=utf-8`r`nContent-Length: $($previewBody.Length)`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n")
      $previewStream.Write($previewHeader,0,$previewHeader.Length)
      $previewStream.Write($previewBody,0,$previewBody.Length)
    } catch { Write-Warning 'Preview request could not be completed.' } finally { $previewClient.Dispose() }
  }
} finally { $previewListener.Stop() }
