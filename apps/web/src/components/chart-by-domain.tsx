import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { trpc } from "../../utils/trpc"

export function ChartByDomain() {
    const [limit, setLimit] = useState<number | "all">(10)
    const { data, isLoading, error } = (trpc as any).csv.countPerDomain.useQuery({})

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Count per Domain</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-10">
                        <p>Loading chart data...</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Count per Domain</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-10">
                        <p className="text-destructive">Error: {error.message}</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Count per Domain</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-10">
                        <p>No data available</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const chartConfig = {
        count: {
            label: "Count",
            color: "hsl(var(--chart-1))",
        },
    }

    // Filter data based on selected limit
    const displayData = limit === "all" ? data : data.slice(0, limit)

    return (
        <Card>
            <CardHeader>
                <CardTitle>Count per Domain</CardTitle>
                <CardAction>
                    <Select
                        value={limit === "all" ? "all" : limit.toString()}
                        onValueChange={(value) => {
                            setLimit(value === "all" ? "all" : parseInt(value, 10))
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select limit" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10">Top 10</SelectItem>
                            <SelectItem value="20">Top 20</SelectItem>
                            <SelectItem value="30">Top 30</SelectItem>
                            <SelectItem value="all">All</SelectItem>
                        </SelectContent>
                    </Select>
                </CardAction>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig}>
                    <BarChart data={displayData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="domain"
                            angle={-45}
                            textAnchor="end"
                            height={100}
                            interval={0}
                        />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}