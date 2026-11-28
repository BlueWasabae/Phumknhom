Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'

$outDir = 'e:\ភូមិខ្ញុំ\client\public\assets\khmer\landmarks'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$artDir = 'C:\Users\Asus ROG\.gemini\antigravity\brain\8d767ea0-9b80-410d-a253-bd2c3df06633'

function Clean-MagentaSprite {
  param(
    [string]$SrcPath,
    [string]$OutPath,
    [int]$MaxW,
    [int]$MaxH
  )
  $src = [System.Drawing.Bitmap]::new($SrcPath)
  $w = $src.Width
  $h = $src.Height
  $bmp = [System.Drawing.Bitmap]::new($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.DrawImage($src, 0, 0, $w, $h)
  $g.Dispose()
  $src.Dispose()

  $rect = [System.Drawing.Rectangle]::new(0, 0, $w, $h)
  $bd = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $bytes = [byte[]]::new([Math]::Abs($bd.Stride) * $h)
  [System.Runtime.InteropServices.Marshal]::Copy($bd.Scan0, $bytes, 0, $bytes.Length)
  $stride = [Math]::Abs($bd.Stride)

  $visited = [byte[]]::new($w * $h)
  $qx = [System.Collections.Generic.Queue[int]]::new()
  $qy = [System.Collections.Generic.Queue[int]]::new()

  $isMag = {
    param([int]$off)
    $b = $bytes[$off]; $gr = $bytes[$off + 1]; $r = $bytes[$off + 2]
    return ($r -gt 155 -and $b -gt 155 -and $gr -lt 125 -and ($r - $gr) -gt 65 -and ($b - $gr) -gt 65)
  }

  for ($x = 0; $x -lt $w; $x++) {
    foreach ($y in @(0, ($h - 1))) {
      $off = $y * $stride + $x * 4
      if (& $isMag $off) {
        $idx = $y * $w + $x
        if ($visited[$idx] -eq 0) { $visited[$idx] = 1; $qx.Enqueue($x); $qy.Enqueue($y) }
      }
    }
  }
  for ($y = 0; $y -lt $h; $y++) {
    foreach ($x in @(0, ($w - 1))) {
      $off = $y * $stride + $x * 4
      if (& $isMag $off) {
        $idx = $y * $w + $x
        if ($visited[$idx] -eq 0) { $visited[$idx] = 1; $qx.Enqueue($x); $qy.Enqueue($y) }
      }
    }
  }

  while ($qx.Count -gt 0) {
    $cx = $qx.Dequeue(); $cy = $qy.Dequeue()
    $off = $cy * $stride + $cx * 4
    $bytes[$off] = 0; $bytes[$off + 1] = 0; $bytes[$off + 2] = 0; $bytes[$off + 3] = 0
    if ($cx -gt 0) {
      $nidx = $cy * $w + ($cx - 1)
      if ($visited[$nidx] -eq 0 -and (& $isMag ($off - 4))) { $visited[$nidx] = 1; $qx.Enqueue($cx - 1); $qy.Enqueue($cy) }
    }
    if ($cx -lt ($w - 1)) {
      $nidx = $cy * $w + ($cx + 1)
      if ($visited[$nidx] -eq 0 -and (& $isMag ($off + 4))) { $visited[$nidx] = 1; $qx.Enqueue($cx + 1); $qy.Enqueue($cy) }
    }
    if ($cy -gt 0) {
      $nidx = ($cy - 1) * $w + $cx
      if ($visited[$nidx] -eq 0 -and (& $isMag ($off - $stride))) { $visited[$nidx] = 1; $qx.Enqueue($cx); $qy.Enqueue($cy - 1) }
    }
    if ($cy -lt ($h - 1)) {
      $nidx = ($cy + 1) * $w + $cx
      if ($visited[$nidx] -eq 0 -and (& $isMag ($off + $stride))) { $visited[$nidx] = 1; $qx.Enqueue($cx); $qy.Enqueue($cy + 1) }
    }
  }

  # Clear enclosed pure magenta holes (e.g., between boxing ropes/posts)
  for ($y = 0; $y -lt $h; $y++) {
    $row = $y * $stride
    for ($x = 0; $x -lt $w; $x++) {
      $off = $row + $x * 4
      if ($bytes[$off + 3] -gt 0 -and $bytes[$off + 2] -gt 200 -and $bytes[$off] -gt 200 -and $bytes[$off + 1] -lt 75) {
        $bytes[$off] = 0; $bytes[$off + 1] = 0; $bytes[$off + 2] = 0; $bytes[$off + 3] = 0
      }
    }
  }

  # 2-pass magenta fringe cleanup on edge pixels
  for ($pass = 0; $pass -lt 2; $pass++) {
    $clearList = [System.Collections.Generic.List[int]]::new()
    for ($y = 1; $y -lt ($h - 1); $y++) {
      $row = $y * $stride
      for ($x = 1; $x -lt ($w - 1); $x++) {
        $off = $row + $x * 4
        if ($bytes[$off + 3] -eq 0) { continue }
        $b = $bytes[$off]; $gr = $bytes[$off + 1]; $r = $bytes[$off + 2]
        if ($r -gt 120 -and $b -gt 120 -and ($r - $gr) -gt 36 -and ($b - $gr) -gt 36) {
          if ($bytes[$off - 4 + 3] -eq 0 -or $bytes[$off + 4 + 3] -eq 0 -or $bytes[$off - $stride + 3] -eq 0 -or $bytes[$off + $stride + 3] -eq 0) {
            $clearList.Add($off)
          }
        }
      }
    }
    foreach ($off in $clearList) {
      $bytes[$off] = 0; $bytes[$off + 1] = 0; $bytes[$off + 2] = 0; $bytes[$off + 3] = 0
    }
  }

  # Find tight non-transparent bounding box
  $minX = $w; $minY = $h; $maxX = -1; $maxY = -1
  for ($y = 0; $y -lt $h; $y++) {
    $row = $y * $stride
    for ($x = 0; $x -lt $w; $x++) {
      if ($bytes[$row + $x * 4 + 3] -gt 0) {
        if ($x -lt $minX) { $minX = $x }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }
  [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $bd.Scan0, $bytes.Length)
  $bmp.UnlockBits($bd)

  $cw = [Math]::Max(1, $maxX - $minX + 1)
  $ch = [Math]::Max(1, $maxY - $minY + 1)
  $scale = [Math]::Min($MaxW / $cw, $MaxH / $ch)
  $nw = [Math]::Max(16, [int][Math]::Round($cw * $scale))
  $nh = [Math]::Max(16, [int][Math]::Round($ch * $scale))

  $outBmp = [System.Drawing.Bitmap]::new($nw, $nh, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $og = [System.Drawing.Graphics]::FromImage($outBmp)
  $og.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $og.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $og.DrawImage($bmp, [System.Drawing.Rectangle]::new(0, 0, $nw, $nh), [System.Drawing.Rectangle]::new($minX, $minY, $cw, $ch), [System.Drawing.GraphicsUnit]::Pixel)
  $og.Dispose()
  $bmp.Dispose()

  # Crisp alpha threshold & magenta spill guard
  $orect = [System.Drawing.Rectangle]::new(0, 0, $nw, $nh)
  $obd = $outBmp.LockBits($orect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $obytes = [byte[]]::new([Math]::Abs($obd.Stride) * $nh)
  [System.Runtime.InteropServices.Marshal]::Copy($obd.Scan0, $obytes, 0, $obytes.Length)
  $ostride = [Math]::Abs($obd.Stride)
  for ($y = 0; $y -lt $nh; $y++) {
    $row = $y * $ostride
    for ($x = 0; $x -lt $nw; $x++) {
      $off = $row + $x * 4
      $b = $obytes[$off]; $gr = $obytes[$off + 1]; $r = $obytes[$off + 2]; $a = $obytes[$off + 3]
      if ($a -lt 115 -or ($r -gt 165 -and $b -gt 165 -and $gr -lt 85)) {
        $obytes[$off] = 0; $obytes[$off + 1] = 0; $obytes[$off + 2] = 0; $obytes[$off + 3] = 0
      } else {
        $obytes[$off + 3] = 255
      }
    }
  }
  [System.Runtime.InteropServices.Marshal]::Copy($obytes, 0, $obd.Scan0, $obytes.Length)
  $outBmp.UnlockBits($obd)
  $outBmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Host "Cleaned $([System.IO.Path]::GetFileName($OutPath)): ${nw}x${nh}"
  $outBmp.Dispose()
}

function Col([int]$r, [int]$g, [int]$b, [int]$a = 255) {
  return [System.Drawing.Color]::FromArgb($a, $r, $g, $b)
}

function New-PixelCanvas([int]$w, [int]$h) {
  $bmp = [System.Drawing.Bitmap]::new($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
  $g.Clear([System.Drawing.Color]::Transparent)
  return @{ bmp = $bmp; g = $g }
}

function Save-Pixel2x($canvas, [string]$name) {
  $canvas.g.Dispose()
  $src = $canvas.bmp
  $nw = $src.Width * 2; $nh = $src.Height * 2
  $out = [System.Drawing.Bitmap]::new($nw, $nh, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $og = [System.Drawing.Graphics]::FromImage($out)
  $og.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  $og.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
  $og.DrawImage($src, 0, 0, $nw, $nh)
  $og.Dispose(); $src.Dispose()
  $p = Join-Path $outDir $name
  $out.Save($p, [System.Drawing.Imaging.ImageFormat]::Png)
  $out.Dispose()
  Write-Host "Generated ${name}: ${nw}x${nh}"
}

function FillR($g, [int]$x, [int]$y, [int]$w, [int]$h, $c, $outC = $null) {
  $br = [System.Drawing.SolidBrush]::new($c)
  $g.FillRectangle($br, $x, $y, $w, $h)
  $br.Dispose()
  if ($null -ne $outC) {
    $pen = [System.Drawing.Pen]::new($outC, 1)
    $g.DrawRectangle($pen, $x, $y, $w - 1, $h - 1)
    $pen.Dispose()
  }
}

function FillE($g, [int]$x, [int]$y, [int]$w, [int]$h, $c, $outC = $null) {
  $br = [System.Drawing.SolidBrush]::new($c)
  $g.FillEllipse($br, $x, $y, $w, $h)
  $br.Dispose()
  if ($null -ne $outC) {
    $pen = [System.Drawing.Pen]::new($outC, 1)
    $g.DrawEllipse($pen, $x, $y, $w, $h)
    $pen.Dispose()
  }
}

function FillPoly($g, [int[]]$coords, $c, $outC = $null) {
  $pts = [System.Drawing.Point[]]::new($coords.Length / 2)
  for ($i = 0; $i -lt $pts.Length; $i++) {
    $pts[$i] = [System.Drawing.Point]::new($coords[$i * 2], $coords[$i * 2 + 1])
  }
  $br = [System.Drawing.SolidBrush]::new($c)
  $g.FillPolygon($br, $pts)
  $br.Dispose()
  if ($null -ne $outC) {
    $pen = [System.Drawing.Pen]::new($outC, 1)
    $g.DrawPolygon($pen, $pts)
    $pen.Dispose()
  }
}

function DrawL($g, [int]$x1, [int]$y1, [int]$x2, [int]$y2, $c, [int]$w = 1) {
  $pen = [System.Drawing.Pen]::new($c, $w)
  $g.DrawLine($pen, $x1, $y1, $x2, $y2)
  $pen.Dispose()
}

# 1. Clean 3 AI-generated 16-bit masterpieces
Clean-MagentaSprite (Join-Path $artDir 'cambodian_sampan_market_boat_1795886482998.jpg') (Join-Path $outDir 'khmer_sampan_boat.png') 148 92
Clean-MagentaSprite (Join-Path $artDir 'kun_khmer_sparring_ring_sprite_1795886479848.jpg') (Join-Path $outDir 'khmer_sparring_ring.png') 232 196
Clean-MagentaSprite (Join-Path $artDir 'sbek_thom_shadow_theater_sprite_1795886478814.jpg') (Join-Path $outDir 'khmer_sbek_thom_stage.png') 220 184

# 2. Angkor Sandstone Wild Boss Shrine (64x64 -> 128x128)
$c = New-PixelCanvas 64 64; $g = $c.g
$OUT = Col 28 22 18; $STD = Col 78 72 62; $STM = Col 124 114 96; $STL = Col 168 156 132; $STH = Col 206 194 166
$GD = Col 154 102 18; $GM = Col 224 168 34; $GL = Col 254 232 118; $MD = Col 44 98 42; $ML = Col 92 162 68
FillR $g 6 51 52 9 $STD $OUT; FillR $g 8 52 48 3 $STM
FillR $g 10 45 44 7 $STM $OUT; FillR $g 12 46 40 2 $STL
foreach ($sx in @(18, 32, 46)) { DrawL $g $sx 52 $sx 58 $OUT }
foreach ($sx in @(22, 42)) { DrawL $g $sx 46 $sx 50 $OUT }
FillR $g 13 21 38 25 $STM $OUT
FillR $g 14 22 7 23 $STL $OUT; FillR $g 43 22 7 23 $STL $OUT
FillR $g 15 23 2 21 $STH; FillR $g 44 23 2 21 $STH
foreach ($py in @(25, 40)) { FillR $g 14 $py 7 3 $GM $OUT; FillR $g 43 $py 7 3 $GM $OUT }
FillR $g 22 24 20 21 (Col 24 20 32) $OUT; FillR $g 24 26 16 17 (Col 42 34 58)
FillR $g 25 39 14 5 $GD $OUT; FillR $g 27 40 10 2 $GL
FillPoly $g @(32,26, 37,32, 32,39, 27,32) (Col 235 248 255) $OUT
FillPoly $g @(32,28, 35,32, 32,36, 29,32) (Col 255 255 255)
FillR $g 10 17 44 5 $GD $OUT; FillR $g 12 18 40 2 $GL
FillR $g 16 12 32 6 $STL $OUT; FillR $g 18 13 28 2 $STH
FillR $g 22 8 20 5 $GM $OUT; FillR $g 24 9 16 2 $GL
FillR $g 28 4 8 5 $GM $OUT; FillR $g 30 1 4 4 $GL $OUT
foreach ($nx in @(8, 51)) { FillR $g $nx 13 5 5 $GM $OUT; FillR $g ($nx + 1) 14 2 2 $GL }
foreach ($mp in @(@(11,46),@(48,46),@(47,52),@(14,34),@(46,30),@(19,14))) {
  FillR $g $mp[0] $mp[1] 4 3 $MD; FillR $g ($mp[0]+1) $mp[1] 2 2 $ML
}
Save-Pixel2x $c 'khmer_wild_shrine.png'

# 3. Folk Games Courtyard (156x100 -> 312x200)
$c = New-PixelCanvas 156 100; $g = $c.g
$OUT = Col 38 20 10; $BD = Col 112 62 24; $BM = Col 168 104 42; $BL = Col 218 162 74
$MA = Col 216 160 72; $MB = Col 196 138 54; $MC = Col 234 188 96; $RED = Col 206 38 44; $GOLD = Col 250 204 21; $CR = Col 252 240 206
FillR $g 8 22 140 72 (Col 46 26 12 150)
FillR $g 6 18 144 74 $BD $OUT
for ($x = 8; $x -lt 148; $x += 4) {
  $col = if ((($x / 4) % 2) -eq 0) { $RED } else { $CR }
  FillR $g $x 20 4 4 $col; FillR $g $x 86 4 4 $col
}
for ($y = 20; $y -lt 90; $y += 4) {
  $col = if ((($y / 4) % 2) -eq 0) { $RED } else { $CR }
  FillR $g 8 $y 4 4 $col; FillR $g 144 $y 4 4 $col
}
FillR $g 12 24 132 62 $MA $OUT
for ($y = 25; $y -lt 85; $y += 3) {
  $off = if ((([int]($y / 3)) % 2) -eq 0) { 3 } else { 0 }
  for ($x = 13; $x -lt 140; $x += 6) {
    FillR $g ($x + $off) $y 3 2 $MB
    if (($x + $off + 3) -lt 142) { FillR $g ($x + $off + 3) $y 2 1 $MC }
  }
}
FillE $g 64 42 28 26 (Col 182 122 46) $GOLD
FillE $g 69 47 18 16 (Col 208 146 62) $RED
# Left: Bos Angkunh tray + 5 seeds
FillR $g 19 54 38 20 $BD $OUT; FillR $g 21 56 34 16 (Col 146 84 34)
$seedXs = @(25, 31, 38, 45, 51)
for ($i = 0; $i -lt 5; $i++) {
  $sx = $seedXs[$i]; $sy = if ($i -eq 2) { 61 } else { 64 }
  FillE $g ($sx - 3) ($sy - 3) 6 6 (Col 74 30 12) $OUT
  FillR $g ($sx - 1) ($sy - 1) 2 2 (Col 214 148 92)
}
FillR $g 22 44 32 2 $CR
# Center: Veay K'aom Bamboo A-Frame + Hanging Terracotta Pot
DrawL $g 65 56 78 24 $OUT 4; DrawL $g 91 56 78 24 $OUT 4
DrawL $g 65 56 78 24 $BL 2; DrawL $g 91 56 78 24 $BL 2
DrawL $g 78 26 78 40 $CR 1
FillE $g 70 41 16 15 (Col 198 78 34) $OUT
FillR $g 74 38 8 4 (Col 162 58 24) $OUT
FillE $g 72 43 5 5 (Col 238 128 74)
DrawL $g 64 72 90 76 $OUT 4; DrawL $g 64 72 90 76 $BL 2
# Right: Teanh Prot tug-of-war rope + crimson silk ribbon
FillR $g 118 42 2 34 $CR
for ($rx = 98; $rx -lt 139; $rx += 3) {
  $rc = if ((([int]($rx / 3)) % 2) -eq 0) { Col 232 198 134 } else { Col 178 136 72 }
  FillR $g $rx 57 3 5 $rc $OUT
}
FillR $g 116 55 6 9 $RED $OUT
FillPoly $g @(116,64, 119,71, 122,64) $RED $OUT
FillR $g 118 57 2 4 $GOLD
# 4 Corner Bamboo Poles + Bunting Flags
foreach ($pp in @(@(6,6),@(144,6),@(6,72),@(144,72))) {
  FillR $g $pp[0] $pp[1] 6 20 $BM $OUT; FillR $g ($pp[0]+1) ($pp[1]+1) 2 18 $BL; FillR $g ($pp[0]-1) ($pp[1]-2) 8 4 $GOLD $OUT
}
DrawL $g 10 10 78 17 $OUT 2; DrawL $g 78 17 146 10 $OUT 2
$bCols = @((Col 220 38 38),(Col 250 204 21),(Col 37 99 235),(Col 22 163 74),(Col 236 72 153))
for ($i = 0; $i -lt 11; $i++) {
  $bx = 16 + $i * 12
  $by = 10 + [int][Math]::Round([Math]::Sin(($i / 10.0) * [Math]::PI) * 6)
  FillPoly $g @(($bx-5),$by, ($bx+5),$by, $bx,($by+9)) $bCols[$i % 5] $OUT
}
Save-Pixel2x $c 'khmer_folk_games_courtyard.png'

# 4. Village Pet Racing Starting Gate Archway (140x76 -> 280x152)
$c = New-PixelCanvas 140 76; $g = $c.g
$OUT = Col 34 18 10; $WD = Col 102 52 20; $WM = Col 154 84 34; $WL = Col 204 134 62
$GOLD = Col 250 204 21; $GD = Col 176 118 18; $RED = Col 214 42 46; $WH = Col 248 250 252; $DK = Col 24 28 38
FillR $g 16 54 108 18 (Col 214 174 108) $OUT
foreach ($lx in @(42, 70, 98)) { FillR $g $lx 56 2 14 $WH }
for ($cx = 20; $cx -lt 120; $cx += 6) {
  $cc = if ((([int]($cx / 6)) % 2) -eq 0) { $WH } else { $DK }
  FillR $g $cx 61 6 4 $cc
}
foreach ($px in @(12, 118)) {
  FillR $g $px 16 10 54 $WM $OUT; FillR $g ($px+2) 18 3 50 $WL; FillR $g ($px-1) 64 12 7 $WD $OUT
  FillR $g ($px-1) 11 12 6 $GOLD $OUT; FillPoly $g @(($px+5),3, ($px+1),11, ($px+9),11) $GOLD $OUT
}
FillR $g 10 16 120 22 $WD $OUT; FillR $g 12 18 116 3 $GOLD; FillR $g 12 34 116 2 $GD
FillR $g 22 22 96 11 $WH $OUT
for ($row = 0; $row -lt 2; $row++) {
  for ($col = 0; $col -lt 16; $col++) {
    if ((($row + $col) % 2) -eq 0) { FillR $g (23 + $col * 6) (23 + $row * 5) 6 5 $DK }
  }
}
FillE $g 62 19 16 16 $RED $GOLD
FillR $g 67 23 6 6 $GOLD $OUT; FillR $g 69 29 2 3 $GOLD; FillR $g 67 32 6 2 $GOLD
$fi = 0
for ($fx = 24; $fx -lt 118; $fx += 13) {
  $fc = if ($fi % 2 -eq 0) { $RED } else { $GOLD }
  FillPoly $g @($fx,8, ($fx+10),12, $fx,16) $fc $OUT
  $fi++
}
FillR $g 2 42 20 26 $WM $OUT; FillR $g 0 38 24 6 $RED $OUT; FillR $g 2 39 20 2 $GOLD
FillR $g 5 48 14 8 (Col 48 32 22) $OUT; FillR $g 3 55 18 3 $WL $OUT
Save-Pixel2x $c 'khmer_pet_race_gate.png'

# 5. Angkor Prasat Endless Pagoda Tower Gate (96x96 -> 192x192)
$c = New-PixelCanvas 96 96; $g = $c.g
$OUT = Col 28 20 16; $STD = Col 96 82 64; $STM = Col 146 128 100; $STL = Col 192 174 140; $STH = Col 224 208 174
$GD = Col 162 108 22; $GM = Col 232 176 36; $GL = Col 254 232 118; $MS = Col 72 134 58
FillR $g 10 82 76 10 $STD $OUT; FillR $g 14 76 68 7 $STM $OUT; FillR $g 16 77 64 2 $STL
FillR $g 14 34 68 43 $STM $OUT; FillR $g 16 36 14 39 $STL $OUT; FillR $g 66 36 14 39 $STL $OUT
foreach ($y in @(44, 54, 64)) { DrawL $g 16 $y 29 $y $STD; DrawL $g 66 $y 79 $y $STD }
FillR $g 17 37 3 37 $STH; FillR $g 67 37 3 37 $STH
FillR $g 31 38 34 38 (Col 26 14 48) $OUT
FillE $g 34 42 28 32 (Col 88 28 135) (Col 192 132 252)
FillE $g 38 46 20 24 (Col 147 51 234) (Col 233 213 255)
FillE $g 43 52 10 12 (Col 245 208 254)
FillR $g 47 56 3 4 (Col 255 255 255)
FillR $g 10 29 76 7 $GD $OUT; FillR $g 12 30 72 3 $GL
FillR $g 18 21 60 9 $STL $OUT; FillR $g 20 22 56 3 $STH
FillR $g 26 14 44 8 $GM $OUT; FillR $g 28 15 40 3 $GL
FillR $g 34 8 28 7 $STL $OUT; FillR $g 41 3 14 6 $GM $OUT
FillPoly $g @(48,0, 43,5, 53,5) $GL $OUT
foreach ($nx in @(6, 82)) {
  FillR $g $nx 24 8 7 $GM $OUT; FillR $g ($nx+2) 25 3 3 $GL
  FillR $g ($nx+2) 72 6 8 $STL $OUT; FillR $g ($nx+3) 73 3 3 $GL
}
foreach ($mp in @(@(18,40),@(72,48),@(22,24),@(66,22),@(16,78))) { FillR $g $mp[0] $mp[1] 5 3 $MS }
Save-Pixel2x $c 'khmer_pagoda_tower_gate.png'

# 6. Khleng Ek Kite Workshop Stall (80x76 -> 160x152)
$c = New-PixelCanvas 80 76; $g = $c.g
$OUT = Col 38 20 10; $BD = Col 108 60 22; $BM = Col 162 98 40; $BL = Col 214 154 70
$TD = Col 154 106 36; $TM = Col 204 154 56; $TL = Col 242 204 96; $RED = Col 220 38 38; $TEAL = Col 13 148 136; $GOLD = Col 250 204 21
FillR $g 10 36 6 34 $BM $OUT; FillR $g 64 36 6 34 $BM $OUT
FillR $g 12 48 56 22 $BD $OUT; FillR $g 14 50 52 4 $BL
foreach ($vx in @(26, 40, 54)) { DrawL $g $vx 54 $vx 69 $OUT }
FillR $g 22 43 6 6 (Col 248 240 214) $OUT; FillR $g 34 43 6 6 $RED $OUT; FillR $g 46 43 6 6 $GOLD $OUT; FillR $g 56 43 6 6 $TEAL $OUT
FillPoly $g @(4,38, 16,18, 64,18, 76,38) $TM $OUT
for ($rx = 10; $rx -lt 70; $rx += 6) {
  $dx = if ($rx -lt 40) { $rx - 3 } else { $rx + 3 }
  DrawL $g $rx 20 $dx 37 $TD
}
FillR $g 16 16 48 4 $TL $OUT
for ($x = 8; $x -lt 72; $x += 8) {
  $ec = if ((([int]($x / 8)) % 2) -eq 0) { $RED } else { $GOLD }
  FillR $g $x 36 6 4 $ec $OUT
}
FillPoly $g @(26,2, 12,13, 26,18, 40,13) $RED $OUT; FillPoly $g @(26,5, 18,12, 26,15, 34,12) $GOLD
DrawL $g 20 17 15 32 $GOLD 2; DrawL $g 32 17 36 32 $GOLD 2
FillPoly $g @(56,4, 44,14, 56,19, 68,14) $TEAL $OUT; FillPoly $g @(56,7, 50,13, 56,16, 62,13) $GOLD
DrawL $g 52 18 48 31 (Col 244 114 182) 2; DrawL $g 60 18 64 31 (Col 244 114 182) 2
Save-Pixel2x $c 'khmer_kite_stall.png'

# 7. Khmer Lotus & Jasmine Garden Bed (84x56 -> 168x112)
$c = New-PixelCanvas 84 56; $g = $c.g
$OUT = Col 24 42 20; $STD = Col 114 96 74; $STL = Col 168 148 118; $LFD = Col 24 96 42; $LFM = Col 44 148 62; $LFL = Col 94 196 86
FillE $g 3 7 78 44 $STD $OUT; FillE $g 6 10 72 38 $STL; FillE $g 9 13 66 32 $LFD $OUT
foreach ($tuft in @(@(20,24,18,13),@(36,20,20,14),@(54,22,20,14),@(64,28,16,12),@(24,34,18,12),@(44,33,22,14),@(60,35,16,12))) {
  FillE $g ($tuft[0]-$tuft[2]/2) ($tuft[1]-$tuft[3]/2) $tuft[2] $tuft[3] $LFM $LFD
  FillE $g ($tuft[0]-$tuft[2]/2+2) ($tuft[1]-$tuft[3]/2+1) ($tuft[2]-6) ($tuft[3]-4) $LFL
}
$blossoms = @(
  @(21,23,(Col 244 114 182),(Col 253 224 71)),
  @(41,19,(Col 250 204 21),(Col 255 251 235)),
  @(60,23,(Col 236 72 153),(Col 254 240 138)),
  @(31,34,(Col 251 146 60),(Col 254 249 195)),
  @(52,33,(Col 244 114 182),(Col 253 224 71))
)
foreach ($bl in $blossoms) {
  $bx = $bl[0]; $by = $bl[1]; $pet = $bl[2]; $core = $bl[3]
  foreach ($op in @(@(-3,0),@(3,0),@(0,-3),@(0,2))) { FillR $g ($bx+$op[0]-2) ($by+$op[1]-2) 5 4 $pet $OUT }
  FillR $g ($bx-2) ($by-2) 4 4 $core
}
Save-Pixel2x $c 'khmer_lotus_garden.png'

# 8. Mossy Red Laterite Boulder Outcrop (64x44 -> 128x88)
$c = New-PixelCanvas 64 44; $g = $c.g
$OUT = Col 42 18 10; $RD = Col 122 44 22; $RM = Col 176 74 34; $RL = Col 224 118 58; $MD = Col 44 102 42; $ML = Col 102 174 72
FillPoly $g @(8,34, 6,22, 16,10, 34,8, 48,16, 52,32, 38,38, 18,38) $RD $OUT
FillPoly $g @(12,26, 17,13, 33,11, 44,18, 44,28, 22,31) $RM
FillPoly $g @(18,16, 31,13, 38,18, 26,22) $RL
foreach ($pt in @(@(20,24),@(28,26),@(36,23),@(24,18),@(33,29))) { FillR $g $pt[0] $pt[1] 2 2 $OUT }
FillPoly $g @(42,36, 44,26, 54,24, 60,32, 56,39, 46,39) $RD $OUT
FillPoly $g @(46,32, 48,27, 54,26, 56,32) $RM; FillR $g 49 28 4 2 $RL
foreach ($mp in @(@(15,13),@(29,10),@(45,25))) { FillR $g $mp[0] $mp[1] 6 3 $MD; FillR $g ($mp[0]+1) $mp[1] 4 2 $ML }
Save-Pixel2x $c 'khmer_laterite_outcrop.png'

# 9. Floating Mekong River Market Teak Dock (160x48 -> 320x96)
$c = New-PixelCanvas 160 48; $g = $c.g
$OUT = Col 36 18 8; $WD = Col 96 48 18; $WM = Col 146 82 34; $WL = Col 196 126 58; $GOLD = Col 250 204 21; $LAN = Col 254 240 138
foreach ($px in @(12, 44, 76, 108, 140)) {
  FillR $g $px 34 8 12 $WD $OUT; FillR $g ($px+2) 36 2 8 $WM; FillR $g ($px-2) 43 12 2 (Col 186 230 253 210)
}
FillR $g 4 12 152 26 $WD $OUT
for ($x = 6; $x -lt 154; $x += 10) {
  $pc = if ((([int]($x / 10)) % 2) -eq 0) { $WM } else { Col 134 72 28 }
  FillR $g $x 14 9 22 $pc $OUT; FillR $g ($x+1) 15 7 2 $WL
  FillR $g ($x+4) 17 2 2 $OUT; FillR $g ($x+4) 32 2 2 $OUT
}
FillR $g 4 35 152 4 (Col 112 58 22) $OUT
foreach ($bx in @(10, 144)) {
  FillR $g $bx 2 6 18 $WD $OUT; FillR $g ($bx+1) 3 2 15 $WL
  FillR $g ($bx-2) 0 10 8 $GOLD $OUT; FillR $g $bx 2 6 4 $LAN
}
foreach ($rx in @(42, 112)) { FillE $g $rx 28 8 7 (Col 214 174 106) $OUT; FillE $g ($rx+2) 30 4 3 $WD }
Save-Pixel2x $c 'khmer_floating_dock.png'

# Verify all 11 PNGs have crisp transparent corners
$files = Get-ChildItem $outDir -Filter '*.png'
foreach ($f in $files) {
  $im = [System.Drawing.Bitmap]::new($f.FullName)
  $corners = @($im.GetPixel(0,0).A, $im.GetPixel($im.Width-1,0).A, $im.GetPixel(0,$im.Height-1).A, $im.GetPixel($im.Width-1,$im.Height-1).A)
  $im.Dispose()
  if (($corners | Where-Object { $_ -ne 0 }).Count -gt 0) {
    throw "Non-transparent corner in $($f.Name): $($corners -join ',')"
  }
}
Write-Host "VERIFIED ALL $($files.Count) KHMER LANDMARK SPRITES CLEAN!"
