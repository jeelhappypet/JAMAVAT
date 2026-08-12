import { Card } from "@/components/ui/Card";

interface AdminStatCardProps {
  label: string;
  value: string;
}

export function AdminStatCard({ label, value }: AdminStatCardProps) {
  return (
    <Card className="flex flex-col gap-1 p-5">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="text-3xl font-bold">{value}</span>
    </Card>
  );
}
