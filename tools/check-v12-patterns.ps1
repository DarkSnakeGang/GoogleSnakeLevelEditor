# Assert Level Editor alterSnakeCode fingerprints still match game snake.js
# Usage:
#   .\tools\check-v12-patterns.ps1
#   .\tools\check-v12-patterns.ps1 -Version current
#   .\tools\check-v12-patterns.ps1 -SnakeJsPath C:\path\to\snake.js

param(
  [string]$Version = "current",
  [string]$SnakeJsPath = "",
  [string]$CacheDir = ""
)

$ErrorActionPreference = "Stop"

if (-not $CacheDir) {
  $CacheDir = Join-Path $env:TEMP "gsm-level-editor-snake-cache"
}
New-Item -ItemType Directory -Force -Path $CacheDir | Out-Null

if (-not $SnakeJsPath) {
  $SnakeJsPath = Join-Path $CacheDir "snake_$Version.js"
  $url = "https://raw.githubusercontent.com/DarkSnakeGang/GoogleSnakeModsWebsite/main/v/$Version/snake.js"
  Write-Host "Downloading $url"
  Invoke-WebRequest -Uri $url -OutFile $SnakeJsPath -UseBasicParsing
}

$code = [IO.File]::ReadAllText($SnakeJsPath)
Write-Host ("Loaded snake.js ({0} bytes) from {1}" -f $code.Length, $SnakeJsPath)

function Test-Pattern {
  param(
    [string]$Name,
    [string]$Pattern,
    [int]$Min = 1,
    [int]$Max = 2147483647,
    [switch]$Multiline
  )
  $opts = [System.Text.RegularExpressions.RegexOptions]::None
  if ($Multiline) { $opts = $opts -bor [System.Text.RegularExpressions.RegexOptions]::Multiline }
  $rx = [regex]::new($Pattern, $opts)
  $count = $rx.Matches($code).Count
  $ok = ($count -ge $Min) -and ($count -le $Max)
  $status = if ($ok) { "OK" } else { "FAIL" }
  Write-Host ("[{0}] {1}: count={2} (expected {3}..{4})" -f $status, $Name, $count, $Min, $Max)
  return $ok
}

$checks = @(
  @{ Name = "tileWidth_fillRect"; Pattern = '[a-z]\.[$a-zA-Z0-9_]{0,8}\.fillRect\([a-z]\*[a-z]\.[$a-zA-Z0-9_]{0,8}\.([$a-zA-Z0-9_]{0,8}\.[$a-zA-Z0-9_]{0,8}),'; Min = 1; Max = 1 },
  @{ Name = "applePosSpeed"; Pattern = '&&\([$a-zA-Z0-9_]{0,8}\.[$a-zA-Z0-9_]{0,8}\.x&&\([$a-zA-Z0-9_]{0,8}\.([$a-zA-Z0-9_]{0,8})\.x\+=[$a-zA-Z0-9_]{0,8}\.([$a-zA-Z0-9_]{0,8})\.x\),'; Min = 1; Max = 1 },
  @{ Name = "bodyArray_directionLEFT"; Pattern = '([$a-zA-Z0-9_]{0,8}\.[$a-zA-Z0-9_]{0,8})\[0\]\.clone\(\),this\.[$a-zA-Z0-9_]{0,8}\.[$a-zA-Z0-9_]{0,8}\.direction==="LEFT"'; Min = 1; Max = 1 },
  @{ Name = "makeApple_-5_-4"; Pattern = 'this\.[$a-zA-Z0-9_]{0,8}\.push\(([$a-zA-Z0-9_]{0,8})\(this,\n?-5,-4\)\)'; Min = 1; Max = 1; Multiline = $true },
  @{ Name = "appleArray_-6_-3"; Pattern = 'this\.([$a-zA-Z0-9_]{0,8})\.push\([$a-zA-Z0-9_]{0,8}\(this,\n?-6,-3\)\)'; Min = 1; Max = 1; Multiline = $true },
  @{ Name = "appleArrayHolder_reset"; Pattern = 'this\.([$a-zA-Z0-9_]{0,8})\.reset\(\);this\.[$a-zA-Z0-9_]{0,8}=!1;'; Min = 1; Max = 3 },
  @{ Name = "coordConstructor_1_1"; Pattern = 'new (_\.[$a-zA-Z0-9_]{0,8})\(1,1\)'; Min = 1; Max = 5 },
  @{ Name = "boardDimensions"; Pattern = 'x===Math.floor\([a-z]\.[$a-zA-Z0-9_]{0,8}\.([$a-zA-Z0-9_]{0,8}\.[$a-zA-Z0-9_]{0,8})\.width\/2\)&&'; Min = 1; Max = 1 },
  @{ Name = "modeCheck_settings_6"; Pattern = '([$a-zA-Z0-9_]{0,8})\(this\.([$a-zA-Z0-9_]{0,8}),6\)'; Min = 1; Max = 20 },
  @{ Name = "modeCheck_f7_def"; Pattern = '[$a-zA-Z0-9_]{0,8}=function\(a,b\)\{return a\.([$a-zA-Z0-9_]{0,8})\?a\.([$a-zA-Z0-9_]{0,8})\.has\(b\):a\.([$a-zA-Z0-9_]{0,8})===22&&a\.([$a-zA-Z0-9_]{0,8})\.has\(b\)\?!0:a\.[$a-zA-Z0-9_]{0,8}===b\}'; Min = 1; Max = 1 },
  @{ Name = "board_reset_speed_case"; Pattern = 'case 1:a=\.66'; Min = 1; Max = 1 },
  @{ Name = "board_reset_method"; Pattern = 'reset\(\)\{this\.[$a-zA-Z0-9_]{0,8}=null;this\.[$a-zA-Z0-9_]{0,8}\.reset\(\)'; Min = 1; Max = 1 },
  @{ Name = "afterReset_end"; Pattern = '[$a-zA-Z0-9_]{0,8}\([a-z]\.[$a-zA-Z0-9_]{0,8}\)&&\([a-z]\.[$a-zA-Z0-9_]{0,8}\.[$a-zA-Z0-9_]{0,8}=!0\)\)'; Min = 1; Max = 3 },
  @{ Name = "resetState_class"; Pattern = 'resetState\(a=!0\)\{this\.[$a-zA-Z0-9_]{0,8}\.reset\(a\);'; Min = 1; Max = 1 },
  @{ Name = "wallDetailsContainer"; Pattern = '[$a-zA-Z0-9_]{0,8}&&\([$a-zA-Z0-9_]{0,8}\(this\.([$a-zA-Z0-9_]{0,8}),\n?[$a-zA-Z0-9_]{0,8}\),\n?[$a-zA-Z0-9_]{0,8}\(this\.[$a-zA-Z0-9_]{0,8},7\)'; Min = 1; Max = 1; Multiline = $true },
  @{ Name = "real_wall_object"; Pattern = '([$a-zA-Z0-9_]{0,8})\([a-z],[a-z],\{([$a-zA-Z0-9_]{0,8}):[a-z],([$a-zA-Z0-9_]{0,8}):!0,([$a-zA-Z0-9_]{0,8}):!1,([$a-zA-Z0-9_]{0,8}):!'; Min = 1; Max = 2 },
  @{ Name = "placeWall_IcF_body"; Pattern = '[$a-zA-Z0-9_]{0,8}\([a-z],[a-z],\{[$a-zA-Z0-9_]{0,8}:[a-z],[$a-zA-Z0-9_]{0,8}:!0,[$a-zA-Z0-9_]{0,8}:!1,\n?[$a-zA-Z0-9_]{0,8}:![$a-zA-Z0-9_]{0,8}\([a-z]\.[$a-zA-Z0-9_]{0,8},\n?11\)\}'; Min = 1; Max = 1; Multiline = $true },
  @{ Name = "soko_container"; Pattern = 'this\.([$a-zA-Z0-9_]{0,8})\.reset\(\);if\([$a-zA-Z0-9_]{0,8}\(this\.[$a-zA-Z0-9_]{0,8},8\)'; Min = 1; Max = 1 },
  @{ Name = "addSokobox"; Pattern = '([$a-zA-Z0-9_]{0,8})\([a-z],\{([$a-zA-Z0-9_]{0,8}):[a-z],\n?([$a-zA-Z0-9_]{0,8}):null,([$a-zA-Z0-9_]{0,8}):!0,([$a-zA-Z0-9_]{0,8}):[a-z]\}'; Min = 1; Max = 2; Multiline = $true },
  @{ Name = "sokoboxSet_mode16"; Pattern = '[a-z]\.([$a-zA-Z0-9_]{0,8})\.add\([a-z]\);[$a-zA-Z0-9_]{0,8}\([a-z]\.settings,16\)'; Min = 1; Max = 1 },
  @{ Name = "sokogoalSet"; Pattern = '[$a-zA-Z0-9_]{0,8}\([a-z]\.[$a-zA-Z0-9_]{0,8},\n?7\)&&[a-z]\.([$a-zA-Z0-9_]{0,8})\.add\([$a-zA-Z0-9_]{0,8}\([a-z]\.[$a-zA-Z0-9_]{0,8},\n?[a-z]\)\),'; Min = 1; Max = 1; Multiline = $true },
  @{ Name = "snakeStart_width4"; Pattern = 'this\.[$a-zA-Z0-9_]{0,8}\.push\(new _\.[$a-zA-Z0-9_]{0,8}\(Math\.floor\(this\.[$a-zA-Z0-9_]{0,8}\.[$a-zA-Z0-9_]{0,8}\.width\/4\),Math\.floor\(this\.[$a-zA-Z0-9_]{0,8}\.[$a-zA-Z0-9_]{0,8}\.height\/2\)\)\)'; Min = 1; Max = 4 },
  @{ Name = "changeSetting_case_apple"; Pattern = 'case "apple":[a-z]\.[$a-zA-Z0-9_]{0,8}\.[$a-zA-Z0-9_]{0,8}=[a-z];break;'; Min = 1; Max = 1 },
  @{ Name = "changeSetting_fn"; Pattern = '[$a-zA-Z0-9_]{0,8}=function\(a,b,c,d=-1\)\{'; Min = 1; Max = 5 },
  @{ Name = "menu_isVisible"; Pattern = 'if\(this\.([$a-zA-Z0-9_]{0,8})\.isVisible\(\)\|\|this\.[$a-zA-Z0-9_]{0,8}\.[$a-zA-Z0-9_]{0,8}\)'; Min = 1; Max = 5 },
  @{ Name = "fullReset_Ma"; Pattern = '([a-zA-Z0-9_$]{1,8})\(\)\{if\(this\.menu\.isVisible\(\)\|\|this\.[$a-zA-Z0-9_]{0,8}\.[$a-zA-Z0-9_]{0,8}\)\{if\(this\.settings\.'; Min = 1; Max = 1 }
)

$failed = 0
foreach ($c in $checks) {
  $params = @{
    Name = $c.Name
    Pattern = $c.Pattern
    Min = $c.Min
    Max = $c.Max
  }
  if ($c.ContainsKey("Multiline") -and $c.Multiline) { $params.Multiline = $true }
  if (-not (Test-Pattern @params)) { $failed++ }
}

# Static checks against modloadercode.js
$modPath = Join-Path (Split-Path $PSScriptRoot -Parent) "modloadercode.js"
if (-not (Test-Path $modPath)) {
  $modPath = Join-Path $PSScriptRoot "..\modloadercode.js"
}
$mod = [IO.File]::ReadAllText((Resolve-Path $modPath))

function Test-ModContains([string]$Name, [string]$Needle) {
  $ok = $mod.Contains($Needle)
  $status = if ($ok) { "OK" } else { "FAIL" }
  Write-Host ("[{0}] mod:{1}" -f $status, $Name)
  return $ok
}

Write-Host "`n--- modloadercode.js static checks ---"
if (-not (Test-ModContains "rootUrl_v12" "GoogleSnakeLevelEditor/v12/")) { $failed++ }
if (-not (Test-ModContains "ensureGameMode" "ensureGameMode")) { $failed++ }
if (-not (Test-ModContains "apple_22_mango" 'data-type="22"')) { $failed++ }
if (-not (Test-ModContains "apple_23_avocado" 'data-type="23"')) { $failed++ }
if ($mod -match 'data-type="24"') {
  Write-Host "[FAIL] mod:fruit_bowl_type_24_should_be_absent"
  $failed++
} else {
  Write-Host "[OK] mod:fruit_bowl_type_24_absent"
}
if ($mod -match 'hasShownWarnings|You must use wall mode') {
  Write-Host "[FAIL] mod:wall_soko_warnings_still_present"
  $failed++
} else {
  Write-Host "[OK] mod:wall_soko_warnings_removed"
}
if ($mod -match 'snake_arcade/v17/apple_') {
  Write-Host "[FAIL] mod:v17_apple_assets_still_present"
  $failed++
} else {
  Write-Host "[OK] mod:apple_assets_v18"
}

Write-Host ""
if ($failed -gt 0) {
  Write-Host "FAILED: $failed check(s)"
  exit 1
}
Write-Host "All checks passed."
exit 0
