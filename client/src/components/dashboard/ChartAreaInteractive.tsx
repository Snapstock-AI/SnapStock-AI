import { useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const RANGE_OPTIONS = [
  { days: 90, label: 'Last 3 months' },
  { days: 30, label: 'Last 30 days' },
  { days: 7, label: 'Last 7 days' },
] as const

const chartConfig = {
  scans: { label: 'Scans', color: 'var(--chart-1)' },
} satisfies ChartConfig

type Point = { day: string; value: number }

function toKey(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** The API only returns days with scans, so fill the gaps with zero for a continuous area. */
function fillDays(points: Point[], days: number) {
  const byDay = new Map(points.map((p) => [p.day.slice(0, 10), p.value]))
  const out: Array<{ date: string; scans: number }> = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = toKey(d)
    out.push({ date: key, scans: byDay.get(key) ?? 0 })
  }
  return out
}

const formatDay = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

type Props = {
  points: Point[]
  windowDays: number
  onWindowChange: (days: number) => void
}

export default function ChartAreaInteractive({ points, windowDays, onWindowChange }: Props) {
  const data = useMemo(() => fillDays(points, windowDays), [points, windowDays])
  const total = data.reduce((sum, d) => sum + d.scans, 0)
  const label = RANGE_OPTIONS.find((o) => o.days === windowDays)?.label.toLowerCase() ?? `last ${windowDays} days`

  return (
    <Card className="@container/card">
      <CardHeader className="relative flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <CardTitle className="text-lg">Scan activity</CardTitle>
          <CardDescription>
            <span className="hidden @[540px]/card:inline">{total} completed shelf scans in the {label}</span>
            <span className="@[540px]/card:hidden">{total} scans · {label}</span>
          </CardDescription>
        </div>
        <ToggleGroup
          type="single"
          value={String(windowDays)}
          onValueChange={(value) => value && onWindowChange(Number(value))}
          variant="outline"
          className="hidden @[767px]/card:flex"
          aria-label="Time range"
        >
          {RANGE_OPTIONS.map((option) => (
            <ToggleGroupItem key={option.days} value={String(option.days)} className="h-9 px-3.5">
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Select value={String(windowDays)} onValueChange={(value) => onWindowChange(Number(value))}>
          <SelectTrigger className="mt-2 w-40 @[767px]/card:hidden sm:mt-0" aria-label="Select time range">
            <SelectValue placeholder="Last 7 days" />
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map((option) => (
              <SelectItem key={option.days} value={String(option.days)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart data={data} margin={{ left: 12, right: 12 }}>
            <defs>
              <linearGradient id="fillScans" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-scans)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-scans)" stopOpacity={0.08} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={formatDay}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent labelFormatter={(value) => formatDay(String(value))} indicator="dot" />}
            />
            <Area
              dataKey="scans"
              type="natural"
              fill="url(#fillScans)"
              stroke="var(--color-scans)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
