# Runs a command inside the Visual Studio x64 Developer environment.
# Needed to build the local AI engine's Vulkan backend: llama.cpp's
# shader sub-project requires cl.exe + INCLUDE/LIB from vcvars.
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Cmd)

$vsCandidates = @(
    "C:\Program Files\Microsoft Visual Studio\2022\Preview\VC\Auxiliary\Build\vcvars64.bat",
    "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat",
    "C:\Program Files\Microsoft Visual Studio\2022\Professional\VC\Auxiliary\Build\vcvars64.bat",
    "C:\Program Files\Microsoft Visual Studio\2022\Enterprise\VC\Auxiliary\Build\vcvars64.bat"
)
$vcvars = $vsCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $vcvars) {
    Write-Error "vcvars64.bat not found - install Visual Studio 2022 with C++ workload"
    exit 1
}

cmd /c "call `"$vcvars`" >nul && $($Cmd -join ' ')"
exit $LASTEXITCODE
