import React, { useMemo, useState } from 'react';
import {
  Activity,
  FileCode2,
  GitBranch,
  HardDrive,
  RefreshCw,
  Search,
  Shield,
  Workflow,
} from 'lucide-react';
import {
  ActivityLogEntry,
  CONTRACT_DOCUMENTS,
  DeviceGroupKey,
  DeviceNode,
  PlatformKey,
  WorkflowRun,
} from '../data/bridgeData';
import { formatPlatformLabel } from '../utils/telemetryLogic';
import { StatusIndicator } from './StatusBadge';

interface OperationsMatrixProps {
  devices: DeviceNode[];
  selectedGroup: DeviceGroupKey | 'all';
  selectedPlatform: PlatformKey | 'all';
  onSelectGroup: (g: DeviceGroupKey | 'all') => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  unverifiedPosture: boolean;
  workflows: WorkflowRun[];
  activityLogs: ActivityLogEntry[];
  onInspectContract: (docId: string) => void;
  onRefreshWorkflows: () => void;
}

const GROUP_FILTERS: Array<{ id: DeviceGroupKey | 'all'; label: string }> = [
  { id: 'all', label: 'All Devices' },
  { id: 'desktop', label: 'Desktop' },
  { id: 'laptop', label: 'Laptop' },
  { id: 'mobile', label: 'Mobile' },
  { id: 'tablet', label: 'Tablet' },
  { id: 'servers', label: 'Servers' },
  { id: 'iot', label: 'IoT / Edge' },
];

export const OperationsMatrix: React.FC<OperationsMatrixProps> = ({
  devices,
  selectedGroup,
  selectedPlatform,
  onSelectGroup,
  searchQuery,
  onSearchQueryChange,
  unverifiedPosture,
  workflows,
  activityLogs,
  onInspectContract,
  onRefreshWorkflows,
}) => {
  const [workflowFilter, setWorkflowFilter] = useState<'all' | 'active' | 'completed'>('all');

  const filteredWorkflows = useMemo(() => {
    if (workflowFilter === 'active') {
      return workflows.filter((w) => w.status === 'in_progress' || w.status === 'queued');
    }
    if (workflowFilter === 'completed') {
      return workflows.filter((w) => w.status === 'success' || w.status === 'cancelled');
    }
    return workflows;
  }, [workflows, workflowFilter]);

  return (
    <section id="operations" className="space-y-4">
      {/* Row 1: Owner-Scoped Device Inventory */}
      <div className="grid grid-cols-1 gap-4">
        <div className="rounded-xl border border-slate-800 bg-[#0B121B] p-4 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                Cross-Platform Device Inventory
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {unverifiedPosture
                  ? 'Discovery posture active: owner authorization required before remote execution'
                  : `Showing ${devices.length} synchronized endpoints across ${
                      selectedPlatform === 'all' ? 'all OS lanes' : formatPlatformLabel(selectedPlatform)
                    }`}
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <label htmlFor="device-search" className="sr-only">
                Search devices
              </label>
              <input
                id="device-search"
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder="Filter device or transport..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#070C13] border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60"
              />
            </div>
          </div>

          {/* 6 Device Group Segmented Filter Tabs */}
          <div className="flex items-center gap-1 flex-wrap bg-[#070C13] border border-slate-800/80 rounded-lg p-1">
            {GROUP_FILTERS.map((gf) => (
              <button
                key={gf.id}
                type="button"
                onClick={() => onSelectGroup(gf.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  selectedGroup === gf.id
                    ? 'bg-slate-800 text-cyan-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {gf.label}
              </button>
            ))}
          </div>

          {/* Device Table or Empty/Unverified State */}
          {unverifiedPosture ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center rounded-lg border border-dashed border-amber-500/35 bg-amber-500/5 p-6">
              <Shield className="w-7 h-7 text-amber-400 mb-2" />
              <h3 className="text-sm font-semibold text-amber-200">
                Browser Bridge Session Unverified
              </h3>
              <p className="text-xs text-slate-400 max-w-md mt-1 leading-relaxed">
                No authenticated owner-scoped device inventory is exposed in pre-auth discovery
                mode. No device count or online state is inferred from illustration or browser
                metadata (observed != verified).
              </p>
            </div>
          ) : devices.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center rounded-lg border border-slate-800 bg-[#070C13] p-6">
              <p className="text-sm font-medium text-slate-300">No devices match current filters</p>
              <button
                type="button"
                onClick={() => {
                  onSelectGroup('all');
                  onSearchQueryChange('');
                }}
                className="mt-2 px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-medium text-cyan-300 hover:bg-slate-700 cursor-pointer"
              >
                Reset Device Filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-800/90">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#070C13] border-b border-slate-800 text-[11px] font-medium text-slate-400">
                    <th className="py-2.5 px-3">Device</th>
                    <th className="py-2.5 px-3">Platform · Transport</th>
                    <th className="py-2.5 px-3 text-right">Throughput</th>
                    <th className="py-2.5 px-3 text-right">Latency</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-xs">
                  {devices.map((dev) => (
                    <tr
                      key={dev.id}
                      onClick={() => onSelectGroup(dev.group === selectedGroup ? 'all' : dev.group)}
                      className="hover:bg-slate-900/70 transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-100">{dev.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {dev.groupLabel} · {dev.lastHeartbeat}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="text-slate-200">{dev.osVersion}</div>
                        <div className="text-[11px] font-mono text-slate-500">{dev.transport}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-200">
                        {dev.throughputMbps} MB/s
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-cyan-300">
                        {dev.latencyMs.toFixed(1)} ms
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusIndicator status={dev.status} label={dev.statusLabel} compact />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Live GitHub Actions + Automation Providers + Contracts + Activity Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Live GitHub Actions & n8n Automation Provider */}
        <div className="lg:col-span-6 rounded-xl border border-slate-800 bg-[#0B121B] p-4 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-cyan-400" />
                Live GitHub Actions · Repository Workflows
              </h2>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center bg-[#070C13] border border-slate-800 rounded-lg p-0.5 text-xs">
                  {(['all', 'active', 'completed'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setWorkflowFilter(f)}
                      className={`px-2 py-0.5 rounded capitalize cursor-pointer ${
                        workflowFilter === f
                          ? 'bg-slate-800 text-cyan-300'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={onRefreshWorkflows}
                  aria-label="Refresh workflow status"
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-800/80 border border-slate-800/80 rounded-lg bg-[#070C13]">
              {filteredWorkflows.map((wf) => (
                <div
                  key={wf.id}
                  className="px-3 py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-slate-200 truncate">{wf.name}</div>
                    <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                      {wf.branch} · {wf.commitHash} · {wf.updatedAt}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-[11px] text-slate-500 tabular-nums hidden sm:inline">
                      {wf.durationSec > 0 ? `${wf.durationSec}s` : '—'}
                    </span>
                    <StatusIndicator status={wf.status} label={wf.statusText} compact />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Registered Automation Providers + Technical Contracts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="rounded-lg border border-slate-800 bg-[#070C13] p-3 space-y-1.5">
              <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Workflow className="w-3.5 h-3.5 text-amber-400" />
                Registered Automation Provider
              </div>
              <div className="font-mono text-[11px] text-cyan-300 break-all">
                n8n · DEVICE_WORKFLOW_EXECUTION_VERIFIED_DEVELOPMENT
              </div>
              <p className="text-[11px] text-slate-500">
                Source declaration only; runtime actions require explicit owner authorization.
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-[#070C13] p-3 space-y-2">
              <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <FileCode2 className="w-3.5 h-3.5 text-cyan-400" />
                Machine-Readable Contracts
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {CONTRACT_DOCUMENTS.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => onInspectContract(doc.id)}
                    className="text-left text-[11px] text-cyan-300 hover:text-cyan-200 hover:underline truncate cursor-pointer"
                  >
                    {doc.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Live Activity Logs */}
        <div className="lg:col-span-6 rounded-xl border border-slate-800 bg-[#0B121B] p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Activity &amp; Synchronization Audit Logs
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time stream of bridge discoveries, browser probes, and governed actions
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
              {activityLogs.length} events
            </span>
          </div>

          <div
            className="flex-1 rounded-lg border border-slate-800/80 bg-[#070C13] divide-y divide-slate-800/70 max-h-[300px] overflow-y-auto"
            data-testid="activity-log-list"
          >
            {activityLogs.map((entry) => {
              const levelStatus =
                entry.level === 'success'
                  ? 'verified'
                  : entry.level === 'warning'
                    ? 'warning'
                    : entry.level === 'error'
                      ? 'critical'
                      : 'in_progress';
              return (
                <div
                  key={entry.id}
                  className="px-3 py-2.5 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="text-slate-200 leading-snug">{entry.message}</div>
                    <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                      {entry.time} · {entry.source}
                    </div>
                  </div>
                  <StatusIndicator
                    status={levelStatus}
                    label={entry.level.toUpperCase()}
                    compact
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
