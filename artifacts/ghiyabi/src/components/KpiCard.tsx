interface KpiCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  color?: 'default' | 'green' | 'red' | 'orange' | 'blue';
  icon?: string;
}

const colorMap = {
  default: 'border-border bg-card text-foreground',
  green: 'border-green-200 bg-green-50 text-green-900',
  red: 'border-red-200 bg-red-50 text-red-900',
  orange: 'border-orange-200 bg-orange-50 text-orange-900',
  blue: 'border-blue-200 bg-blue-50 text-blue-900',
};

const valueColorMap = {
  default: 'text-primary',
  green: 'text-green-700',
  red: 'text-red-700',
  orange: 'text-orange-700',
  blue: 'text-blue-700',
};

export function KpiCard({ title, value, subtitle, color = 'default', icon }: KpiCardProps) {
  return (
    <div className={`border rounded-xl p-5 shadow-sm ${colorMap[color]}`}>
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium opacity-70">{title}</p>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      <p className={`text-3xl font-bold mt-2 ${valueColorMap[color]}`}>{value}</p>
      {subtitle && <p className="text-xs mt-1 opacity-60">{subtitle}</p>}
    </div>
  );
}
