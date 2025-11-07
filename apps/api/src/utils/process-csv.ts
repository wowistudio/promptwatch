import { prisma } from "@repo/database";
import { randomInt } from "crypto";

// artificial delay to make progress bar look more realistic
const CSV_UPLOAD_BATCH_DELAY_MS = 200

async function uploadToDB(batch: any[]) {
    // we could also ignore where all values are the same as the existing page

    // assuming that existing pages do not need to be updated
    const existingPages = await prisma.page.findMany({
        where: {
            url: { in: batch.map((item) => item.url) },
            lastUpdated: { in: batch.map((item) => new Date(item.lastUpdated)) },
        },
    });

    console.log(`Found ${existingPages.length} existing pages`);

    // create the new pages
    const newPages = batch.filter((item) => {
        return !existingPages.some((existingPage) => {
            const dateA = new Date(item.lastUpdated);
            const dateB = new Date(existingPage.lastUpdated);
            return dateA.getTime() === dateB.getTime();
        });
    });

    console.log(`Creating ${newPages.length} new pages`);

    const result = await prisma.page.createMany({
        data: newPages.map((item) => ({
            url: item.url,
            domain: item.url.match(/https?:\/\/([^/]+)/)?.[1] || "",
            title: item.title,
            aiModelMentioned: item.aiModelMentioned,
            citationsCount: parseInt(item.citationsCount),
            sentiment: item.sentiment,
            visibilityScore: parseInt(item.visibilityScore),
            competitorMentioned: item.competitorMentioned,
            queryCategory: item.queryCategory,
            trafficEstimate: parseInt(item.trafficEstimate),
            domainAuthority: parseInt(item.domainAuthority),
            mentionsCount: parseInt(item.mentionsCount),
            positionInResponse: parseInt(item.positionInResponse),
            responseType: item.responseType,
            geographicRegion: item.geographicRegion,
            lastUpdated: new Date(item.lastUpdated),
        })),
    });

    await new Promise(resolve => setTimeout(resolve, randomInt(0, CSV_UPLOAD_BATCH_DELAY_MS)));

    return {
        "success_count": result.count,
        "skipped_count": existingPages.length ?? 0,
        "error_count": 0,
        "total_count": batch.length ?? 0,
    }
}

// Immediately signal ready
process.on("message", async (msg: { type: "work"; data: any[] }) => {
    const result = await uploadToDB(msg.data);
    process.send?.({ type: "result", data: result });
    process.send?.({ type: "ready" });
});