import { ChevronDown, Radio } from 'lucide-react';

interface Props {
  channels: string[];
  value: string;
  onChange: (c: string) => void;
}

export default function ChannelFilter({ channels, value, onChange }: Props) {
  return (
    <div className="relative">
      <Radio className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-ghost pointer-events-none" />
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label="Filter by channel"
        className="w-full sm:w-56 appearance-none bg-surface border border-line rounded-xl pl-12 pr-12 py-4
          font-pixel text-ink text-xl cursor-pointer
          focus:outline-none focus:border-accent/50 focus:bg-elevated focus:ring-1 focus:ring-accent/20
          transition-all duration-200"
      >
        <option value="all">All channels</option>
        {channels.map(channel => (
          <option key={channel} value={channel}>
            {channel}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-ghost pointer-events-none" />
    </div>
  );
}
