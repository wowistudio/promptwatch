"use client"

import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    SortingState,
    useReactTable,
    VisibilityState,
} from "@tanstack/react-table"
import * as React from "react"

import { DataTableColumnHeader } from "@/components/data-table-column-header"
import { DataTablePagination } from "@/components/data-table-pagination"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

export type Page = {
    id: number
    url: string
    title: string
    aiModelMentioned: string
    citationsCount: number
    sentiment: string
    visibilityScore: number
    competitorMentioned: string
    queryCategory: string
    trafficEstimate: number
    domainAuthority: number
    mentionsCount: number
    positionInResponse: number
    responseType: string
    geographicRegion: string
    lastUpdated: Date
    createdAt: Date
}

export const columns: ColumnDef<Page>[] = [
    {
        accessorKey: "url",
        enableSorting: false,
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="URL" />
        ),
        cell: ({ row }) => (
            <div className="max-w-[300px] truncate font-medium">
                {row.getValue("url")}
            </div>
        ),
    },
    {
        accessorKey: "title",
        enableSorting: false,
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Title" />
        ),
        cell: ({ row }) => (
            <div className="max-w-[300px] truncate">{row.getValue("title")}</div>
        ),
    },
    {
        accessorKey: "aiModelMentioned",
        enableSorting: false,
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="AI Model" />
        ),
        cell: ({ row }) => (
            <div className="capitalize">{row.getValue("aiModelMentioned")}</div>
        ),
    },
    {
        accessorKey: "trafficEstimate",
        enableSorting: true,
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Traffic Estimate" />
        ),
        cell: ({ row }) => {
            const traffic = parseFloat(row.getValue("trafficEstimate"))
            return (
                <div className="text-right font-medium">
                    {traffic.toLocaleString()}
                </div>
            )
        },
    },
    {
        accessorKey: "domainAuthority",
        enableSorting: true,
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Domain Authority" />
        ),
        cell: ({ row }) => {
            return <div className="text-right">{row.getValue("domainAuthority")}</div>
        },
    },
    {
        accessorKey: "mentionsCount",
        enableSorting: true,
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Mentions" />
        ),
        cell: ({ row }) => {
            return <div className="text-right">{row.getValue("mentionsCount")}</div>
        },
    },
    {
        accessorKey: "lastUpdated",
        enableSorting: true,
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Last Updated" />
        ),
        cell: ({ row }) => {
            const date = row.getValue("lastUpdated") as Date
            return (
                <div className="whitespace-nowrap">
                    {new Date(date).toLocaleDateString()}
                </div>
            )
        },
    },
]

interface DataTableProps {
    data: Page[]
    page: number
    pageSize: number
    total: number
    sorting: SortingState
    search: string
    onPageChange: (page: number) => void
    onPageSizeChange: (pageSize: number) => void
    onSortingChange: (sorting: SortingState) => void
    onSearchChange: (search: string) => void
}

export function DataTable({
    data,
    page,
    pageSize,
    total,
    sorting,
    search,
    onPageChange,
    onPageSizeChange,
    onSortingChange,
    onSearchChange,
}: DataTableProps) {
    const [columnVisibility, setColumnVisibility] =
        React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})

    const table = useReactTable({
        data,
        columns,
        pageCount: Math.ceil(total / pageSize),
        state: {
            sorting,
            columnVisibility,
            rowSelection,
            pagination: {
                pageIndex: page - 1,
                pageSize,
            },
        },
        onSortingChange: (updater) => {
            const newSorting = typeof updater === "function" ? updater(sorting) : updater
            onSortingChange(newSorting)
        },
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        manualSorting: true,
    })

    return (
        <div className="w-full">
            <div className="flex items-center py-4">
                <Input
                    placeholder="Filter URLs..."
                    value={search}
                    onChange={(event) => {
                        onSearchChange(event.target.value)
                    }}
                    className="max-w-sm"
                />

            </div>
            <div className="overflow-hidden rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="py-4">
                <DataTablePagination
                    table={table}
                    onPageChange={onPageChange}
                    onPageSizeChange={onPageSizeChange}
                />
            </div>
        </div>
    )
}

