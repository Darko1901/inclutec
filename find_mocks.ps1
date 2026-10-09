[xml]$rels = Get-Content -Raw "temp_docx_extract\word\_rels\document.xml.rels"
$relMap = @{}
foreach ($rel in $rels.Relationships.Relationship) {
    $relMap[$rel.Id] = $rel.Target
}

[xml]$doc = Get-Content -Raw "temp_docx_extract\word\document.xml"
$ns = New-Object System.Xml.XmlNamespaceManager($doc.NameTable)
$ns.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")
$ns.AddNamespace("a", "http://schemas.openxmlformats.org/drawingml/2006/main")
$ns.AddNamespace("r", "http://schemas.openxmlformats.org/officeDocument/2006/relationships")

$foundMocks = $false
$imageFiles = @()

foreach ($node in $doc.SelectNodes("//w:t | //a:blip", $ns)) {
    if ($node.Name -eq "w:t") {
        if ($node.InnerText -match "mock") {
            $foundMocks = $true
        }
    } elseif ($node.Name -eq "a:blip") {
        if ($foundMocks) {
            $rId = $node.GetAttribute("embed", "http://schemas.openxmlformats.org/officeDocument/2006/relationships")
            if ($rId -and $relMap.ContainsKey($rId)) {
                $imageFiles += $relMap[$rId]
            }
        }
    }
}
$imageFiles | Select-Object -Unique
