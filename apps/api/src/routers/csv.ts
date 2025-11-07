import { publicProcedure, router } from "@/trpc.js";
import { BUCKET_NAME, CSVUploader, storageClient } from "@/utils/orchestrator.js";
import { Pool } from "@/utils/pool.js";
import { getSignedUrl } from "@/utils/signedurl.js";
import { validateCSV } from "@/utils/validator.js";
import { prisma } from "@repo/database";
import Papa from "papaparse";
import { v4 as uuidv4 } from 'uuid';
import { z } from "zod";

type TUploadResult = {
    success_count: number;
    error_count: number;
    total_count: number;
    skipped_count: number;
    status: "processing" | "complete";
}
const uploadProgressMap: { [uploadId: string]: TUploadResult } = {};


export const csvRouter = router({
    validate: publicProcedure
        .input(
            z.object({
                content: z.string().min(1, "CSV content cannot be empty"),
            }),
        )
        .mutation(async ({ input }) => {
            const validationResult = validateCSV(input.content);
            const uploadId = uuidv4();

            return validationResult || {
                success: true,
                error: null,
                data: {
                    uploadId: uploadId,
                    signedUrl: await getSignedUrl(uploadId),
                }
            };
        }),
    process: publicProcedure
        .input(
            z.object({
                id: z.string().uuid("ID must be a valid UUID"),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            const uploadId = input.id;
            const parser = Papa.parse(Papa.NODE_STREAM_INPUT, {
                header: true,
                skipEmptyLines: true,
                transformHeader: (header: string) => {
                    return header.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
                },
            });

            uploadProgressMap[uploadId] = {
                success_count: 0,
                error_count: 0,
                total_count: 0,
                skipped_count: 0,
                status: "processing",
            };


            const onResult = async (data: any) => {
                const currValue = uploadProgressMap[uploadId];
                console.log("ON RESULT", data)
                const { success_count, error_count, total_count, skipped_count } = data;
                uploadProgressMap[uploadId] = {
                    success_count: success_count + currValue.success_count,
                    error_count: error_count + currValue.error_count,
                    total_count: total_count + currValue.total_count,
                    skipped_count: skipped_count + currValue.skipped_count,
                    status: "processing",
                };
            }

            const onFinished = () => {
                uploadProgressMap[uploadId] = {
                    ...uploadProgressMap[uploadId],
                    status: "complete",
                };
            }

            const stream = storageClient
                .bucket(BUCKET_NAME)
                .file(`${input.id}.csv`)
                .createReadStream()

            const uploader = new CSVUploader(
                new Pool("./src/utils/process-csv.js", 3, onResult),
                stream,
                parser,
                onFinished
            );
            await uploader.start();

            return {
                success: true,
                error: null,
                data: {
                    progress: 0,
                }
            };
        }),

    progress: publicProcedure
        .input(
            z.object({
                id: z.string().uuid("ID must be a valid UUID"),
            }),
        )
        .query(async ({ input }) => {
            return uploadProgressMap[input.id]
        }),

    list: publicProcedure
        .input(
            z.object({
                page: z.number().min(1).default(1),
                limit: z.number().min(1).max(100).default(10),
                sort: z.enum(["lastUpdated", "trafficEstimate", "domainAuthority", "mentionsCount"]).default("lastUpdated" as const),
                order: z.enum(["asc", "desc"]).default("desc"),
                search: z.string().optional(),
            }),
        )
        .query(async ({ input }) => {
            const where = input.search
                ? {
                    url: {
                        contains: input.search,
                        mode: "insensitive" as const,
                    },
                }
                : {};

            const [data, total] = await Promise.all([
                prisma.page.findMany({
                    where,
                    orderBy: {
                        [input.sort]: input.order,
                    },
                    skip: (input.page - 1) * input.limit,
                    take: input.limit,
                }),
                prisma.page.count({ where }),
            ]);

            return {
                data,
                total,
                page: input.page,
                limit: input.limit,
            };
        }),
    countPerDomain: publicProcedure
        .input(
            z.object({
            }),
        )
        .query(async ({ input }) => {
            const data = await prisma.page.groupBy({
                by: ['domain'],
                _count: {
                    _all: true,
                },
            });
            return data
                .map((item) => ({
                    domain: item.domain,
                    count: item._count._all,
                }))
                .sort((a, b) => b.count - a.count);
        }),
});