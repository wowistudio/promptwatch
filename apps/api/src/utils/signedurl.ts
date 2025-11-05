import { BUCKET_NAME, storageClient } from "./orchestrator.js";


export async function getSignedUrl(uploadId: string): Promise<string> {
    // https://github.com/googleapis/nodejs-storage/blob/main/samples/generateSignedUrl.js
    const [url] = await storageClient
        .bucket(BUCKET_NAME)
        .file(`${uploadId}.csv`)
        .getSignedUrl({
            action: 'read',
            contentType: 'text/csv',
            queryParams: {
                uploadType: 'media',
                name: `${uploadId}.csv`,
            },
            expires: Date.now() + 1000 * 60 * 5, // 5 minutes
        });

    return url;
}