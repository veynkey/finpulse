import { GripHorizontal } from 'lucide-react';
import type { LinkGroup } from '../types';

interface PanelHeaderProps {
  title: string;
  linkGroup?: LinkGroup;
  onLinkGroupChange?: (group: LinkGroup) => void;
  actions?: React.ReactNode;
}

const LINK_COLORS: Record<LinkGroup, { bg: string; text: string; label: string }> = {
  BLUE: { bg: 'bg-[#0070f3]', text: 'text-white', label: 'B' },
  GREEN: { bg: 'bg-[#00c853]', text: 'text-black', label: 'G' },
  ORANGE: { bg: 'bg-[#ff9100]', text: 'text-black', label: 'O' },
  PURPLE: { bg: 'bg-[#d500f9]', text: 'text-white', label: 'P' },
  NONE: { bg: 'bg-[#2a2a2a]', text: 'text-[#888]', label: '-' },
};

export default function PanelHeader({
  title,
  linkGroup,
  onLinkGroupChange,
  actions,
}: PanelHeaderProps) {
  const groups: LinkGroup[] = ['BLUE', 'GREEN', 'ORANGE', 'PURPLE', 'NONE'];

  return (
    <div className="h-7 border-b border-border flex items-center px-2 shrink-0 bg-[#14161a] select-none text-xs">
      <div className="drag-handle cursor-move p-0.5 mr-1 hover:text-white text-muted">
        <GripHorizontal className="w-3.5 h-3.5" />
      </div>

      {linkGroup && onLinkGroupChange && (
        <div className="mr-2 flex items-center space-x-1">
          <button
            type="button"
            title={`Current Link Group: ${linkGroup}. Click to cycle.`}
            onClick={() => {
              const currentIdx = groups.indexOf(linkGroup);
              const nextGroup = groups[(currentIdx + 1) % groups.length];
              onLinkGroupChange(nextGroup);
            }}
            className={`w-4 h-4 rounded-sm flex items-center justify-center font-bold text-[10px] ${
              LINK_COLORS[linkGroup].bg
            } ${LINK_COLORS[linkGroup].text}`}
          >
            {LINK_COLORS[linkGroup].label}
          </button>
        </div>
      )}

      <span className="font-semibold uppercase tracking-wider text-text font-mono truncate">
        {title}
      </span>

      <div className="ml-auto flex items-center space-x-2">{actions}</div>
    </div>
  );
}
