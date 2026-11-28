Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'

$outDir = 'e:\ភូមិខ្ញុំ\client\public\assets\khmer\boss_vfx'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function Col([int]$r, [int]$g, [int]$b, [int]$a = 255) {
  return [System.Drawing.Color]::FromArgb([Math]::Max(0, [Math]::Min(255, $a)), [Math]::Max(0, [Math]::Min(255, $r)), [Math]::Max(0, [Math]::Min(255, $g)), [Math]::Max(0, [Math]::Min(255, $b)))
}

function New-Sheet([int]$fw, [int]$fh, [int]$frames) {
  $bmp = [System.Drawing.Bitmap]::new($fw * $frames, $fh, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
  $g.Clear([System.Drawing.Color]::Transparent)
  return @{ bmp = $bmp; g = $g; fw = $fw; fh = $fh; frames = $frames }
}

function Save-Sheet($sh, [string]$name) {
  $sh.g.Dispose()
  $p = Join-Path $outDir $name
  $sh.bmp.Save($p, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Host "Generated ${name}: $($sh.bmp.Width)x$($sh.bmp.Height) ($($sh.frames) frames of $($sh.fw)x$($sh.fh))"
  $sh.bmp.Dispose()
}

function Px($g, [int]$x, [int]$y, [int]$w, [int]$h, $c) {
  if ($w -le 0 -or $h -le 0) { return }
  $br = [System.Drawing.SolidBrush]::new($c)
  $g.FillRectangle($br, $x, $y, $w, $h)
  $br.Dispose()
}

function DrawArcBand($g, [int]$ox, [int]$cx, [int]$cy, [double]$rIn, [double]$rOut, [double]$aStart, [double]$aEnd, $c, [int]$stepPx = 2) {
  $br = [System.Drawing.SolidBrush]::new($c)
  $steps = 44
  for ($i = 0; $i -le $steps; $i++) {
    $t = $i / [double]$steps
    $ang = $aStart + ($aEnd - $aStart) * $t
    # Taper tips smoothly
    $taper = [Math]::Sin($t * [Math]::PI)
    $rMid = ($rIn + $rOut) * 0.5
    $halfThick = (($rOut - $rIn) * 0.5) * (0.2 + 0.8 * $taper)
    $cosA = [Math]::Cos($ang); $sinA = [Math]::Sin($ang)
    for ($r = ($rMid - $halfThick); $r -le ($rMid + $halfThick); $r += $stepPx) {
      $px = $ox + [int][Math]::Round($cx + $cosA * $r)
      $py = [int][Math]::Round($cy + $sinA * $r)
      $g.FillRectangle($br, $px - 1, $py - 1, 3, 3)
    }
  }
  $br.Dispose()
}

# 1. boss_fx_heavy_cleave.png — 8 frames x 96x72 (Sweeping golden-crimson giant boss slash arc!)
$sh = New-Sheet 96 72 8; $g = $sh.g
for ($f = 0; $f -lt 8; $f++) {
  $ox = $f * 96
  $cx = 30; $cy = 40
  if ($f -eq 0) {
    # Anticipation glint high overhead
    Px $g ($ox + 28) 6 4 14 (Col 255 251 235)
    Px $g ($ox + 23) 11 14 4 (Col 254 240 138)
    Px $g ($ox + 27) 10 6 6 (Col 255 255 255)
  } elseif ($f -le 5) {
    $p = ($f - 1) / 4.0
    $aHead = -1.75 + $p * 3.15
    $aTail = [Math]::Max(-1.95, $aHead - (1.2 + (1 - $p) * 0.65))
    $alpha = [int](255 * (1.0 - [Math]::Max(0, ($f - 3) * 0.22)))
    DrawArcBand $g $ox $cx $cy 24 54 $aTail $aHead (Col 220 38 38 ([int]($alpha * 0.85))) 2
    DrawArcBand $g $ox $cx $cy 32 52 $aTail $aHead (Col 251 146 60 $alpha) 2
    DrawArcBand $g $ox $cx $cy 40 50 ($aTail + 0.2) $aHead (Col 254 240 138 $alpha) 2
    DrawArcBand $g $ox $cx $cy 44 49 ($aTail + 0.45) $aHead (Col 255 255 255 $alpha) 2
    # Flying kinetic spark pixels off the blade edge
    for ($s = 0; $s -lt 6; $s++) {
      $sa = $aTail + ($aHead - $aTail) * ($s / 5.0)
      $sr = 52 + (($f + $s) % 3) * 4
      $sx = $ox + [int]($cx + [Math]::Cos($sa) * $sr)
      $sy = [int]($cy + [Math]::Sin($sa) * $sr)
      Px $g $sx $sy 3 3 (Col 254 249 195 $alpha)
    }
  } else {
    # Dissipating fiery after-sparks
    $alpha = if ($f -eq 6) { 170 } else { 85 }
    for ($s = 0; $s -lt 10; $s++) {
      $sa = -0.6 + $s * 0.22
      $sr = 36 + ($f - 5) * 8 + ($s % 3) * 5
      $sx = $ox + [int]($cx + [Math]::Cos($sa) * $sr)
      $sy = [int]($cy + [Math]::Sin($sa) * $sr)
      $col = if ($s % 2 -eq 0) { Col 254 240 138 $alpha } else { Col 239 68 68 $alpha }
      Px $g $sx $sy 4 3 $col
    }
  }
}
Save-Sheet $sh 'boss_fx_heavy_cleave.png'

# 2. boss_fx_crimson_whirl.png — 8 frames x 96x96 (360-degree spinning dual blade whirlwind!)
$sh = New-Sheet 96 96 8; $g = $sh.g
for ($f = 0; $f -lt 8; $f++) {
  $ox = $f * 96; $cx = 48; $cy = 48
  $baseA = $f * ([Math]::PI * 0.35)
  $alpha = if ($f -lt 6) { 245 } elseif ($f -eq 6) { 165 } else { 90 }
  for ($arm = 0; $arm -lt 2; $arm++) {
    $a0 = $baseA + $arm * [Math]::PI
    $a1 = $a0 + 2.15
    DrawArcBand $g $ox $cx $cy 20 42 $a0 $a1 (Col 225 29 72 ([int]($alpha * 0.8))) 2
    DrawArcBand $g $ox $cx $cy 28 40 ($a0 + 0.25) $a1 (Col 250 204 21 $alpha) 2
    DrawArcBand $g $ox $cx $cy 34 39 ($a0 + 0.55) $a1 (Col 255 255 255 $alpha) 2
  }
  # Orbiting slash sparks
  for ($s = 0; $s -lt 6; $s++) {
    $sa = $baseA + $s * 1.05
    $sx = $ox + [int]($cx + [Math]::Cos($sa) * 43)
    $sy = [int]($cy + [Math]::Sin($sa) * 43)
    Px $g $sx $sy 3 3 (Col 254 240 138 $alpha)
  }
}
Save-Sheet $sh 'boss_fx_crimson_whirl.png'

# 3. boss_fx_lightning_axe_spin.png — 6 frames x 64x64 (Spinning Golden Phkak Axe + Crackling Thunder!)
$sh = New-Sheet 64 64 6; $g = $sh.g
for ($f = 0; $f -lt 6; $f++) {
  $ox = $f * 64; $cx = 32; $cy = 32
  $ang = $f * ([Math]::PI / 3.0)
  # Spinning golden-cyan motion blur ring
  DrawArcBand $g $ox $cx $cy 16 27 ($ang - 1.4) ($ang + 0.3) (Col 56 189 248 165) 2
  DrawArcBand $g $ox $cx $cy 19 26 ($ang - 0.8) ($ang + 0.4) (Col 250 204 21 230) 2
  # Rotating Khmer Phkak handle & curved axe head
  $cA = [Math]::Cos($ang); $sA = [Math]::Sin($ang)
  for ($d = -20; $d -le 20; $d += 2) {
    $hx = $ox + [int]($cx + $cA * $d)
    $hy = [int]($cy + $sA * $d)
    Px $g ($hx - 2) ($hy - 2) 4 4 (Col 146 64 14 255)
    Px $g ($hx - 1) ($hy - 1) 2 2 (Col 250 204 21 255)
  }
  # Golden curved blade tip
  $bx = $ox + [int]($cx + $cA * 17)
  $by = [int]($cy + $sA * 17)
  $nx = -$sA; $ny = $cA
  for ($k = -7; $k -le 7; $k += 2) {
    $px = $bx + [int]($nx * $k)
    $py = $by + [int]($ny * $k)
    Px $g ($px - 3) ($py - 3) 6 6 (Col 250 204 21 255)
    Px $g ($px - 1) ($py - 1) 3 3 (Col 255 255 255 255)
  }
  # Crackling electric sparks around perimeter
  for ($s = 0; $s -lt 4; $s++) {
    $sa = $ang + $s * 1.57 + 0.4
    $sx = $ox + [int]($cx + [Math]::Cos($sa) * 26)
    $sy = [int]($cy + [Math]::Sin($sa) * 26)
    Px $g $sx $sy 4 2 (Col 186 230 253 240)
    Px $g ($sx + 1) ($sy - 2) 2 5 (Col 255 255 255 240)
  }
}
Save-Sheet $sh 'boss_fx_lightning_axe_spin.png'

# 4. boss_fx_venom_whip.png — 7 frames x 128x48 (Snapping animated lash / tongue / whip extension!)
$sh = New-Sheet 128 48 7; $g = $sh.g
for ($f = 0; $f -lt 7; $f++) {
  $ox = $f * 128
  $reach = if ($f -eq 0) { 36 } elseif ($f -eq 1) { 82 } elseif ($f -le 4) { 118 } elseif ($f -eq 5) { 86 } else { 42 }
  $alpha = if ($f -le 4) { 250 } elseif ($f -eq 5) { 190 } else { 110 }
  $amp = if ($f -le 2) { 10.0 } elseif ($f -le 4) { 5.0 } else { 3.0 }
  for ($x = 4; $x -le $reach; $x += 2) {
    $t = $x / [double]$reach
    $wave = [Math]::Sin($t * [Math]::PI * 2.5 - $f * 1.1) * $amp * (1.0 - $t * 0.35)
    $y = 24 + [int][Math]::Round($wave)
    $thick = if ($t -gt 0.85) { 12 } else { [int](10 - $t * 4) }
    Px $g ($ox + $x) ($y - [int]($thick/2) - 1) 4 ($thick + 2) (Col 131 24 67 $alpha)
    Px $g ($ox + $x) ($y - [int]($thick/2)) 4 $thick (Col 244 114 182 $alpha)
    Px $g ($ox + $x) ($y - 2) 4 3 (Col 253 230 242 $alpha)
  }
  # Snapping tip burst & droplets at peak extension
  if ($f -ge 2 -and $f -le 5) {
    $tx = $ox + $reach
    Px $g ($tx - 4) 16 10 16 (Col 255 255 255 $alpha)
    Px $g ($tx - 8) 12 4 4 (Col 254 240 138 $alpha)
    Px $g ($tx - 6) 32 4 4 (Col 134 239 172 $alpha)
  }
}
Save-Sheet $sh 'boss_fx_venom_whip.png'

# 5. boss_fx_crystal_beam.png — 6 frames x 64x128 (Crackling prismatic vertical lightning/crystal beam!)
$sh = New-Sheet 64 128 6; $g = $sh.g
for ($f = 0; $f -lt 6; $f++) {
  $ox = $f * 64
  $pulse = [Math]::Sin(($f / 5.0) * [Math]::PI)
  $wOuter = [int](26 + $pulse * 18)
  $wMid = [int](14 + $pulse * 10)
  $wCore = [int](6 + $pulse * 4)
  $alpha = if ($f -lt 5) { 235 } else { 130 }
  Px $g ($ox + 32 - [int]($wOuter/2)) 0 $wOuter 128 (Col 56 189 248 ([int]($alpha * 0.55)))
  Px $g ($ox + 32 - [int]($wMid/2)) 0 $wMid 128 (Col 232 121 249 ([int]($alpha * 0.85)))
  Px $g ($ox + 32 - [int]($wCore/2)) 0 $wCore 128 (Col 255 255 255 $alpha)
  # Animated jagged lightning side arcs zig-zagging down the beam!
  $prevX = 32
  for ($y = 4; $y -lt 124; $y += 10) {
    $zig = [int]([Math]::Sin($y * 0.14 + $f * 2.1) * 16)
    $nx = 32 + $zig
    $minX = [Math]::Min($prevX, $nx); $span = [Math]::Abs($nx - $prevX) + 3
    Px $g ($ox + $minX) $y $span 3 (Col 254 249 195 $alpha)
    Px $g ($ox + $nx - 1) $y 3 10 (Col 255 255 255 $alpha)
    $prevX = $nx
  }
  # Ground impact energy flare at bottom of beam
  Px $g ($ox + 8) 114 48 12 (Col 56 189 248 ([int]($alpha * 0.75)))
  Px $g ($ox + 16) 118 32 8 (Col 255 255 255 $alpha)
}
Save-Sheet $sh 'boss_fx_crystal_beam.png'

# 6. boss_fx_ground_fissure.png — 7 frames x 96x64 (Cracking stone/magma eruption burst!)
$sh = New-Sheet 96 64 7; $g = $sh.g
for ($f = 0; $f -lt 7; $f++) {
  $ox = $f * 96
  $grow = if ($f -le 3) { ($f + 1) / 4.0 } else { 1.0 - (($f - 3) / 4.0) * 0.75 }
  $alpha = if ($f -le 4) { 255 } elseif ($f -eq 5) { 185 } else { 100 }
  # Glowing ground fissure crack base
  $crackW = [int](30 + $grow * 58)
  Px $g ($ox + 48 - [int]($crackW/2)) 54 $crackW 8 (Col 234 88 12 ([int]($alpha * 0.85)))
  Px $g ($ox + 48 - [int]($crackW/2) + 6) 56 ([Math]::Max(8, $crackW - 12)) 4 (Col 254 240 138 $alpha)
  # 5 jagged erupting energy/rock spikes bursting upward!
  $spikeSpecs = @(@(22,26), @(35,40), @(48,52), @(61,38), @(74,24))
  foreach ($sp in $spikeSpecs) {
    $sx = $sp[0]; $maxH = $sp[1]
    $h = [int]($maxH * $grow)
    for ($row = 0; $row -lt $h; $row += 3) {
      $frac = $row / [double][Math]::Max(1, $h)
      $w = [Math]::Max(3, [int]((1.0 - $frac) * 14))
      $py = 56 - $row
      Px $g ($ox + $sx - [int]($w/2) - 1) $py ($w + 2) 4 (Col 69 26 3 $alpha)
      $spCol = if ($frac -gt 0.55) { Col 254 240 138 $alpha } else { Col 239 68 68 $alpha }
      Px $g ($ox + $sx - [int]($w/2)) $py $w 3 $spCol
    }
  }
  # Rising debris chunks
  for ($d = 0; $d -lt 6; $d++) {
    $dx = $ox + 16 + $d * 13 + (($f * 5 + $d) % 7) - 3
    $dy = 48 - $f * 6 - ($d % 3) * 8
    if ($dy -gt 2) { Px $g $dx $dy 4 4 (Col 253 186 116 $alpha) }
  }
}
Save-Sheet $sh 'boss_fx_ground_fissure.png'

# 7. boss_fx_windup_charge.png — 6 frames x 64x64 (Inward-converging Khmer rune charge & glint!)
$sh = New-Sheet 64 64 6; $g = $sh.g
for ($f = 0; $f -lt 6; $f++) {
  $ox = $f * 64; $cx = 32; $cy = 32
  $t = $f / 5.0
  $rOuter = [int](28 - $t * 16)
  $rot = $f * 0.55
  # Converging pixel star sparks pulled toward center
  for ($i = 0; $i -lt 8; $i++) {
    $a = $rot + $i * ([Math]::PI / 4.0)
    $px = $ox + [int]($cx + [Math]::Cos($a) * $rOuter)
    $py = [int]($cy + [Math]::Sin($a) * $rOuter)
    Px $g ($px - 2) ($py - 2) 4 4 (Col 254 240 138 235)
    Px $g ($px - 1) ($py - 1) 2 2 (Col 255 255 255 255)
  }
  # Growing central glint cross at peak charge!
  $cross = [int](6 + $t * 20)
  Px $g ($ox + $cx - [int]($cross/2)) ($cy - 2) $cross 4 (Col 250 204 21 240)
  Px $g ($ox + $cx - 2) ($cy - [int]($cross/2)) 4 $cross (Col 250 204 21 240)
  Px $g ($ox + $cx - [int]($cross/3)) ($cy - 1) ([int]($cross * 0.66)) 2 (Col 255 255 255 255)
  Px $g ($ox + $cx - 1) ($cy - [int]($cross/3)) 2 ([int]($cross * 0.66)) (Col 255 255 255 255)
}
Save-Sheet $sh 'boss_fx_windup_charge.png'

# 8. boss_fx_dash_trail.png — 6 frames x 96x48 (Kinetic horizontal wind-cut & afterimage speed streaks!)
$sh = New-Sheet 96 48 6; $g = $sh.g
for ($f = 0; $f -lt 6; $f++) {
  $ox = $f * 96
  $alpha = [int](245 - $f * 36)
  $shift = $f * 8
  $rows = @(@(8, 54, 4), @(16, 78, 6), @(25, 86, 5), @(34, 62, 4), @(40, 38, 3))
  foreach ($r in $rows) {
    $ry = $r[0]; $rw = [Math]::Max(8, $r[1] - $f * 9); $rh = $r[2]
    $rx = $ox + [Math]::Min(86, 6 + $shift)
    Px $g $rx $ry $rw $rh (Col 250 204 21 ([int]($alpha * 0.72)))
    Px $g ($rx + 6) ($ry + 1) ([Math]::Max(4, $rw - 10)) ([Math]::Max(2, $rh - 2)) (Col 255 255 255 $alpha)
  }
}
Save-Sheet $sh 'boss_fx_dash_trail.png'

Write-Host "ALL 8 MULTI-FRAME BOSS COMBAT VFX SPRITESHEETS GENERATED!"
