import { Storage } from "@google-cloud/storage";
import { ChildProcess, fork } from "child_process";
import Papa from "papaparse";
import { Duplex } from "stream";
import type { ConsumerMessage } from "./consumer.js";

export const storageClient = new Storage({
    apiEndpoint: 'http://localhost:8065',
    projectId: 'fake-project',
    credentials: {
        type: 'service_account',
        private_key:
            '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDY3E8o1NEFcjMM\nHW/5ZfFJw29/8NEqpViNjQIx95Xx5KDtJ+nWn9+OW0uqsSqKlKGhAdAo+Q6bjx2c\nuXVsXTu7XrZUY5Kltvj94DvUa1wjNXs606r/RxWTJ58bfdC+gLLxBfGnB6CwK0YQ\nxnfpjNbkUfVVzO0MQD7UP0Hl5ZcY0Puvxd/yHuONQn/rIAieTHH1pqgW+zrH/y3c\n59IGThC9PPtugI9ea8RSnVj3PWz1bX2UkCDpy9IRh9LzJLaYYX9RUd7++dULUlat\nAaXBh1U6emUDzhrIsgApjDVtimOPbmQWmX1S60mqQikRpVYZ8u+NDD+LNw+/Eovn\nxCj2Y3z1AgMBAAECggEAWDBzoqO1IvVXjBA2lqId10T6hXmN3j1ifyH+aAqK+FVl\nGjyWjDj0xWQcJ9ync7bQ6fSeTeNGzP0M6kzDU1+w6FgyZqwdmXWI2VmEizRjwk+/\n/uLQUcL7I55Dxn7KUoZs/rZPmQDxmGLoue60Gg6z3yLzVcKiDc7cnhzhdBgDc8vd\nQorNAlqGPRnm3EqKQ6VQp6fyQmCAxrr45kspRXNLddat3AMsuqImDkqGKBmF3Q1y\nxWGe81LphUiRqvqbyUlh6cdSZ8pLBpc9m0c3qWPKs9paqBIvgUPlvOZMqec6x4S6\nChbdkkTRLnbsRr0Yg/nDeEPlkhRBhasXpxpMUBgPywKBgQDs2axNkFjbU94uXvd5\nznUhDVxPFBuxyUHtsJNqW4p/ujLNimGet5E/YthCnQeC2P3Ym7c3fiz68amM6hiA\nOnW7HYPZ+jKFnefpAtjyOOs46AkftEg07T9XjwWNPt8+8l0DYawPoJgbM5iE0L2O\nx8TU1Vs4mXc+ql9F90GzI0x3VwKBgQDqZOOqWw3hTnNT07Ixqnmd3dugV9S7eW6o\nU9OoUgJB4rYTpG+yFqNqbRT8bkx37iKBMEReppqonOqGm4wtuRR6LSLlgcIU9Iwx\nyfH12UWqVmFSHsgZFqM/cK3wGev38h1WBIOx3/djKn7BdlKVh8kWyx6uC8bmV+E6\nOoK0vJD6kwKBgHAySOnROBZlqzkiKW8c+uU2VATtzJSydrWm0J4wUPJifNBa/hVW\ndcqmAzXC9xznt5AVa3wxHBOfyKaE+ig8CSsjNyNZ3vbmr0X04FoV1m91k2TeXNod\njMTobkPThaNm4eLJMN2SQJuaHGTGERWC0l3T18t+/zrDMDCPiSLX1NAvAoGBAN1T\nVLJYdjvIMxf1bm59VYcepbK7HLHFkRq6xMJMZbtG0ryraZjUzYvB4q4VjHk2UDiC\nlhx13tXWDZH7MJtABzjyg+AI7XWSEQs2cBXACos0M4Myc6lU+eL+iA+OuoUOhmrh\nqmT8YYGu76/IBWUSqWuvcpHPpwl7871i4Ga/I3qnAoGBANNkKAcMoeAbJQK7a/Rn\nwPEJB+dPgNDIaboAsh1nZhVhN5cvdvCWuEYgOGCPQLYQF0zmTLcM+sVxOYgfy8mV\nfbNgPgsP5xmu6dw2COBKdtozw0HrWSRjACd1N4yGu75+wPCcX/gQarcjRcXXZeEa\nNtBLSfcqPULqD+h7br9lEJio\n-----END PRIVATE KEY-----\n',
        client_email: '123-abc@developer.gserviceaccount.com',
    }
});
export const BUCKET_NAME = "csv-uploads";
const MAX_WORKERS = 3;
const BATCH_SIZE = 50;
const MAX_BUFFER_SIZE = 100;

let parser: Duplex | null = null;
let isEnding = false;
const buffer: any[] = [];
const consumers: ChildProcess[] = [];
const idleConsumers = new Set<ChildProcess>();

function createConsumers(maxWorkers: number): ChildProcess[] {
    const consumers: ChildProcess[] = [];
    for (let i = 0; i < maxWorkers; i++) {
        const consumer = fork("./src/utils/consumer.js");
        consumer.on("message", onConsumerMessage.bind(null, consumer));
        consumer.on("exit", () => console.log(`Consumer ${i} ${consumer.pid} exited`));
        consumer.send({ type: "index", data: i });
        consumers.push(consumer);
    }
    return consumers;
}

function orchestrate(uploadId: string) {
    if (consumers.length === 0)
        consumers.push(...createConsumers(MAX_WORKERS));

    parser = Papa.parse(Papa.NODE_STREAM_INPUT, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => {
            return header.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        },
    });

    parser.on("data", async (row: any) => {
        if (buffer.length >= MAX_BUFFER_SIZE) {
            console.log("[data] Buffer is full, pausing parser");
            parser!.pause();
        }
        buffer.push(row);
        dispatch();
    });

    parser.on("end", async () => {
        isEnding = true;
        while (buffer.length > 0 || idleConsumers.size !== consumers.length) {
            const busy = consumers.length - idleConsumers.size;
            console.log(`[end] Shutting down...Busy consumers: ${busy} Buffer size: ${buffer.length}`);
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        for (const consumer of consumers)
            consumer.send({ type: "shutdown" });

        console.log("[end] ✅ Producer finished streaming CSV.");
        process.send?.({ type: "complete" });
    });

    parser.on("error", (err: any) => {
        // handle error here
        console.error("CSV parse error:", err);
    });

    storageClient
        .bucket(BUCKET_NAME)
        .file(`${uploadId}.csv`)
        .createReadStream()
        .pipe(parser);
}

function dispatch() {
    while (idleConsumers.size > 0 && buffer.length > 0) {
        let batch: any[] = [];
        if (!isEnding && buffer.length < BATCH_SIZE)
            break;
        if (buffer.length >= BATCH_SIZE)
            batch = buffer.splice(0, BATCH_SIZE);
        else
            batch = buffer.splice(0, buffer.length);

        const consumer = idleConsumers.values().next().value!;
        idleConsumers.delete(consumer);
        consumer.send({ type: "batch", data: batch });
    }

    if (parser && parser.isPaused() && buffer.length < MAX_BUFFER_SIZE) {
        console.log(`[dispatch] Buffer has space ${buffer.length}/${MAX_BUFFER_SIZE}, resuming parser`);
        parser.resume();
    }
}

function onConsumerMessage(consumer: ChildProcess, msg: ConsumerMessage) {
    if (msg.type === "ready") {
        idleConsumers.add(consumer);
        dispatch();
    } else if (msg.type === "result") {
        console.log(msg.data);
        process.send?.({ type: "progress", data: msg.data });
    }
}

process.on('message', async (msg: { uploadId: string }) => orchestrate(msg.uploadId));