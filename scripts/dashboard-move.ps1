<#
dashboard-move.ps1
如果一切正常→无输出；出错就打印中文信息。
#>

try {
    # ① 目标目录
    $dst = "src/features/dashboard/ui"
    if (!(Test-Path $dst)) { New-Item -ItemType Directory -Path $dst -Force | Out-Null }

    # ② 源文件与目标文件映射
    $map = @{
        "src/views/Dashboard.tsx"        = "$dst/Dashboard.tsx";
        "src/views/ModulePanel.tsx"      = "$dst/ModulePanel.tsx";
        "src/views/BlockView.tsx"        = "$dst/BlockView.tsx";
        "src/views/TableView.tsx"        = "$dst/TableView.tsx";
        "src/views/ExcelView.tsx"        = "$dst/ExcelView.tsx";
    }

    # ③ 循环移动
    foreach ($kv in $map.GetEnumerator()) {
        $src = $kv.Key; $target = $kv.Value
        if (!(Test-Path $src)) { throw "找不到文件 $src" }
        $targetDir = Split-Path $target
        if (!(Test-Path $targetDir)) { New-Item -ItemType Directory -Path $targetDir -Force | Out-Null }
        Move-Item -Path $src -Destination $target -Force
    }

} catch {
    Write-Host "❌ Dashboard 文件搬移失败：" $_.Exception.Message -ForegroundColor Red
    exit 1
}
