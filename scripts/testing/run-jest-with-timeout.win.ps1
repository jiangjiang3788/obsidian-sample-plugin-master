#Requires -Version 5.1
# Windows test supervisor. Direct PowerShell -> Jest process, one file per process.
# Each file gets at most 30 seconds, failures and timeouts do not stop later files.
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$JestArgs = @())
$ErrorActionPreference = 'Stop'
$utf8 = [System.Text.UTF8Encoding]::new($false)
try { [Console]::OutputEncoding = $utf8; $OutputEncoding = $utf8 } catch { }

$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Jest = Join-Path $Root 'node_modules\jest\bin\jest.js'
$Config = Join-Path $Root 'test\configs\jest.core.config.js'
$ReportDir = Join-Path $Root 'reports\testing'
$SummaryPath = Join-Path $ReportDir '日常测试-汇总.json'
$FailurePath = Join-Path $ReportDir '日常测试-失败技术日志.txt'
$RawPath = Join-Path $ReportDir '日常测试-完整技术日志.txt'
$TimeoutMs = 30000
if ($env:THINK_TEST_FILE_TIMEOUT_MS) {
  $parsed = 0
  if ([int]::TryParse($env:THINK_TEST_FILE_TIMEOUT_MS, [ref]$parsed) -and $parsed -ge 1000) { $TimeoutMs = $parsed }
}

function WriteUtf8([string]$File, [string]$Text) {
  [System.IO.File]::WriteAllText($File, $Text, $utf8)
}
function AppendUtf8([string]$File, [string]$Text) {
  [System.IO.File]::AppendAllText($File, $Text, $utf8)
}
function QuoteArg([string]$Value) {
  return '"' + $Value.Replace('"','\"') + '"'
}
function RelativeFile([string]$File) {
  $prefix = $Root.TrimEnd('\', '/') + '\'
  if ($File.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $File.Substring($prefix.Length).Replace('\', '/')
  }
  return $File.Replace('\', '/')
}

$results = New-Object 'System.Collections.Generic.List[object]'
$started = Get-Date
$files = @()
function SaveSummary([bool]$Completed) {
  $passed = @($results | Where-Object { $_.status -eq '通过' }).Count
  $failed = @($results | Where-Object { $_.status -eq '失败' }).Count
  $timedOut = @($results | Where-Object { $_.status -eq '超时' }).Count
  $notRun = $files.Count - $results.Count
  $success = $Completed -and ($passed -eq $files.Count) -and ($notRun -eq 0)
  $report = @{
    total = $files.Count; completed = $Completed; success = $success
    testFileTimeoutMs = $TimeoutMs
    counts = @{ passed = $passed; failed = $failed; timedOut = $timedOut; notRun = $notRun }
    durationMs = [int]((Get-Date) - $started).TotalMilliseconds
    files = @($results.ToArray())
  }
  WriteUtf8 $SummaryPath (ConvertTo-Json -InputObject $report -Depth 12)
  return $report
}

try {
  if (-not (Test-Path -LiteralPath $Jest)) { throw '没有找到 Jest，先运行 npm ci。' }
  if (-not (Test-Path -LiteralPath $ReportDir)) { New-Item -ItemType Directory -Path $ReportDir -Force | Out-Null }
  $node = (Get-Command node.exe -ErrorAction Stop).Source
  # Jest is asked for the file list. Standard output is JSON; non-JSON errors are shown.
  $listArgs = @($Jest, '--config', $Config, '--runInBand', '--listTests', '--json') + @($JestArgs)
  $listing = & $node @listArgs
  if ($LASTEXITCODE -ne 0) { throw "Jest 获取测试列表失败（退出码 $LASTEXITCODE）。" }
  $listJson = ($listing -join "`n").Trim()
  # PowerShell 5.1 can wrap a ConvertFrom-Json array as a single nested array
  # when it is piped into @(...). Do not use the pipeline here, especially for
  # a one-file selection. Collect string paths explicitly into a typed list.
  if (-not $listJson.StartsWith('[')) { throw 'Jest 测试列表不是 JSON 数组，请检查 Jest 命令输出。' }
  try { $parsedList = ConvertFrom-Json -InputObject $listJson -ErrorAction Stop }
  catch { throw "Jest 测试列表 JSON 解析失败：$($_.Exception.Message)" }
  $files = New-Object 'System.Collections.Generic.List[string]'
  foreach ($entry in $parsedList) {
    if ($entry -is [string]) {
      if ([string]::IsNullOrWhiteSpace($entry)) { throw 'Jest 返回了空测试路径。' }
      $files.Add($entry)
    } elseif ($entry -is [array]) {
      # Accept the extra array layer produced by some PowerShell versions.
      foreach ($nested in $entry) {
        if ($nested -isnot [string] -or [string]::IsNullOrWhiteSpace($nested)) {
          $kind = if ($null -eq $nested) { 'null' } else { $nested.GetType().FullName }
          throw "Jest 测试列表项类型错误：$kind"
        }
        $files.Add($nested)
      }
    } else {
      $kind = if ($null -eq $entry) { 'null' } else { $entry.GetType().FullName }
      throw "Jest 测试列表项类型错误：$kind"
    }
  }
  if ($files.Count -eq 0) { throw 'Jest 未发现测试文件，不允许当成通过。' }

  WriteUtf8 $RawPath ''
  WriteUtf8 $FailurePath ''
  SaveSummary $false | Out-Null
  Write-Host "【测试】共 $($files.Count) 个文件；由 Windows PowerShell 监控，单文件 $($TimeoutMs / 1000) 秒超时。"
  Write-Host '【测试】失败和超时均继续；每个文件完成后写入汇总。'

  $runArgs = @()
  for ($j = 0; $j -lt $JestArgs.Count; $j++) {
    if ($JestArgs[$j] -eq '-t' -or $JestArgs[$j] -eq '--testNamePattern') {
      if ($j + 1 -lt $JestArgs.Count) { $runArgs += $JestArgs[$j]; $j++; $runArgs += $JestArgs[$j] }
    } elseif ($JestArgs[$j] -match '^--testNamePattern=' -or $JestArgs[$j] -eq '-u' -or $JestArgs[$j] -eq '--updateSnapshot') {
      $runArgs += $JestArgs[$j]
    }
  }

  for ($i = 0; $i -lt $files.Count; $i++) {
    $file = [string]$files[$i]
    $relative = RelativeFile $file
    $index = $i + 1
    try {
    Write-Host "【正在测试 $index/$($files.Count)】$relative"
    # The current file is known even if the process disappears unexpectedly.
    AppendUtf8 $RawPath "`r`n===== $index/$($files.Count) $relative =====`r`n"
    $outFile = Join-Path $ReportDir '.jest-one-stdout.tmp'
    $errFile = Join-Path $ReportDir '.jest-one-stderr.tmp'
    $structuredFile = Join-Path $ReportDir '.jest-one-structured.tmp.json'
    $fileFailure = Join-Path $ReportDir '.jest-one-failure.tmp.txt'
    foreach ($temp in @($outFile, $errFile, $structuredFile, $fileFailure)) {
      Remove-Item -LiteralPath $temp -ErrorAction SilentlyContinue
    }
    $env:THINK_JEST_REPORT_FILE = ''
    $env:THINK_JEST_FAILURE_FILE = $fileFailure
    $env:THINK_JEST_STRUCTURED_FILE = $structuredFile
    $env:THINK_TEST_LABEL = '日常测试'

    $clock = [System.Diagnostics.Stopwatch]::StartNew()
    $timedOut = $false
    $child = $null
    $exitCode = -1
    $issue = ''
    try {
      $parts = @($Jest, '--config', $Config, '--runInBand', '--runTestsByPath', $file, '--testTimeout', [string]$TimeoutMs) + $runArgs
      $arguments = ($parts | ForEach-Object { QuoteArg ([string]$_) }) -join ' '
      $child = Start-Process -FilePath $node -ArgumentList $arguments -WorkingDirectory $Root -PassThru -NoNewWindow -RedirectStandardOutput $outFile -RedirectStandardError $errFile
      if (-not $child.WaitForExit($TimeoutMs)) {
        $timedOut = $true
        # The entire Jest tree must stop; Stop-Process alone may leak descendants.
        $oldEap = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        try { & taskkill.exe /PID $child.Id /T /F 2>$null | Out-Null } catch { }
        $ErrorActionPreference = $oldEap
        try { if (-not $child.HasExited) { $child.Kill() } } catch { }
        try { $child.WaitForExit(5000) | Out-Null } catch { }
      } else {
        $child.WaitForExit()
        $exitCode = $child.ExitCode
      }
    } catch {
      $issue = $_.Exception.Message
    }
    $clock.Stop()
    try { if ($null -ne $child) { $child.Dispose() } } catch { }
    $output = ''
    if (Test-Path -LiteralPath $outFile) { $output += [System.IO.File]::ReadAllText($outFile, $utf8) }
    if (Test-Path -LiteralPath $errFile) { $output += "`r`n" + [System.IO.File]::ReadAllText($errFile, $utf8) }
    AppendUtf8 $RawPath $output

    # Jest exit code is the primary truth for a single --runTestsByPath process.
    # The custom JSON reporter is auxiliary evidence, not another pass gate:
    # missing/invalid JSON previously caused large numbers of false failures.
    $reportedPass = $false
    $reportState = '未生成'
    if (Test-Path -LiteralPath $structuredFile) {
      try {
        $detail = [System.IO.File]::ReadAllText($structuredFile, $utf8) | ConvertFrom-Json -ErrorAction Stop
        # The structured file is removed before each run. Verify this report also
        # names the current file before using it as exit-code fallback evidence.
        $reportedFiles = @($detail.files)
        $fileMatches = ($reportedFiles.Count -eq 1 -and
          ([string]$reportedFiles[0].file).Replace('\', '/') -ieq $relative)
        $reportedPass = ($detail.success -eq $true -and
          [int]$detail.counts.files.total -eq 1 -and
          [int]$detail.counts.files.passed -eq 1 -and $fileMatches)
        if ($reportedPass) { $reportState = '通过' }
        else { $reportState = "内容未通过(total=$($detail.counts.files.total),passed=$($detail.counts.files.passed),success=$($detail.success),fileMatches=$fileMatches)" }
      } catch {
        $reportState = "读取错误：$($_.Exception.Message)"
      }
    }
    # Some Windows PowerShell 5.1 Start-Process paths return a null ExitCode,
    # even though WaitForExit completed and Jest wrote a successful report.
    # Do not treat null as failure (the user's false-negative), nor allow a
    # structured report to override a real, nonzero exit code or a timeout.
    $exitCodeMissing = [string]::IsNullOrWhiteSpace([string]$exitCode)
    $exitSucceeded = (-not $exitCodeMissing -and [string]$exitCode -eq '0')
    $reportFallback = ($exitCodeMissing -and $reportedPass -and -not $timedOut -and -not $issue)
    $status = '失败'
    if ($timedOut) { $status = '超时' }
    elseif (-not $issue -and ($exitSucceeded -or $reportFallback)) { $status = '通过' }
    $exitLabel = if ($exitCodeMissing) { '缺失' } else { [string]$exitCode }
    $basis = if ($reportFallback) { '当前文件结构化通过报告（退出码缺失）' } else { 'Jest进程退出码' }
    $diagnostic = "Jest退出码=$exitLabel；结构化报告=$reportState；启动异常=$issue；判断依据=$basis"
    if ($reportFallback) {
      AppendUtf8 $RawPath "`r`n【运行器诊断】$relative：Windows未提供退出码；本次文件报告明确通过，按通过记录。`r`n"
    }
    if ($status -ne '通过') {
      $reason = if ($timedOut) { "超过 $($TimeoutMs / 1000) 秒，已终止；$diagnostic" } else { $diagnostic }
      $extra = ''
      if (Test-Path -LiteralPath $fileFailure) { $extra = [System.IO.File]::ReadAllText($fileFailure, $utf8) }
      if (-not $extra) { $extra = $output }
      if (-not $extra) { $extra = 'Jest 无标准输出或错误输出；请检查进程启动及权限。' }
      AppendUtf8 $FailurePath "`r`n===== $relative [$status] =====`r`n$reason`r`n$extra`r`n"
      Write-Host "【失败诊断】$diagnostic"
    } elseif (-not $reportedPass) {
      # Keep the run successful when Jest itself succeeded; note reporter issues
      # in the raw log instead of turning a genuine pass into a failure.
      AppendUtf8 $RawPath "`r`n【报告诊断】$relative：Jest通过，结构化报告=$reportState`r`n"
    }
    $results.Add(@{ file = $relative; status = $status; durationMs = [int]$clock.ElapsedMilliseconds; exitCode = $exitCode; reason = $diagnostic })
    SaveSummary $false | Out-Null
    Write-Host "【测试文件】$status：$relative（耗时 $([int]$clock.ElapsedMilliseconds)ms）"
    foreach ($temp in @($outFile, $errFile, $structuredFile, $fileFailure)) {
      Remove-Item -LiteralPath $temp -ErrorAction SilentlyContinue
    }
    } catch {
      $reason = $_.Exception.Message
      Write-Host "【测试文件】失败：$relative（调度异常：$reason）"
      if ($results.Count -lt $index) {
        $results.Add(@{ file = $relative; status = '失败'; durationMs = 0; exitCode = -1; reason = $reason })
      }
      try { AppendUtf8 $FailurePath "`r`n===== $relative [调度异常] =====`r`n$reason`r`n" } catch { }
      SaveSummary $false | Out-Null
    }
  }
  $summary = SaveSummary $true
  Write-Host "【测试汇总】共 $($files.Count) 个文件，通过 $($summary.counts.passed)，失败 $($summary.counts.failed)，超时 $($summary.counts.timedOut)，未执行 $($summary.counts.notRun)。"
  Write-Host "【测试汇总】报告：reports/testing/日常测试-汇总.json"
  if ($summary.success) { exit 0 }
  Write-Host "【失败详情】reports/testing/日常测试-失败技术日志.txt"
  exit 1
} catch {
  Write-Host "【测试运行器错误】$($_.Exception.Message)"
  try {
    if (Test-Path -LiteralPath $ReportDir) { SaveSummary $false | Out-Null }
  } catch { }
  exit 1
}
