import React from 'react';
import { AlertTriangle, CheckCircle2, Clock, ShieldAlert, XCircle } from 'lucide-react';
import { HealthStatus } from '../data/bridgeData';

interface StatusIndicatorProps {
  status: HealthStatus | 'queued' | 'in_progress' | 'success' | 'cancelled';
  label: string;
  compact?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  compact = false,
}) => {
  const config = (() => {
    switch (status) {
      case 'verified':
      case 'success':
        return {
          text: 'text-emerald-400',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
        };
      case 'warning':
      case 'queued':
        return {
          text: 'text-amber-400',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
        };
      case 'in_progress':
        return {
          text: 'text-cyan-400',
          icon: <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />,
        };
      case 'critical':
      case 'cancelled':
        return {
          text: 'text-rose-400',
          icon: <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />,
        };
      case 'unverified':
      default:
        return {
          text: 'text-slate-400',
          icon: <ShieldAlert className="w-3.5 h-3.5 text-slate-400 shrink-0" />,
        };
    }
  })();

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium whitespace-nowrap ${
        compact ? 'text-xs' : 'text-[13px]'
      } ${config.text}`}
    >
      {config.icon}
      <span>{label}</span>
    </span>
  );
};
