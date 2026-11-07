/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.DESKTOP.WINDOWS_UI
TAG: LEEWAY_GOVERNED_WINDOWS_UI_COMPOSER_V1
WHO: LeeWay Industries; WHAT: bounded owner-scoped Windows UI observation and composer input.
WHEN: 2026-11-07; WHERE: apps/desktop/windows-ui-sessions.mjs.
WHY: Address only a fresh, explicitly observed UI control; never guess a composer or send button.
HOW: Windows UI Automation, allowlisted applications, short-lived target IDs, exact readback.
AUTHORITY: Candidate source only; Bridge admission, Formula and independent Veritas remain mandatory.
LICENSE: MIT
*/
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';

const APPS = Object.freeze({
  codex: Object.freeze(['Codex', 'ChatGPT']),
  chatgpt: Object.freeze(['ChatGPT']),
  antigravity: Object.freeze(['Antigravity']),
});
const MAX_OUTPUT = 131072;
const OBSERVATION_TTL_MS = 30000;
const MAX_OBSERVATIONS = 20;

function appNames(app) {
  const names = APPS[app];
  if (!names) throw Error('WINDOW_APP_UNSUPPORTED');
  return names;
}

function powershellCommand() {
  return process.platform === 'win32'
    ? `${process.env.SystemRoot || 'C:\\Windows'}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`
    : 'powershell';
}

async function executePowerShell(script) {
  if (process.platform !== 'win32') throw Error('WINDOW_UI_WINDOWS_ONLY');
  return await new Promise((resolve, reject) => {
    const child = spawn(powershellCommand(), ['-NoProfile', '-NonInteractive', '-Command', '-'], {
      shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '', stderr = '', settled = false;
    const finishError = error => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill();
      reject(error);
    };
    const append = (prior, chunk) => {
      const next = prior + chunk.toString('utf8');
      if (next.length > MAX_OUTPUT) throw Error('WINDOW_UI_OUTPUT_TOO_LARGE');
      return next;
    };
    child.stdout.on('data', chunk => { try { stdout = append(stdout, chunk); } catch (error) { finishError(error); } });
    child.stderr.on('data', chunk => { try { stderr = append(stderr, chunk); } catch (error) { finishError(error); } });
    child.on('error', () => finishError(Error('WINDOW_UI_AUTOMATION_FAILED')));
    child.on('close', code => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code !== 0) return reject(Error('WINDOW_UI_AUTOMATION_FAILED'));
      const marker = 'LEEWAY_UI_RESULT:';
      const line = stdout.trim().split(/\r?\n/).reverse().find(value => value.startsWith(marker));
      if (!line) {
        const state = ['AFTER_PROCESS_ENUM', 'BEFORE_RESULT', 'STARTED'].find(value => stdout.includes(`LEEWAY_UI_${value}`)) || 'BEFORE_START';
        return reject(Error(stderr.trim() ? `WINDOW_UI_RESULT_MISSING_STDERR_${state}` : `WINDOW_UI_RESULT_MISSING_NO_STDERR_${state}`));
      }
      let value;
      try { value = JSON.parse(line.slice(marker.length)); } catch { return reject(Error('WINDOW_UI_RESULT_MALFORMED')); }
      if (value?.ok !== true) return reject(Error(typeof value?.error === 'string' && /^[A-Z_]+$/.test(value.error) ? value.error : 'WINDOW_UI_AUTOMATION_FAILED'));
      resolve(value.result);
    });
    const timer = setTimeout(() => finishError(Error('WINDOW_UI_AUTOMATION_TIMEOUT')), 15000);
    child.stdin.end(script, 'utf8');
  });
}

function scriptPreamble(app, pid = null, maxControls = 100) {
  const names = appNames(app).map(name => `'${name}'`).join(',');
  const pidLine = pid === null ? '$targetPid = $null' : `$targetPid = ${Number(pid)}`;
  return `$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
$allowedNames = @(${names})
${pidLine}
$maxControls = ${Math.max(1, Math.min(200, Number(maxControls) || 100))}
$root = [System.Windows.Automation.AutomationElement]::RootElement
Write-Output 'LEEWAY_UI_STARTED'
function FindWindow([int] $processId, [long] $expectedHandle) {
  $condition = [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::ProcessIdProperty, $processId)
  $windows = $root.FindAll([System.Windows.Automation.TreeScope]::Children, $condition)
  $matches = @(); foreach ($candidate in $windows) { if ([long]$candidate.Current.NativeWindowHandle -eq $expectedHandle) { $matches += $candidate } }
  if ($matches.Count -ne 1) { throw 'WINDOW_IDENTITY_MISMATCH' }; return $matches[0]
}
function ProcessAllowed([int] $processId, [string] $expectedName, [string] $expectedStart) {
  $process = Get-Process -Id $processId -ErrorAction Stop
  if ($allowedNames -notcontains $process.ProcessName -or $process.ProcessName -cne $expectedName) { throw 'WINDOW_PROCESS_NOT_ALLOWED' }
  $started = $process.StartTime.ToUniversalTime().ToString('o')
  if ($started -cne $expectedStart) { throw 'WINDOW_PROCESS_IDENTITY_MISMATCH' }
  return $process
}
function ControlData($element) {
  $valueAvailable = $false; $valueReadOnly = $true; $valuePattern = $null
  try { $valueAvailable = [bool]$element.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$valuePattern); if ($valueAvailable) { $valueReadOnly = [bool]$valuePattern.Current.IsReadOnly } } catch {}
  $invokeAvailable = $false; $invokePattern = $null
  try { $invokeAvailable = [bool]$element.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$invokePattern) } catch {}
  [ordered]@{ name = [string]$element.Current.Name; automationId = [string]$element.Current.AutomationId; controlType = [string]$element.Current.ControlType.ProgrammaticName; enabled = [bool]$element.Current.IsEnabled; keyboardFocusable = [bool]$element.Current.IsKeyboardFocusable; offscreen = [bool]$element.Current.IsOffscreen; valuePatternAvailable = $valueAvailable; valuePatternReadOnly = $valueReadOnly; invokePatternAvailable = $invokeAvailable; nativeWindowHandle = [long]$element.Current.NativeWindowHandle }
}
function EmitResult($payload) { Write-Output ("LEEWAY_UI_RESULT:" + ($payload | ConvertTo-Json -Compress -Depth 8)) }
`;
}

const b64 = value => Buffer.from(value, 'utf8').toString('base64');
const sha256 = value => createHash('sha256').update(value, 'utf8').digest('hex');

export class WindowsUiSessions {
  constructor({ executeScript = executePowerShell, now = Date.now } = {}) {
    this.executeScript = executeScript;
    this.now = now;
    this.observations = new Map();
  }

  async list(args) {
    const script = `${scriptPreamble(args.app, null, args.limit || 10)}
$items = @()
Write-Output 'LEEWAY_UI_BEFORE_PROCESS_ENUM'
$processes = @(Get-Process -Name $allowedNames -ErrorAction SilentlyContinue)
Write-Output 'LEEWAY_UI_AFTER_PROCESS_ENUM'
foreach ($process in $processes) { if ($process.MainWindowHandle -ne 0 -and $process.MainWindowTitle) { [void]($items += [ordered]@{ pid = [int]$process.Id; processName = [string]$process.ProcessName; title = [string]$process.MainWindowTitle; enabled = $true }) }; if ($items.Count -ge $maxControls) { break } }
Write-Output 'LEEWAY_UI_BEFORE_RESULT'
EmitResult (@{ ok = $true; result = @{ app = '${args.app}'; windows = @($items); total = $items.Count; truncated = $false } })
`;
    return this.executeScript(script);
  }

  async observe(args) {
    const script = `${scriptPreamble(args.app, args.pid, args.maxControls)}
$process = Get-Process -Id $targetPid -ErrorAction Stop
if ($allowedNames -notcontains $process.ProcessName) { throw 'WINDOW_PROCESS_NOT_ALLOWED' }
$window = $null; $windows = $root.FindAll([System.Windows.Automation.TreeScope]::Children, [System.Windows.Automation.Condition]::TrueCondition)
foreach ($candidate in $windows) { if ([int]$candidate.Current.ProcessId -eq $targetPid -and [long]$candidate.Current.NativeWindowHandle -eq [long]$process.MainWindowHandle) { $window = $candidate; break } }
if ($null -eq $window -or $process.MainWindowHandle -eq 0) { throw 'WINDOW_NOT_FOUND' }
$controls = @(); $editable = @(); $actions = @()
$descendants = $window.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
foreach ($element in $descendants) {
  $data = ControlData $element
  if ($controls.Count -lt [Math]::Min($maxControls, 60)) { $controls += $data }
  if ($data.controlType -eq 'ControlType.Edit' -and $data.enabled -and -not $data.offscreen -and $data.valuePatternAvailable -and -not $data.valuePatternReadOnly -and $editable.Count -lt 30) { $editable += $data }
  if ($data.controlType -eq 'ControlType.Button' -and $data.enabled -and -not $data.offscreen -and $data.invokePatternAvailable -and $actions.Count -lt 30) { $actions += $data }
}
$startUtc = $process.StartTime.ToUniversalTime().ToString('o')
Write-Output 'LEEWAY_UI_BEFORE_RESULT'
EmitResult (@{ ok = $true; result = @{ app = '${args.app}'; pid = $targetPid; processName = [string]$process.ProcessName; processStartedUtc = $startUtc; windowHandle = [long]$window.Current.NativeWindowHandle; title = [string]$window.Current.Name; controls = @($controls); editableTargets = @($editable); actionTargets = @($actions); totalControls = $descendants.Count; truncated = $descendants.Count -gt $controls.Count } })
`;
    const result = await this.executeScript(script);
    if (result?.app !== args.app || result?.pid !== args.pid || !Number.isSafeInteger(result.windowHandle)
      || typeof result.processName !== 'string' || typeof result.processStartedUtc !== 'string'
      || typeof result.title !== 'string' || !Array.isArray(result.editableTargets) || !Array.isArray(result.actionTargets))
      throw Error('WINDOW_OBSERVATION_INVALID');
    this.expireObservations();
    const observationId = randomUUID();
    const editableTargets = result.editableTargets.map(control => ({ ...control, targetId: randomUUID() }));
    const actionTargets = result.actionTargets.map(control => ({ ...control, targetId: randomUUID() }));
    this.observations.set(observationId, {
      app: result.app, pid: result.pid, processName: result.processName,
      processStartedUtc: result.processStartedUtc, windowHandle: result.windowHandle,
      title: result.title, expiresAt: this.now() + OBSERVATION_TTL_MS,
      editableTargets: new Map(editableTargets.map(control => [control.targetId, control])),
      actionTargets: new Map(actionTargets.map(control => [control.targetId, control])),
      inputUsed: false, submitted: false,
    });
    while (this.observations.size > MAX_OBSERVATIONS) this.observations.delete(this.observations.keys().next().value);
    return { ...result, observationId, expiresInMs: OBSERVATION_TTL_MS, editableTargets, actionTargets };
  }

  async input(args) {
    const observation = this.getObservation(args.observationId, args.app, args.pid);
    const target = observation.editableTargets.get(args.targetId);
    if (!target) throw Error('WINDOW_TARGET_NOT_OBSERVED');
    if (observation.inputUsed || observation.submitted) throw Error('WINDOW_OBSERVATION_ALREADY_USED');
    const script = this.targetScript(observation, target, `
$valuePattern = $null
if (-not $target.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$valuePattern) -or $valuePattern.Current.IsReadOnly) { throw 'WINDOW_VALUE_PATTERN_UNAVAILABLE' }
$valuePattern.SetValue($text)
$readback = [string]$valuePattern.Current.Value
if ($readback -cne $text) { throw 'WINDOW_INPUT_READBACK_MISMATCH' }
$sha = [System.Security.Cryptography.SHA256]::Create(); try { $textSha256 = ([BitConverter]::ToString($sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($readback)))).Replace('-', '').ToLowerInvariant() } finally { $sha.Dispose() }
Write-Output 'LEEWAY_UI_BEFORE_RESULT'
EmitResult (@{ ok = $true; result = @{ app = '${args.app}'; pid = $targetPid; windowHandle = [long]$window.Current.NativeWindowHandle; title = [string]$window.Current.Name; targetId = '${args.targetId}'; inputLength = $text.Length; textSha256 = $textSha256; textReadback = 'EXACT_VALUE_PATTERN_READBACK' } })
`, args.text);
    const result = await this.executeScript(script);
    if (result?.textSha256 !== sha256(args.text) || result?.targetId !== args.targetId) throw Error('WINDOW_INPUT_READBACK_MISMATCH');
    observation.inputUsed = true;
    observation.textSha256 = result.textSha256;
    return result;
  }

  async submit(args) {
    const observation = this.getObservation(args.observationId, args.app, args.pid);
    const target = observation.editableTargets.get(args.targetId);
    const action = observation.actionTargets.get(args.actionTargetId);
    if (!target || !action) throw Error('WINDOW_TARGET_NOT_OBSERVED');
    if (!observation.inputUsed || observation.submitted || observation.textSha256 !== args.expectedTextSha256)
      throw Error('WINDOW_SUBMISSION_NOT_BOUND_TO_VERIFIED_INPUT');
    const script = this.targetScript(observation, target, `
$valuePattern = $null
if (-not $target.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$valuePattern) -or $valuePattern.Current.IsReadOnly) { throw 'WINDOW_VALUE_PATTERN_UNAVAILABLE' }
$readback = [string]$valuePattern.Current.Value
$sha = [System.Security.Cryptography.SHA256]::Create(); try { $textSha256 = ([BitConverter]::ToString($sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($readback)))).Replace('-', '').ToLowerInvariant() } finally { $sha.Dispose() }
if ($textSha256 -cne '${args.expectedTextSha256}') { throw 'WINDOW_SUBMISSION_TEXT_CHANGED' }
$actionName = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${b64(action.name)}'))
$actionAutomationId = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${b64(action.automationId)}'))
$buttonCondition = [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::Button)
$buttons = $window.FindAll([System.Windows.Automation.TreeScope]::Descendants, $buttonCondition); $buttonMatches = @()
foreach ($candidate in $buttons) { if ($candidate.Current.Name -ceq $actionName -and $candidate.Current.AutomationId -ceq $actionAutomationId -and $candidate.Current.IsEnabled -and -not $candidate.Current.IsOffscreen) { $invokePattern = $null; if ($candidate.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$invokePattern)) { $buttonMatches += $candidate } } }
if ($buttonMatches.Count -ne 1) { throw 'WINDOW_ACTION_TARGET_NOT_UNIQUE' }
$invoke = $null; if (-not $buttonMatches[0].TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$invoke)) { throw 'WINDOW_INVOKE_PATTERN_UNAVAILABLE' }
$invoke.Invoke()
Write-Output 'LEEWAY_UI_BEFORE_RESULT'
EmitResult (@{ ok = $true; result = @{ app = '${args.app}'; pid = $targetPid; windowHandle = [long]$window.Current.NativeWindowHandle; targetId = '${args.targetId}'; actionTargetId = '${args.actionTargetId}'; submitted = $true; actionName = $actionName; textSha256 = $textSha256; resultState = 'ACTION_INVOKED_NOT_CONVERSATION_PROOF' } })
`);
    const result = await this.executeScript(script);
    if (result?.submitted !== true || result?.textSha256 !== observation.textSha256) throw Error('WINDOW_SUBMISSION_RESULT_INVALID');
    observation.submitted = true;
    this.observations.delete(args.observationId);
    return result;
  }

  async invoke(args) {
    const script = `${scriptPreamble(args.app, args.pid)}
$process = Get-Process -Id $targetPid -ErrorAction Stop
if ($allowedNames -notcontains $process.ProcessName) { throw 'WINDOW_PROCESS_NOT_ALLOWED' }
$window = $root.FindAll([System.Windows.Automation.TreeScope]::Children, [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::ProcessIdProperty, $targetPid)) | Select-Object -First 1
if ($null -eq $window) { throw 'WINDOW_NOT_FOUND' }
$controlName = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${b64(args.controlName)}'))
$condition = [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::NameProperty, $controlName)
$controls = $window.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condition); $targets = @()
foreach ($candidate in $controls) { if ($candidate.Current.ControlType -eq [System.Windows.Automation.ControlType]::Hyperlink -or $candidate.Current.ControlType -eq [System.Windows.Automation.ControlType]::Button) { $targets += $candidate } }
if ($targets.Count -ne 1) { throw 'WINDOW_CONTROL_NOT_UNIQUE' }
$invoke = $null; if (-not $targets[0].TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$invoke)) { throw 'WINDOW_INVOKE_PATTERN_UNAVAILABLE' }
$invoke.Invoke()
Write-Output 'LEEWAY_UI_BEFORE_RESULT'
EmitResult (@{ ok = $true; result = @{ app = '${args.app}'; pid = $targetPid; invoked = $true; controlName = $controlName; controlType = [string]$targets[0].Current.ControlType.ProgrammaticName; action = 'INVOKE'; targetReadback = 'NAVIGATION_ACCEPTED_NOT_CONVERSATION_PROOF' } })
`;
    return this.executeScript(script);
  }

  targetScript(observation, target, action, text = null) {
    const processName = b64(observation.processName);
    const processStarted = b64(observation.processStartedUtc);
    const title = b64(observation.title);
    const name = b64(target.name);
    const automationId = b64(target.automationId);
    const textSetup = text === null ? '' : `$text = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${b64(text)}'))`;
    return `${scriptPreamble(observation.app, observation.pid)}
$expectedProcessName = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${processName}'))
$expectedStart = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${processStarted}'))
$expectedTitle = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${title}'))
$process = ProcessAllowed $targetPid $expectedProcessName $expectedStart
$window = FindWindow $targetPid ${observation.windowHandle}
if ([string]$window.Current.Name -cne $expectedTitle) { throw 'WINDOW_IDENTITY_MISMATCH' }
$targetName = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${name}'))
$targetAutomationId = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${automationId}'))
$editCondition = [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::Edit)
$edits = $window.FindAll([System.Windows.Automation.TreeScope]::Descendants, $editCondition); $matches = @()
foreach ($candidate in $edits) { if ($candidate.Current.Name -ceq $targetName -and $candidate.Current.AutomationId -ceq $targetAutomationId -and $candidate.Current.IsEnabled -and -not $candidate.Current.IsOffscreen) { $value = $null; if ($candidate.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$value) -and -not $value.Current.IsReadOnly) { $matches += $candidate } } }
if ($matches.Count -ne 1) { throw 'WINDOW_TARGET_NOT_UNIQUE' }
$target = $matches[0]
${textSetup}${action}
`;
  }

  getObservation(id, app, pid) {
    this.expireObservations();
    const observation = this.observations.get(id);
    if (!observation) throw Error('WINDOW_OBSERVATION_EXPIRED');
    if (observation.app !== app || observation.pid !== pid) throw Error('WINDOW_OBSERVATION_IDENTITY_MISMATCH');
    return observation;
  }

  expireObservations() {
    const now = this.now();
    for (const [id, value] of this.observations) if (value.expiresAt <= now) this.observations.delete(id);
  }
}
