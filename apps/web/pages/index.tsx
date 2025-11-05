// import { ChartByDomain } from "@/components/chart-by-domain"
import type { Page } from "@/components/data-table"
import { DataTable } from "@/components/data-table"
import type { SortingState } from "@tanstack/react-table"
import { useEffect, useMemo, useState } from "react"
import { trpc } from "../utils/trpc"
import { ChartByDomain } from "@/components/chart-by-domain"

export default function Home() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sorting, setSorting] = useState<SortingState>([
    { id: "lastUpdated", desc: true }
  ])
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      // Reset to first page when search changes
      setPage(1)
    }, 300)

    return () => clearTimeout(timer)
  }, [search])

  // Convert sorting state to API format
  const sort = useMemo(() => {
    if (sorting.length === 0) return "lastUpdated"
    const sortField = sorting[0].id as "lastUpdated" | "trafficEstimate" | "domainAuthority" | "mentionsCount"
    return sortField || "lastUpdated"
  }, [sorting])

  const order = useMemo(() => {
    if (sorting.length === 0) return "desc"
    return sorting[0].desc ? "desc" : "asc"
  }, [sorting])

  const { data, isLoading, error } = (trpc as any).csv.list.useQuery({
    page,
    limit: pageSize,
    sort,
    order,
    search: debouncedSearch || undefined,
  })

  const handleSortingChange = (newSorting: SortingState) => {
    setSorting(newSorting)
    // Reset to first page when sorting changes
    setPage(1)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
  }

  const handleSearchChange = (newSearch: string) => {
    setSearch(newSearch)
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Pages</h1>
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <p>Loading...</p>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-10">
          <p className="text-destructive">Error: {error.message}</p>
        </div>
      ) : data && data.data && data.data.length > 0 ? (
        <>
          <DataTable
            data={data.data as Page[]}
            page={page}
            pageSize={pageSize}
            total={data.total}
            sorting={sorting}
            search={search}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onSortingChange={handleSortingChange}
            onSearchChange={handleSearchChange}
          />
          <ChartByDomain />
        </>
      ) : (
        <div className="flex items-center justify-center py-10">
          <p>No data available. Upload a CSV file to get started.</p>
        </div>
      )}
    </div>
  )
}
