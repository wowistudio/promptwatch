import { prisma } from "@repo/database";
import console from "console";
import { randomInt } from "crypto";

let consumerIndex: number | null = null;

type BatchMessage = { type: "batch"; data: any[] };
type ShutdownMessage = { type: "shutdown" };
type IndexMessage = { type: "index"; data: number };
type ResultMessage = { type: "result"; data: { success_count: number; error_count: number } };
type ConsumerMessage = BatchMessage | ShutdownMessage | IndexMessage | ResultMessage;

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
            console.log(`Comparing dates: ${dateA.getTime()} and ${dateB.getTime()}`);
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

    // artificial delay to make progress bar look more realistic
    await new Promise(resolve => setTimeout(resolve, randomInt(100, 500)));

    return {
        "success_count": result.count,
        "skipped_count": existingPages.length ?? 0,
        "error_count": 0,
        "total_count": batch.length ?? 0,
    }
}

process.on("message", async (msg: ConsumerMessage) => {
    if (msg.type === "batch") {
        const result = await uploadToDB(msg.data);
        process.send?.({ type: "result", data: result });
        process.send?.({ type: "ready" });
    } else if (msg.type === "shutdown") {
        console.log(`Consumer ${consumerIndex} shutting down.`);
        process.exit(0);
    } else if (msg.type === "index") {
        consumerIndex = msg.data;
    }
});

// Immediately signal ready
process.send?.({ type: "ready" });