$taskName = "LeeWayWorkstationRelay"
$scriptPath = "C:\Users\Leona\.codex\leeway\device-bridge-controller-zitadel-ingress\operator\workstation-relay-agent.mjs"
$nodePath = (Get-Command node.exe).Source

Write-Host "Registering Scheduled Task: $taskName"
Write-Host "Node: $nodePath"
Write-Host "Script: $scriptPath"

# Action
$action = New-ScheduledTaskAction -Execute $nodePath -Argument "`"$scriptPath`"" -WorkingDirectory "C:\Users\Leona\.codex\leeway\device-bridge-controller-zitadel-ingress"

# Triggers: At logon
$triggerLogon = New-ScheduledTaskTrigger -AtLogOn

# Settings: Continuous running, restart on failure
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit 0 -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1)

# Register task for current user
try {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $triggerLogon -Settings $settings -Description "LeeWay Device Bridge Persistent Outbound Relay for pc-primary" | Out-Null
    Write-Host "SUCCESS: Scheduled Task '$taskName' registered successfully."
    
    # Query task to verify
    Get-ScheduledTask -TaskName $taskName | Select-Object TaskName, State
} catch {
    Write-Error "Failed to register scheduled task: $_"
}
