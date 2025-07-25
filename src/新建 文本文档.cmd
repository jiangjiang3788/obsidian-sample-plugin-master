@echo off
setlocal enabledelayedexpansion

:: 设置临时文件并使用UTF-8编码
set output_file=%temp%\file_content.txt

:: 清空临时文件
echo. > %output_file%

:: 设置编码为 UTF-8
chcp 65001

:: 遍历当前文件夹及子文件夹中的所有文件（排除 .cmd 文件）
for /r %%f in (*) do (
    :: 检查文件扩展名是否为 .cmd，如果是，则跳过
    if /i not "%%~xf"==".cmd" (
        echo 文件: %%f >> %output_file%
        type "%%f" >> %output_file%
        echo. >> %output_file%
    )
)

:: 将文件内容复制到剪贴板
type %output_file% | clip

:: 删除临时文件
del %output_file%

echo 文件名和内容已经复制到剪贴板
