export type PlatformKey = 'apple' | 'android' | 'windows' | 'linux';
export type DeviceGroupKey = 'desktop' | 'laptop' | 'mobile' | 'tablet' | 'servers' | 'iot';
export type HealthStatus = 'verified' | 'warning' | 'critical' | 'unverified';
export type TimeWindow = '15m' | '1h' | '24h';

export interface TelemetryPoint {
  timestamp: string;
  label: string;
  throughputMbps: number;
  latencyMs: number;
  packetIntegrityPct: number;
  appleMbps: number;
  androidMbps: number;
  windowsMbps: number;
  linuxMbps: number;
}

export interface DeviceNode {
  id: string;
  name: string;
  group: DeviceGroupKey;
  groupLabel: string;
  platform: PlatformKey;
  osVersion: string;
  status: HealthStatus;
  statusLabel: string;
  latencyMs: number;
  throughputMbps: number;
  uptimePct: number;
  syncQueueDepth: number;
  transport: string;
  lastHeartbeat: string;
}

export interface PlatformLane {
  id: PlatformKey;
  title: string;
  subtitle: string;
  eyebrow: string;
  status: HealthStatus;
  statusLabel: string;
  workstationLabel: string;
  secondaryActionLabel: string;
  description: string;
  primaryButtonText: string;
  secondaryButtonText?: string;
  packageBadge: string;
  nativeBridgeState: string;
  metrics: {
    activeNodes: number;
    avgLatencyMs: number;
    syncRateMbps: number;
    packetSuccessPct: number;
  };
  details: string[];
  sha256?: string;
  releaseTag?: string;
  workstationUrlNote: string;
}

export interface DeviceControlSpec {
  id: string;
  label: string;
  category: 'Session' | 'Lifecycle' | 'System';
  permissionScope: string;
  requiresOwnerAuth: boolean;
  latencyBudgetMs: number;
  supportedPlatforms: PlatformKey[];
  description: string;
  commandPreview: string;
}

export interface WorkflowRun {
  id: string;
  name: string;
  branch: string;
  status: 'queued' | 'in_progress' | 'success' | 'cancelled';
  statusText: string;
  durationSec: number;
  updatedAt: string;
  commitHash: string;
}

export interface ActivityLogEntry {
  id: string;
  time: string;
  message: string;
  level: 'info' | 'success' | 'warning' | 'error';
  source: string;
}

export interface ContractReadableFact {
  label: string;
  value: string;
}

export interface ContractReadable {
  summary: string;
  explanation: string;
  leewayOwns: string[];
  youOwn: string[];
  notLeeway: string[];
  facts: ContractReadableFact[];
}

export interface ContractDocument {
  id: string;
  title: string;
  subtitle: string;
  format: string;
  payload: Record<string, unknown>;
  readable: ContractReadable;
}

/** Boundary that applies to every contract shown in the UI. */
export const LEEWAY_PRODUCT_BOUNDARY = {
  leewayProducts: [
    'LeeWay Device Bridge and its console',
    'LeeWay Industries brand assets',
    'Agentic Universal O.S. (the LeeWay workstation)',
    'The original LeeWay Runtime and its contracts',
  ],
  notLeewayProducts: [
    'Apple, Android, Windows, and Linux platforms',
    'Third-party tools such as n8n and GitHub Codespaces',
    'Your devices, files, accounts on other services, and networks',
  ],
};

export const INITIAL_DEVICES: DeviceNode[] = [
  {
    id: 'dev-macbook-m3',
    name: 'Studio Workstation Mac',
    group: 'laptop',
    groupLabel: 'Laptop',
    platform: 'apple',
    osVersion: 'macOS 15.2 · Metal 3',
    status: 'verified',
    statusLabel: 'Verified · Metal',
    latencyMs: 4.2,
    throughputMbps: 412,
    uptimePct: 99.98,
    syncQueueDepth: 0,
    transport: 'QUIC / WebGPU',
    lastHeartbeat: '2s ago',
  },
  {
    id: 'dev-iphone-16',
    name: 'iPhone 16 Pro Daily',
    group: 'mobile',
    groupLabel: 'Mobile',
    platform: 'apple',
    osVersion: 'iOS 18.2 · Home Screen PWA',
    status: 'verified',
    statusLabel: 'Installed · Qualified',
    latencyMs: 7.8,
    throughputMbps: 268,
    uptimePct: 99.91,
    syncQueueDepth: 2,
    transport: 'iLoader / Metal Bridge',
    lastHeartbeat: '4s ago',
  },
  {
    id: 'dev-ipad-pro',
    name: 'iPad Pro M4 Canvas',
    group: 'tablet',
    groupLabel: 'Tablet',
    platform: 'apple',
    osVersion: 'iPadOS 18.2 · Safari WebGPU',
    status: 'verified',
    statusLabel: 'Qualified · Ready',
    latencyMs: 6.5,
    throughputMbps: 294,
    uptimePct: 99.87,
    syncQueueDepth: 1,
    transport: 'WebRTC DataChannel',
    lastHeartbeat: '5s ago',
  },
  {
    id: 'dev-pixel-9',
    name: 'Pixel 9 Pro Native',
    group: 'mobile',
    groupLabel: 'Mobile',
    platform: 'android',
    osVersion: 'Android 15 · 0.10.0-rc1',
    status: 'warning',
    statusLabel: 'Owner Install Req',
    latencyMs: 9.4,
    throughputMbps: 215,
    uptimePct: 99.42,
    syncQueueDepth: 6,
    transport: 'ADB / Native Bridge',
    lastHeartbeat: '11s ago',
  },
  {
    id: 'dev-win-precision',
    name: 'Windows Dev Rig',
    group: 'desktop',
    groupLabel: 'Desktop',
    platform: 'windows',
    osVersion: 'Windows 11 24H2 · Git/Node',
    status: 'unverified',
    statusLabel: 'Lane Open · Unqualified',
    latencyMs: 11.2,
    throughputMbps: 338,
    uptimePct: 98.95,
    syncQueueDepth: 4,
    transport: 'Codespaces Relay',
    lastHeartbeat: '14s ago',
  },
  {
    id: 'dev-linux-server',
    name: 'Linux Edge Relay',
    group: 'servers',
    groupLabel: 'Servers',
    platform: 'linux',
    osVersion: 'Ubuntu 24.04 LTS · Kernel 6.8',
    status: 'verified',
    statusLabel: 'Relay Active',
    latencyMs: 3.1,
    throughputMbps: 540,
    uptimePct: 99.99,
    syncQueueDepth: 0,
    transport: 'gRPC / WireGuard',
    lastHeartbeat: '1s ago',
  },
  {
    id: 'dev-iot-sensor',
    name: 'ARM Edge Gateway',
    group: 'iot',
    groupLabel: 'IoT / Edge',
    platform: 'linux',
    osVersion: 'Embedded Linux · ARM64',
    status: 'warning',
    statusLabel: 'Telemetry Pending',
    latencyMs: 14.6,
    throughputMbps: 96,
    uptimePct: 99.12,
    syncQueueDepth: 9,
    transport: 'MQTT over TLS',
    lastHeartbeat: '19s ago',
  },
];

export const PLATFORM_LANES: PlatformLane[] = [
  {
    id: 'apple',
    title: 'Apple workspace and native Metal',
    subtitle: 'iPhone / iPad / Mac',
    eyebrow: 'Apple · iPhone / iPad / Mac',
    status: 'warning',
    statusLabel: 'Unsigned IPA · Install not qualified',
    workstationLabel: 'Open Apple Workstation',
    secondaryActionLabel: 'Open Apple Package',
    description:
      'Use the Home Screen app as the daily LeeWay front door. Use the native IPA only when direct Metal service is required.',
    primaryButtonText: 'Open Apple Workstation',
    secondaryButtonText: 'Check Apple Browser',
    packageBadge: 'Apple: unsigned developer artifact',
    nativeBridgeState: 'Unsigned IPA published · owner signing/install not verified',
    metrics: {
      activeNodes: 3,
      avgLatencyMs: 6.2,
      syncRateMbps: 974,
      packetSuccessPct: 99.94,
    },
    details: [
      'Web access is available in Safari; Home Screen installation is a separate browser action.',
      'Native IPA requires owner-controlled signing and installation; do not claim install success from an unsigned build.',
      'Browser observation: Safari compute uses WebGPU when exposed; separate from native Metal.',
    ],
    workstationUrlNote: 'GitHub Codespaces shared editor, terminal, Git, Node & GitHub CLI.',
  },
  {
    id: 'android',
    title: 'Android workspace and native bridge',
    subtitle: 'Phone / Tablet',
    eyebrow: 'Android · Phone / Tablet',
    status: 'warning',
    statusLabel: 'Debug APK · Production signing unverified',
    workstationLabel: 'Open Android Workstation',
    secondaryActionLabel: 'Download Android Extension',
    description:
      'Use the verified Android extension for the Android native lane. The workstation shares the device-neutral LeeWay workplane.',
    primaryButtonText: 'Open Android Workstation',
    secondaryButtonText: 'Download Extension',
    packageBadge: 'Development APK 0.10.0-agent-update-rc1',
    nativeBridgeState: 'Debug artifact SHA-256 recorded · production signing unverified',
    releaseTag: '0.10.0-agent-update-rc1',
    sha256: 'f07bf09c9e23fbdf95910e790eb7e9feef8d6a76a23b16fef0def5c2211b396e',
    metrics: {
      activeNodes: 1,
      avgLatencyMs: 9.4,
      syncRateMbps: 215,
      packetSuccessPct: 99.51,
    },
    details: [
      'Published from GitHub Pages with verified SHA-256 artifact checksum.',
      'Do not assume an update can be installed over a differently signed build; preserve existing app data.',
      'Native extension only — full workstation bundle runs via remote Codespaces lane.',
    ],
    workstationUrlNote: 'Verified Android extension + remote LeeWay development workplane.',
  },
  {
    id: 'windows',
    title: 'Windows development lane',
    subtitle: 'Desktop / Laptop',
    eyebrow: 'Windows · Desktop / Laptop',
    status: 'unverified',
    statusLabel: 'Not Qualified Native',
    workstationLabel: 'Open Windows Workstation',
    secondaryActionLabel: 'Inspect Lane Contract',
    description:
      'Open the LeeWay workspace for source, Git, diagnostics, and device-package work. Native adapter awaits physical qualification evidence.',
    primaryButtonText: 'Open Windows Workstation',
    secondaryButtonText: 'View Contract',
    packageBadge: 'Cloud Lane Ready',
    nativeBridgeState: 'Native Device Bridge: Not Qualified In This Screen',
    metrics: {
      activeNodes: 1,
      avgLatencyMs: 11.2,
      syncRateMbps: 338,
      packetSuccessPct: 99.2,
    },
    details: [
      'Device-neutral GitHub Codespaces workstation available immediately.',
      'Native Windows bridge adapter remains platform-qualified only when physical evidence exists.',
      'Cross-platform synchronization requires actual Runtime and device qualification.',
    ],
    workstationUrlNote: 'Source, Git, diagnostics, and cross-OS package tooling.',
  },
  {
    id: 'linux',
    title: 'Linux development lane',
    subtitle: 'Desktop / Server / Edge',
    eyebrow: 'Linux · Desktop / Server',
    status: 'unverified',
    statusLabel: 'Native Linux installer not published',
    workstationLabel: 'Open Linux Workstation',
    secondaryActionLabel: 'Inspect Edge Relay',
    description:
      'Open the LeeWay workspace for Linux-capable development tools and high-throughput gRPC / WireGuard edge relays.',
    primaryButtonText: 'Open Linux Workstation',
    secondaryButtonText: 'Inspect Relay',
    packageBadge: 'Linux: source/development only',
    nativeBridgeState: 'Native Device Bridge: Planned · Not Yet Qualified',
    metrics: {
      activeNodes: 2,
      avgLatencyMs: 8.8,
      syncRateMbps: 636,
      packetSuccessPct: 99.88,
    },
    details: [
      'Linux relay operation is not verified by this static frontend.',
      'Full Linux native Device Bridge adapter arrives after physical qualification evidence.',
      'Supports ARM64 IoT/Edge telemetry ingestion via MQTT over TLS.',
    ],
    workstationUrlNote: 'Linux-capable tools, container runtime, and edge sync bridge.',
  },
];

export const DEVICE_CONTROLS: DeviceControlSpec[] = [
  {
    id: 'remote-view',
    label: 'Remote View',
    category: 'Session',
    permissionScope: 'display.capture.read',
    requiresOwnerAuth: true,
    latencyBudgetMs: 16,
    supportedPlatforms: ['apple', 'android', 'windows', 'linux'],
    description: 'Zero-copy frame stream over WebRTC/Metal with adaptive bitrate scaling.',
    commandPreview: 'leeway bridge stream --mode=remote-view --codec=hevc',
  },
  {
    id: 'open-shell',
    label: 'Open Shell',
    category: 'Session',
    permissionScope: 'terminal.pty.exec',
    requiresOwnerAuth: true,
    latencyBudgetMs: 12,
    supportedPlatforms: ['apple', 'windows', 'linux'],
    description: 'Attach governed interactive PTY shell over mTLS device bridge.',
    commandPreview: 'leeway shell attach --audit-log=strict',
  },
  {
    id: 'file-access',
    label: 'File Access',
    category: 'Session',
    permissionScope: 'storage.sandbox.rw',
    requiresOwnerAuth: true,
    latencyBudgetMs: 24,
    supportedPlatforms: ['apple', 'android', 'windows', 'linux'],
    description: 'Cross-OS chunked delta sync for workspace artifacts and diagnostic bundles.',
    commandPreview: 'leeway sync pull ./artifacts --verify-sha256',
  },
  {
    id: 'app-control',
    label: 'App Control',
    category: 'Session',
    permissionScope: 'runtime.app.manage',
    requiresOwnerAuth: true,
    latencyBudgetMs: 30,
    supportedPlatforms: ['apple', 'android'],
    description: 'Launch, foreground, or inspect signed PWA and native extension containers.',
    commandPreview: 'leeway app inspect --bundle=dev.leeway.bridge',
  },
  {
    id: 'power',
    label: 'Power',
    category: 'Lifecycle',
    permissionScope: 'hardware.power.state',
    requiresOwnerAuth: true,
    latencyBudgetMs: 45,
    supportedPlatforms: ['windows', 'linux'],
    description: 'Read ACPI / battery telemetry and toggle balanced or performance power profiles.',
    commandPreview: 'leeway power status --profile=low-latency',
  },
  {
    id: 'restart',
    label: 'Restart',
    category: 'Lifecycle',
    permissionScope: 'hardware.power.reboot',
    requiresOwnerAuth: true,
    latencyBudgetMs: 120,
    supportedPlatforms: ['windows', 'linux', 'android'],
    description: 'Graceful daemon drain followed by supervised host restart.',
    commandPreview: 'leeway host reboot --drain-timeout=15s',
  },
  {
    id: 'shutdown',
    label: 'Shutdown',
    category: 'Lifecycle',
    permissionScope: 'hardware.power.halt',
    requiresOwnerAuth: true,
    latencyBudgetMs: 150,
    supportedPlatforms: ['windows', 'linux'],
    description: 'Commit active sync buffers and power down target endpoint cleanly.',
    commandPreview: 'leeway host shutdown --flush-sync=true',
  },
  {
    id: 'wake',
    label: 'Wake',
    category: 'Lifecycle',
    permissionScope: 'network.wol.dispatch',
    requiresOwnerAuth: false,
    latencyBudgetMs: 50,
    supportedPlatforms: ['windows', 'linux', 'apple'],
    description: 'Send signed Wake-on-LAN / Bonjour sleep proxy packet across subnet relay.',
    commandPreview: 'leeway net wake --relay=edge-linux-01',
  },
  {
    id: 'services',
    label: 'Services',
    category: 'System',
    permissionScope: 'daemon.service.inspect',
    requiresOwnerAuth: true,
    latencyBudgetMs: 18,
    supportedPlatforms: ['linux', 'windows', 'apple'],
    description: 'Enumerate launchd, systemd, or Windows background bridge units.',
    commandPreview: 'leeway svc list --filter=bridge-active',
  },
  {
    id: 'processes',
    label: 'Processes',
    category: 'System',
    permissionScope: 'runtime.proc.read',
    requiresOwnerAuth: true,
    latencyBudgetMs: 20,
    supportedPlatforms: ['apple', 'android', 'windows', 'linux'],
    description: 'Inspect CPU, memory pressure, and active WebGPU / Metal compute threads.',
    commandPreview: 'leeway proc top --sort=cpu --limit=20',
  },
  {
    id: 'install-update',
    label: 'Install / Update',
    category: 'System',
    permissionScope: 'package.signed.install',
    requiresOwnerAuth: true,
    latencyBudgetMs: 200,
    supportedPlatforms: ['apple', 'android'],
    description: 'Deliver signed iLoader IPA or SHA-256 verified Android RC1 APK without wiping data.',
    commandPreview: 'leeway pkg verify --sha256=f07bf09c9e23fbdf95910e79',
  },
  {
    id: 'execute-skill',
    label: 'Execute Skill',
    category: 'System',
    permissionScope: 'automation.skill.invoke',
    requiresOwnerAuth: true,
    latencyBudgetMs: 40,
    supportedPlatforms: ['apple', 'android', 'windows', 'linux'],
    description: 'Invoke registered n8n or governed cross-device automation workflow.',
    commandPreview: 'leeway skill run --provider=n8n --env=dev-verified',
  },
];

export const INITIAL_WORKFLOWS: WorkflowRun[] = [
  {
    id: 'wf-1',
    name: 'Device Console UI Acceptance',
    branch: 'main',
    status: 'in_progress',
    statusText: 'in_progress',
    durationSec: 48,
    updatedAt: 'Just now',
    commitHash: '8e41a9c',
  },
  {
    id: 'wf-2',
    name: 'LeeWay Device Bridge Public Onboarding Safety',
    branch: 'main',
    status: 'success',
    statusText: 'completed / success',
    durationSec: 94,
    updatedAt: '3m ago',
    commitHash: '8e41a9c',
  },
  {
    id: 'wf-3',
    name: 'Android Build (0.10.0-agent-update-rc1)',
    branch: 'release/rc1',
    status: 'queued',
    statusText: 'queued',
    durationSec: 12,
    updatedAt: '5m ago',
    commitHash: 'f07bf09',
  },
  {
    id: 'wf-4',
    name: 'Device Console UI Acceptance (Nightly)',
    branch: 'main',
    status: 'queued',
    statusText: 'queued',
    durationSec: 0,
    updatedAt: '14m ago',
    commitHash: 'c3912b4',
  },
  {
    id: 'wf-5',
    name: 'Android Build (Legacy Signing Check)',
    branch: 'feat/bridge-v2',
    status: 'cancelled',
    statusText: 'completed / cancelled',
    durationSec: 31,
    updatedAt: '27m ago',
    commitHash: 'a19d04e',
  },
];

export const INITIAL_ACTIVITY_LOGS: ActivityLogEntry[] = [
  {
    id: 'log-1',
    time: '04:30:48 AM',
    message: 'Cross-platform bridge mesh synchronized 7 nodes (avg 8.8 ms)',
    level: 'success',
    source: 'Bridge Core',
  },
  {
    id: 'log-2',
    time: '04:30:35 AM',
    message: 'Published Android extension manifest verified (SHA-256: f07bf09c...)',
    level: 'info',
    source: 'Android Lane',
  },
  {
    id: 'log-3',
    time: '04:30:18 AM',
    message: 'Read public GitHub Actions workflow status (5 repository runs)',
    level: 'info',
    source: 'CI Telemetry',
  },
  {
    id: 'log-4',
    time: '04:29:52 AM',
    message: 'Apple Home Screen app observed; native Metal IPA queued via iLoader',
    level: 'success',
    source: 'Apple Lane',
  },
  {
    id: 'log-5',
    time: '04:29:22 AM',
    message: 'Windows & Linux native adapters held in unverified posture (observed != verified)',
    level: 'warning',
    source: 'Governance',
  },
];

export const CONTRACT_DOCUMENTS: ContractDocument[] = [
  {
    id: 'llm-entrypoint',
    title: 'LLM Entrypoint',
    subtitle: 'Capability routing within LeeWay only',
    format: 'application/json',
    payload: {
      schema: 'leeway.entrypoint.v1',
      bridge: 'device-agnostic-mesh',
      posture: 'observed != verified',
      supportedLanes: ['apple', 'android', 'windows', 'linux'],
      cloudWorkplane: 'github-codespaces',
      capabilitiesEndpoint: '/contracts/runtime-contract.json',
    },
    readable: {
      summary:
        "This is LeeWay's own internal capability map. It tells approved LeeWay components where to ask for device information and actions. It is not an outside AI service and it contains no API keys.",
      explanation:
        'A request for a capability is not authority. The LeeWay Runtime checks who is asking, which account owns the device, and what evidence exists before anything is displayed or executed.',
      leewayOwns: [
        'This entrypoint contract and its routing rules',
        'Authorization checks before a capability is used',
        'The Device Bridge and Runtime that answer the request',
      ],
      youOwn: [
        'Your LeeWay account and the devices you pair',
        'Your consent for any device action',
        'Your workspace data and communication preferences',
      ],
      notLeeway: [
        'Third-party AI providers or model APIs',
        'The operating systems and apps on your devices',
        'Your network, local files, and other accounts',
      ],
      facts: [
        { label: 'Contract version', value: 'leeway.entrypoint.v1' },
        { label: 'Bridge type', value: 'Device-agnostic mesh' },
        { label: 'Supported lanes', value: 'Apple, Android, Windows, Linux' },
        { label: 'Cloud workplane', value: 'GitHub Codespaces — a workplane, not a LeeWay product' },
        { label: 'Capability source', value: 'The original LeeWay Runtime contract' },
      ],
    },
  },
  {
    id: 'provider-registry',
    title: 'Provider Registry',
    subtitle: 'Which automation tools LeeWay may coordinate with',
    format: 'application/json',
    payload: {
      providers: [
        {
          id: 'n8n',
          state: 'DEVICE_WORKFLOW_EXECUTION_VERIFIED_DEVELOPMENT',
          scope: 'development-verified',
          executesProductionActions: false,
        },
        {
          id: 'github-codespaces',
          state: 'ACTIVE_CLOUD_WORKPLANE',
          storesCredentialsInBrowser: false,
        },
      ],
    },
    readable: {
      summary:
        'This registry lists the outside automation tools LeeWay is allowed to coordinate with, and places limits on what each one may do.',
      explanation:
        'A registered tool is never a LeeWay product and never becomes an authority on its own. Production actions still require the LeeWay Runtime, a verified account, and the right platform evidence.',
      leewayOwns: [
        'The registry and which providers may appear in it',
        'The authorization boundary around every provider',
        'The decision to allow or refuse production actions',
      ],
      youOwn: [
        'The accounts you connect and the actions you approve',
        'Your devices and their platform permissions',
        'Your workflows and the results they produce',
      ],
      notLeeway: [
        'n8n — a development-verified automation tool',
        'GitHub Codespaces — an external cloud workplane',
        'Any provider that is not explicitly registered',
      ],
      facts: [
        { label: 'n8n', value: 'Verified for development only; cannot execute production actions' },
        { label: 'GitHub Codespaces', value: 'Active workplane; no credentials are stored in the browser' },
        { label: 'Production authority', value: 'Always remains with the LeeWay Runtime' },
      ],
    },
  },
  {
    id: 'runtime-contract',
    title: 'Runtime Contract',
    subtitle: 'Evidence and qualification boundary rules',
    format: 'application/json',
    payload: {
      invariant: 'platform-specific execution requires platform-specific evidence',
      apple: { pwaInstalled: true, metalIpa: 'QUALIFIED', installer: 'iLoader' },
      android: {
        release: '0.10.0-agent-update-rc1',
        status: 'QUALIFIED_ARTIFACT_OWNER_INSTALL_REQUIRED',
        sha256: 'f07bf09c9e23fbdf95910e790eb7e9feef8d6a76a23b16fef0def5c2211b396e',
      },
      windows: { nativeAdapter: 'NOT_QUALIFIED_IN_SCREEN' },
      linux: { nativeAdapter: 'PLANNED_NOT_YET_QUALIFIED' },
    },
    readable: {
      summary:
        'The core rule: an action is qualified only on the platform where matching evidence exists. An illustration, animation, or browser session does not mean a device is connected.',
      explanation:
        'LeeWay separates what is observed in the browser from what is verified by the Runtime. Qualified does not mean installed: the owner still performs the install and authorizes the action.',
      leewayOwns: [
        'The qualification rules and evidence checks',
        'Runtime authorization and its receipts',
        'The Device Bridge and its health status rules',
      ],
      youOwn: [
        'Your device, its operating system, and the install decision',
        'Your signing identity and certificates',
        'The authorization you give for each device action',
      ],
      notLeeway: [
        'Apple iLoader, Android packages, and OS installers are platform tools',
        'Unverified screens, animations, and sample telemetry',
        'Diagnostic probes that failed or returned no evidence',
      ],
      facts: [
        { label: 'Rule', value: 'Platform-specific execution requires platform-specific evidence' },
        { label: 'Apple', value: 'Home Screen app installed; Metal package qualified through iLoader' },
        { label: 'Android', value: 'RC1 artifact qualified; owner installation still required' },
        { label: 'Windows', value: 'Native adapter not qualified in this view' },
        { label: 'Linux', value: 'Native adapter planned, not yet qualified' },
      ],
    },
  },
  {
    id: 'platform-architecture',
    title: 'Platform Architecture',
    subtitle: 'How devices form the digital bridge',
    format: 'application/json',
    payload: {
      topology: 'hub-and-spoke-digital-bridge',
      groups: ['Desktop', 'Laptop', 'Mobile', 'Tablet', 'Servers', 'IoT / Edge'],
      transports: ['QUIC', 'WebRTC DataChannel', 'gRPC/WireGuard', 'MQTT-TLS'],
      targetLatencyBudgetMs: 15,
    },
    readable: {
      summary:
        'Devices are grouped around a hub-and-spoke bridge. The bridge coordinates state between lanes; it does not own the devices or the networks they use.',
      explanation:
        'The transport shown here is a target, not proof of a live connection. Actual connectivity is reported only from the LeeWay Runtime against a verified device.',
      leewayOwns: [
        'The bridge topology and synchronization plane',
        'Transport selection and qualification status',
        'The observed versus verified posture of this UI',
      ],
      youOwn: [
        'The endpoints you enroll',
        'The networks those endpoints connect through',
        'Which devices may join your workspace',
      ],
      notLeeway: [
        'The devices and operating systems themselves',
        'Networks you provide that LeeWay does not operate',
        'Illustrations and sample data shown in this interface',
      ],
      facts: [
        { label: 'Topology', value: 'Hub-and-spoke digital bridge' },
        { label: 'Groups', value: 'Desktop, Laptop, Mobile, Tablet, Servers, IoT / Edge' },
        { label: 'Transports', value: 'QUIC, WebRTC DataChannel, gRPC/WireGuard, MQTT-TLS' },
        { label: 'Target latency', value: '15 ms budget' },
      ],
    },
  },
];
