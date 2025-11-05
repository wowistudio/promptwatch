import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "utils/trpc";

export type UploadCsvProps = {
    content: string;
    uploadId: string;
    signedUrl: string;
}

export default function ProcessCsv({ content, uploadId, signedUrl }: UploadCsvProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [startPolling, setStartPolling] = useState(false);
    const [processError, setProcessError] = useState<string>("");
    const processMutation = trpc.csv.process.useMutation();

    const { data: progressData } = trpc.csv.progress.useQuery(
        { id: uploadId },
        { enabled: !!startPolling, refetchInterval: startPolling ? 500 : false }
    );

    useEffect(() => {
        if (progressData?.status === "complete") {
            setStartPolling(false);
        }
    }, [progressData]);

    const totalRows = useMemo(() => Math.max(0, (content?.split("\n").length ?? 1) - 1), [content]);
    const successCount = progressData?.success_count ?? 0;
    const errorCount = progressData?.error_count ?? 0;
    const processedCount = progressData?.total_count ?? 0;
    const skippedCount = progressData?.skipped_count ?? 0;
    const isComplete = progressData?.status === "complete";

    const progressPercentage = useMemo(() => {
        if (!totalRows) return 0;
        return Math.min(1, processedCount / totalRows);
    }, [processedCount, totalRows]);

    useEffect(() => {
        if (progressData?.status === "complete") {
            toast.success("Upload completed.");
        }
    }, [progressData?.status]);


    const uploadFile = async (signedUrl: string): Promise<boolean> => {

        try {
            const response = await fetch(signedUrl, {
                method: "PUT",
                headers: { "Content-Type": "text/csv", },
                body: content,
            });

            if (response.ok) {
                return true;
            } else {
                setProcessError(response.statusText || "Upload failed.");
                return false;
            }
        } catch (error) {
            setProcessError(error as string || "Upload failed.");
            return false;
        }
    };


    const handleProcess = async () => {
        setIsProcessing(true);
        setStartPolling(true);
        setProcessError("");

        const uploadOk = await uploadFile(signedUrl);
        if (!uploadOk) return null;

        const { success: processSuccess, error: processError } = await processMutation.mutateAsync({ id: uploadId });
        if (!processSuccess) {
            toast.error("CSV processing failed.");
            setProcessError(processError as string || "CSV processing failed.");
            return null;
        }
        setIsProcessing(false);
        return null;
    };

    return (
        <div className="mt-6 space-y-6">
            <Button
                onClick={handleProcess}
                variant="outline"
                className="w-full"
                disabled={isProcessing || startPolling}
            >
                {isProcessing || startPolling ? (isComplete ? "Processed" : "Processing…") : "Start the upload"}
            </Button>

            <div className="space-y-3">
                <div className="flex justify-between items-center text-sm space-x-2">
                    <Progress value={progressPercentage * 100} />
                    <span className="tabular-nums w-12 text-right">
                        {Math.round(progressPercentage * 100)}%
                    </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-md border px-3 py-2 bg-white">
                        <div className="text-muted-foreground">Successful</div>
                        <div className="font-medium tabular-nums">{successCount}</div>
                    </div>
                    <div className="rounded-md border px-3 py-2 bg-white">
                        <div className="text-muted-foreground">Errors</div>
                        <div className="font-medium tabular-nums">{errorCount}</div>
                    </div>
                    <div className="rounded-md border px-3 py-2 bg-white">
                        <div className="text-muted-foreground">Skipped</div>
                        <div className="font-medium tabular-nums">{skippedCount}</div>
                    </div>
                    <div className="rounded-md border px-3 py-2 bg-white">
                        <div className="text-muted-foreground">Processed</div>
                        <div className="font-medium tabular-nums">{processedCount}/{totalRows}</div>
                    </div>
                </div>
            </div>

            {processError && (
                <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                    <strong>Processing Error:</strong> {processError}
                </div>
            )}
        </div>
    );
}