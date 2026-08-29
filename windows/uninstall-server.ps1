#Requires -RunAsAdministrator
<#
  Remove o servico do Windows e a regra de firewall criados por
  install-server.ps1. NAO apaga o banco de dados nem a pasta do repositorio -
  isso e proposital, para nao perder dados por engano.
#>

$ErrorActionPreference = "Stop"
$ServiceName = "DBLAPOGE"

if (Get-Command nssm -ErrorAction SilentlyContinue) {
  Write-Host "Parando e removendo o servico '$ServiceName'..."
  nssm stop $ServiceName 2>$null | Out-Null
  nssm remove $ServiceName confirm 2>$null | Out-Null
} else {
  Write-Host "nssm nao encontrado - remova o servico manualmente pelo services.msc se ele ainda existir."
}

if (Get-NetFirewallRule -DisplayName $ServiceName -ErrorAction SilentlyContinue) {
  Write-Host "Removendo a regra de firewall '$ServiceName'..."
  Remove-NetFirewallRule -DisplayName $ServiceName
}

Write-Host ""
Write-Host "Servico e regra de firewall removidos."
Write-Host "O banco de dados PostgreSQL ('dblapoge') e a pasta do repositorio NAO foram apagados."
Write-Host "Para reinstalar depois, rode windows\install-server.ps1 de novo."
