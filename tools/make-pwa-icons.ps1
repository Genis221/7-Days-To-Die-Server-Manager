Add-Type -AssemblyName System.Drawing

function New-AppIcon {
  param(
    [Parameter(Mandatory)][int]$Size,
    [Parameter(Mandatory)][string]$Path
  )
  $bmp = New-Object System.Drawing.Bitmap $Size, $Size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = "AntiAlias"
  $g.Clear([System.Drawing.Color]::FromArgb(255, 20, 8, 4))
  $ember = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 196, 60, 26))
  $gold = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 240, 194, 122))
  $panel = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 42, 24, 16))
  $bar = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 138, 58, 28))
  $cx = $Size / 2.0
  $cy = $Size * 0.40
  $r = $Size * 0.19
  $g.FillEllipse($ember, [float]($cx - $r), [float]($cy - $r), [float](2 * $r), [float](2 * $r))
  $r2 = $r * 0.55
  $g.FillEllipse($gold, [float]($cx - $r2), [float]($cy - $r2), [float](2 * $r2), [float](2 * $r2))
  $y = [int]($Size * 0.66)
  $h = [int]($Size * 0.22)
  $x = [int]($Size * 0.125)
  $w = [int]($Size * 0.75)
  $g.FillRectangle($panel, $x, $y, $w, $h)
  $g.FillRectangle($bar, $x + [int]($Size * 0.06), $y + [int]($h * 0.28), $w - [int]($Size * 0.12), [int]($h * 0.22))
  $fontSize = [Math]::Max(8, [int]($Size * 0.11))
  $font = New-Object System.Drawing.Font "Arial Black", $fontSize, ([System.Drawing.FontStyle]::Bold)
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = "Center"
  $sf.LineAlignment = "Near"
  $g.DrawString("DAY 7", $font, $gold, (New-Object System.Drawing.RectangleF 0, ($y + $h * 0.45), $Size, $h), $sf)
  $g.Dispose()
  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  $font.Dispose()
  $ember.Dispose()
  $gold.Dispose()
  $panel.Dispose()
  $bar.Dispose()
}

$root = Split-Path -Parent $PSScriptRoot
$dir = Join-Path $root "public\icons"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
New-AppIcon -Size 192 -Path (Join-Path $dir "icon-192.png")
New-AppIcon -Size 512 -Path (Join-Path $dir "icon-512.png")
New-AppIcon -Size 180 -Path (Join-Path $dir "apple-touch-icon.png")
Get-ChildItem $dir | ForEach-Object { "{0} {1}" -f $_.Name, $_.Length }
