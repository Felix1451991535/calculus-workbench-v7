param([Parameter(Mandatory=$true)][string]$Archive,[Parameter(Mandatory=$true)][string]$Destination,[switch]$Full)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$taskDestination = [IO.Path]::GetFullPath($Destination)
$archiveObject = [IO.Compression.ZipFile]::OpenRead($Archive)
try {
  $totalSize = 0L
  $entries = @()
  foreach ($entry in $archiveObject.Entries) {
    $entryPath = $entry.FullName.Replace('\','/')
    if ($Full) { $entryPath = $entryPath -replace '^CalculusWorkbench-v\d+\.\d+\.\d+-Windows-x64/','' }
    if (-not $entryPath -or $entryPath.EndsWith('/')) { continue }
    if ($entryPath -match '(^/|(^|/)\.\.(/|$)|:)' -or ($entry.ExternalAttributes -band 0x400) -ne 0 -or (($entry.ExternalAttributes -shr 16) -band 0xF000) -eq 0xA000) { throw "压缩包含非法路径或链接：$entryPath" }
    if ($Full) {
      if ($entryPath -match '^(config/|[^/]+\.bat$)') { continue }
      if ($entryPath -notmatch '^(app/(build|dist)/|node_modules/|runtime/|automation/|package(-lock)?\.json$|ACCEPTANCE_REPORT\.md$|README_使用说明\.txt$)') { throw "完整更新包含禁止修改的数据路径：$entryPath" }
    } elseif ($entryPath -notmatch '^app/(build|dist)/') { throw "补丁路径不允许：$entryPath" }
    $resolvedTarget = [IO.Path]::GetFullPath([IO.Path]::Combine($taskDestination,$entryPath))
    if (-not $resolvedTarget.StartsWith($taskDestination + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw '压缩包路径越界' }
    $totalSize += $entry.Length
    if ($totalSize -gt 1073741824) { throw '解压体积超限' }
    $entries += @{ Entry = $entry; Target = $resolvedTarget }
  }
  foreach ($item in $entries) {
    [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($item.Target)) | Out-Null
    $inputStream = $item.Entry.Open()
    $outputStream = [IO.File]::Open($item.Target,[IO.FileMode]::CreateNew)
    try { $inputStream.CopyTo($outputStream) } finally { $inputStream.Dispose(); $outputStream.Dispose() }
  }
} finally { $archiveObject.Dispose() }
