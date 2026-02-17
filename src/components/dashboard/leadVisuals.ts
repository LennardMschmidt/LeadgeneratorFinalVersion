import { type CSSProperties } from 'react';
import { Lead, LeadStatus } from './types';

export const TIER_BADGE_STYLES: Record<Lead['tier'], string> = {
  'Tier 1': 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  'Tier 2': 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  'Tier 3': 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
};

export const STATUS_VISUALS: Record<
  LeadStatus,
  {
    triggerStyle: CSSProperties;
    optionClassName: string;
    badgeClassName: string;
  }
> = {
  New: {
    triggerStyle: {
      borderColor: 'rgba(45, 212, 191, 0.42)',
      backgroundColor: 'rgba(20, 184, 166, 0.16)',
      color: 'rgb(153, 246, 228)',
    },
    optionClassName: '!text-teal-300',
    badgeClassName: 'border border-teal-400/40 bg-teal-500/12 text-teal-200',
  },
  Pending: {
    triggerStyle: {
      borderColor: 'rgba(251, 191, 36, 0.42)',
      backgroundColor: 'rgba(245, 158, 11, 0.16)',
      color: 'rgb(253, 230, 138)',
    },
    optionClassName: '!text-amber-300',
    badgeClassName: 'border border-amber-400/40 bg-amber-500/12 text-amber-200',
  },
  Contacted: {
    triggerStyle: {
      borderColor: 'rgba(96, 165, 250, 0.42)',
      backgroundColor: 'rgba(59, 130, 246, 0.16)',
      color: 'rgb(147, 197, 253)',
    },
    optionClassName: '!text-blue-300',
    badgeClassName: 'border border-blue-400/40 bg-blue-500/12 text-blue-200',
  },
  Won: {
    triggerStyle: {
      borderColor: 'rgba(74, 222, 128, 0.42)',
      backgroundColor: 'rgba(34, 197, 94, 0.16)',
      color: 'rgb(134, 239, 172)',
    },
    optionClassName: '!text-green-300',
    badgeClassName: 'border border-green-400/40 bg-green-500/12 text-green-200',
  },
  Lost: {
    triggerStyle: {
      borderColor: 'rgba(248, 113, 113, 0.42)',
      backgroundColor: 'rgba(239, 68, 68, 0.16)',
      color: 'rgb(252, 165, 165)',
    },
    optionClassName: '!text-red-300',
    badgeClassName: 'border border-red-400/40 bg-red-500/12 text-red-200',
  },
  Archived: {
    triggerStyle: {
      borderColor: 'rgba(196, 181, 253, 0.42)',
      backgroundColor: 'rgba(139, 92, 246, 0.16)',
      color: 'rgb(216, 180, 254)',
    },
    optionClassName: '!text-purple-300',
    badgeClassName: 'border border-purple-400/40 bg-purple-500/12 text-purple-200',
  },
};
