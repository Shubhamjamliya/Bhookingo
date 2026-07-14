import { Skeleton } from "@food/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@food/components/ui/card"

export default function DashboardSkeleton() {
  return (
    <div className="px-4 pb-10 lg:px-6 pt-4 animate-pulse">
      <div className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-[0_30px_120px_-60px_rgba(0,0,0,0.28)]">
        
        {/* Header Section Skeleton */}
        <div className="flex flex-col gap-4 border-b border-neutral-200 bg-linear-to-br from-white via-neutral-50 to-neutral-100 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-24 rounded-full bg-neutral-200" />
            <Skeleton className="h-7 w-48 rounded-full bg-neutral-200" />
          </div>
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-10 w-40 rounded-lg bg-neutral-200" />
            <Skeleton className="h-10 w-36 rounded-lg bg-neutral-200" />
          </div>
        </div>

        <div className="space-y-6 px-6 py-6">
          {/* Metric Cards Skeleton Grid (13 items) */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 13 }).map((_, idx) => (
              <Card key={idx} className="border-neutral-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-3 w-24 rounded-full bg-neutral-200" />
                    <Skeleton className="h-6 w-16 rounded-full bg-neutral-200" />
                    <Skeleton className="h-3 w-32 rounded-full bg-neutral-200" />
                  </div>
                  <Skeleton className="h-10 w-10 rounded-xl bg-neutral-200" />
                </div>
              </Card>
            ))}
          </div>

          {/* Charts Row Skeleton */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Revenue trajectory Card (col-span-2) */}
            <Card className="lg:col-span-2 border-neutral-200 bg-white">
              <CardHeader className="flex flex-col gap-2 border-b border-neutral-200 pb-4">
                <Skeleton className="h-5 w-40 rounded-full bg-neutral-200" />
                <Skeleton className="h-4 w-72 rounded-full bg-neutral-200" />
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-col justify-between h-80 space-y-4">
                  {/* Simulated Chart Bars/Areas */}
                  <div className="flex-1 flex items-end gap-3 px-2 border-b border-neutral-200 pb-2">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="flex-1 flex flex-col gap-1 items-center">
                        <Skeleton className="w-full rounded-t-sm bg-neutral-200" style={{ height: `${20 + (i * 7) % 60}%` }} />
                        <Skeleton className="h-3 w-6 rounded-full mt-1 bg-neutral-200" />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-center gap-6">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3.5 w-3.5 rounded-full bg-neutral-200" />
                      <Skeleton className="h-3.5 w-24 rounded-full bg-neutral-200" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3.5 w-3.5 rounded-full bg-neutral-200" />
                      <Skeleton className="h-3.5 w-20 rounded-full bg-neutral-200" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Mix Pie Chart Card */}
            <Card className="border-neutral-200 bg-white">
              <CardHeader className="border-b border-neutral-200 pb-4 flex flex-row items-center justify-between">
                <div className="space-y-2 col-span-1">
                  <Skeleton className="h-5 w-24 rounded-full bg-neutral-200" />
                  <Skeleton className="h-4 w-32 rounded-full bg-neutral-200" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full bg-neutral-200" />
              </CardHeader>
              <CardContent className="pt-6 flex flex-col items-center justify-center">
                {/* Donut Circle */}
                <div className="relative flex items-center justify-center h-48 w-48 rounded-full border-[18px] border-neutral-100">
                  <Skeleton className="h-10 w-16 rounded-full bg-neutral-200" />
                </div>
                <div className="mt-6 w-full grid grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <Card key={idx} className="border-neutral-200 bg-white px-3 py-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
                          <Skeleton className="h-3 w-16 rounded-full bg-neutral-200" />
                        </div>
                        <Skeleton className="h-3 w-6 rounded-full bg-neutral-200" />
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row Skeleton */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Momentum Snapshot Card */}
            <Card className="border-neutral-200 bg-white">
              <CardHeader className="border-b border-neutral-200 pb-4 flex flex-row items-center justify-between">
                <Skeleton className="h-5 w-36 rounded-full bg-neutral-200" />
                <Skeleton className="h-4 w-28 rounded-full bg-neutral-200" />
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-64 flex flex-col justify-between">
                  <div className="flex-1 flex items-end gap-4 px-2 border-b border-neutral-200 pb-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex gap-1 items-end h-full">
                          <Skeleton className="w-1/2 rounded-t-sm bg-neutral-200" style={{ height: `${30 + (i * 11) % 50}%` }} />
                          <Skeleton className="w-1/2 rounded-t-sm bg-neutral-200" style={{ height: `${20 + (i * 13) % 40}%` }} />
                        </div>
                        <Skeleton className="h-3 w-8 rounded-full mt-1 bg-neutral-200" />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-center gap-4 mt-3">
                    <div className="flex items-center gap-1.5">
                      <Skeleton className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
                      <Skeleton className="h-3 w-14 rounded-full bg-neutral-200" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Skeleton className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
                      <Skeleton className="h-3 w-16 rounded-full bg-neutral-200" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Live Signals Card */}
            <Card className="border-neutral-200 bg-white">
              <CardHeader className="border-b border-neutral-200 pb-4">
                <Skeleton className="h-5 w-28 rounded-full bg-neutral-200" />
                <Skeleton className="h-4 w-44 rounded-full bg-neutral-200" />
              </CardHeader>
              <CardContent className="space-y-4 pt-6 h-[300px] overflow-hidden">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="flex items-start gap-3 rounded-xl border border-neutral-100 bg-neutral-50/50 p-3">
                    <Skeleton className="h-5 w-5 rounded-full bg-neutral-200" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-3.5 w-28 rounded-full bg-neutral-200" />
                        <Skeleton className="h-3 w-10 rounded-full bg-neutral-200" />
                      </div>
                      <Skeleton className="h-3 w-40 rounded-full bg-neutral-200" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Order States Card */}
            <Card className="border-neutral-200 bg-white">
              <CardHeader className="border-b border-neutral-200 pb-4">
                <Skeleton className="h-5 w-24 rounded-full bg-neutral-200" />
                <Skeleton className="h-4 w-36 rounded-full bg-neutral-200" />
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50/50 px-3 py-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-lg bg-neutral-200" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-16 rounded-full bg-neutral-200" />
                        <Skeleton className="h-3 w-24 rounded-full bg-neutral-200" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-6 rounded-full bg-neutral-200" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  )
}
