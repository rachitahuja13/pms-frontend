import { Loader2 } from 'lucide-react';

export default function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="spinner-wrap">
      <Loader2 size={20} strokeWidth={2} />
      {label}
    </div>
  );
}
