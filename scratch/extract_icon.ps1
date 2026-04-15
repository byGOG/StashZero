Add-Type -AssemblyName System.Drawing
$source = "C:\Users\byGOG\Downloads\Programs\MediaCreationTool.exe"
$dest = "c:\Users\byGOG\StashZero\public\mct_icon.png"

if (Test-Path $source) {
    try {
        $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($source)
        $bitmap = $icon.ToBitmap()
        $bitmap.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
        Write-Host "SUCCESS: Icon extracted to $dest"
    } catch {
        Write-Host "ERROR: Failed to extract icon. $_"
    }
} else {
    Write-Host "ERROR: Source file not found: $source"
}
