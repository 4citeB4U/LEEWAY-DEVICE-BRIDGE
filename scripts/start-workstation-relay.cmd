@echo off
REM ========================================================
REM LeeWay Sovereign Workstation Relay Launcher
REM Starts Persistent Relay Server (Port 8008 + Funnel)
REM and Workstation Relay Agent (pc-primary outbound daemon)
REM ========================================================

REM 1. Ensure Tailscale Funnel is routed to port 8008
call "C:\Program Files\Tailscale\tailscale.exe" funnel --bg --set-path /api/device-relay 8008 >nul 2>&1

REM 2. Start Persistent Relay Server on port 8008
start "LeeWay-Persistent-Relay-Server" /B "C:\Program Files\nodejs\node.exe" "C:\Users\Leona\.codex\leeway\device-bridge-controller-zitadel-ingress\operator\persistent-relay-server.mjs"

REM 3. Wait 2 seconds for server binding
timeout /t 2 /nobreak >nul

REM 4. Start Outbound Workstation Relay Agent for pc-primary
start "LeeWay-Workstation-Relay-Agent" /B "C:\Program Files\nodejs\node.exe" "C:\Users\Leona\.codex\leeway\device-bridge-controller-zitadel-ingress\operator\workstation-relay-agent.mjs"
