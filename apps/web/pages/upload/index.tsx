import {
    Dropzone,
    DropzoneContent,
    DropzoneEmptyState,
} from "@/components/ui/shadcn-io/dropzone";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { trpc } from "../../utils/trpc";
import ProcessCsv from "./ProcessCsv";

export default function Upload() {
    const [file, setFile] = useState<File | null>(null);
    const [content, setContent] = useState<string>("");
    const [errors, setErrors] = useState<string>("");
    const [uploadId, setUploadId] = useState<string | null>(null);
    const [signedUrl, setSignedUrl] = useState<string | null>(null);

    const validateMutation = trpc.csv.validate.useMutation();

    const handleFilesSelected = async (files: File[]) => {
        const selectedFile = files?.[0];
        if (!selectedFile) return;
        setFile(selectedFile);
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            setContent(text);
        };
        reader.readAsText(selectedFile);
    };

    const handleValidate = async () => {
        const toastId = toast.info("Validating file...");
        try {
            const result = await validateMutation.mutateAsync({ content });
            if (result.success) {
                toast.success("File validated successfully!", { id: toastId });
                setErrors("");
                console.log(result.data);
                setUploadId(result.data?.uploadId);
                setSignedUrl(result.data?.signedUrl);
            } else {
                toast.error("File validation error", { id: toastId });
                console.error(result.error);
                setErrors(result.error || "File validation error");
            }
        } catch (error) {
            toast.error("File validation error", { id: toastId });
            console.error(error);
            setErrors("File validation error");
        }
    }

    useEffect(() => {
        if (content) {
            handleValidate();
        }
    }, [content]);

    return (
        <div className="mx-auto max-w-3xl p-8">
            <div>
                <Dropzone
                    accept={{ "text/csv": [".csv"] }}
                    maxFiles={1}
                    onDrop={(accepted) => handleFilesSelected(accepted)}
                    src={file ? [file] : undefined}
                    className="justify-center"
                >
                    <DropzoneEmptyState />
                    <DropzoneContent />
                </Dropzone>
            </div>

            {(errors || validateMutation.isError) && (
                <p className="mt-4 text-red-500 text-sm">
                    {errors || validateMutation.error?.message || "An error occurred"}
                </p>
            )}

            {validateMutation.isSuccess && !errors && !!uploadId && !!signedUrl && (
                <ProcessCsv
                    content={content}
                    uploadId={uploadId}
                    signedUrl={signedUrl}
                />
            )}
        </div>
    );
}