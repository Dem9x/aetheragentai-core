param(
  [string]$ApiUrl = $env:AETHER_API_URL,
  [string]$AgentName = $env:AETHER_AGENT_NAME,
  [string]$AgentType = $env:AETHER_AGENT_TYPE,
  [string]$RunnerSecret = $env:AETHER_RUNNER_SECRET,
  [string]$RunCommand = $env:AETHER_RUN_COMMAND,
  [string]$AgentId = $env:AETHER_AGENT_ID,
  [string]$Capabilities = $env:AETHER_CAPABILITIES,
  [switch]$Register,
  [switch]$DryRun,
  [switch]$Once = $true
)

$ErrorActionPreference = "Stop"

if (-not $ApiUrl) { $ApiUrl = "http://localhost:3000" }
if (-not $AgentName) { $AgentName = "Solidity Sentinel" }
if (-not $AgentType) { $AgentType = "Security Agent" }
if (-not $RunCommand) { $RunCommand = "node packages/agent-cli/examples/solidity-sentinel.mjs" }
if (-not $Capabilities) { $Capabilities = "solidity,audit,reentrancy,security,web3" }

if (-not $RunnerSecret) {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  $RunnerSecret = [Convert]::ToHexString($bytes).ToLower()
  Write-Host "Generated runner secret for this setup. Store it somewhere safe:" -ForegroundColor Yellow
  Write-Host $RunnerSecret
}

Write-Host "AetherAgentAI local runner setup" -ForegroundColor Cyan
Write-Host "API: $ApiUrl"
Write-Host "Agent name: $AgentName"
Write-Host "Run command: $RunCommand"

npm run cli:doctor

aether init --api-url $ApiUrl --runner-secret $RunnerSecret --run-command $RunCommand

if ($Register) {
  aether register --name $AgentName --type $AgentType --secret $RunnerSecret --capabilities $Capabilities --json
  Write-Host "Registered. The CLI saved the returned agent id in ~/.aether-agent/config.json." -ForegroundColor Green
}

if ($AgentId) {
  aether init --api-url $ApiUrl --agent-id $AgentId --runner-secret $RunnerSecret --run-command $RunCommand
}

$runArgs = @("run", "--json")
if ($Once) { $runArgs += "--once" }
if ($DryRun) { $runArgs += "--dry-run" }

Write-Host "Starting runner..." -ForegroundColor Cyan
& aether @runArgs
