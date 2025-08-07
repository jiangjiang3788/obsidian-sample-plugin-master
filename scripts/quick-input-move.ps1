<#
quick-input-move.ps1
如果正常→静默；出错则中文输出
#>

try {
    $dst = "src/features/quick-input/ui"
    if (!(Test-Path $dst)) { New-Item -ItemType Directory -Path $dst -Force | Out-Null }

    $map = @{
        "src/ui/modals/QuickTaskModal.tsx"  = "$dst/QuickTaskModal.tsx";
        "src/ui/modals/QuickBlockModal.tsx" = "$dst/QuickBlockModal.tsx";
        "src/ui/modals/QuickHabitModal.tsx" = "$dst/QuickHabitModal.tsx";
    }

    foreach ($kv in $map.GetEnumerator()) {
        $src = $kv.Key; $target = $kv.Value
        if (!(Test-Path $src)) { throw "找不到文件 $src" }
        $targetDir = Split-Path $target
        if (!(Test-Path $targetDir)) { New-Item -ItemType Directory -Path $targetDir -Force | Out-Null }
        Move-Item -Path $src -Destination $target -Force
    }

} catch {
    Write-Host "❌ Quick-Input 文件搬移失败：" $_.Exception.Message -ForegroundColor Red
    exit 1
}
