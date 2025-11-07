import { Consumer, FromConsumerMessage, ToConsumerMessage } from "./consumer.js";

type OnResultCallback<TResult> = (data: TResult) => Promise<void>;

let totalItemsProcessed = 0;

export class Pool<TResult, TItem = any> {
    private workers: Consumer<TItem, TResult>[] = [];
    private onResult: OnResultCallback<TResult> = async () => { };
    private idle: Set<Consumer<TItem, TResult>> = new Set();
    private buffer: TItem[] = [];
    private bufferSize: number;
    private isShuttingDown: boolean = false;


    constructor(
        consumerPath: string,
        workerCount: number,
        onResult: OnResultCallback<TResult>,
        bufferSize: number = 5,
    ) {
        this.onResult = onResult;
        this.bufferSize = bufferSize;
        this.workers = [];

        for (let i = 0; i < workerCount; i++) {
            const consumer = new Consumer(i, consumerPath, this.onConsumerMessage.bind(this));
            this.workers.push(consumer);
        }

        this.idle = new Set(this.workers);
    }

    private async onConsumerMessage(consumer: Consumer<TItem, TResult>, msg: FromConsumerMessage<TResult>) {
        if (msg.type === "ready") {
            this.idle.add(consumer);
            this.dispatch();
        } else if (msg.type === "result") {
            await this.onResult(msg.data);
        }
    }

    isWorking(): boolean {
        return this.idle.size !== this.workers.length;
    }

    workingCount(): number {
        return this.workers.length - this.idle.size;
    }

    idleCount(): number {
        return this.idle.size;
    }

    isBufferFull(): boolean {
        return this.buffer.length >= this.bufferSize;
    }

    waitForBufferSpace(): Promise<void> {
        return new Promise(async (resolve) => {
            while (this.isBufferFull()) {
                console.log("[waitForBufferSpace] Buffer is full");
                // wait an arbitrary amount of time
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            resolve();
        });
    }

    push(item: TItem): boolean {
        if (this.buffer.length >= this.bufferSize)
            return false;
        this.buffer.push(item);
        return true;
    }

    dispatch(): void {
        while (this.idle.size > 0 && this.buffer.length > 0) {
            let batch: any[] = [];
            console.log("[dispatch] Dispatching batch", this.idle.size, this.buffer.length, batch.length);

            if (!this.isShuttingDown && this.buffer.length < this.bufferSize)
                break;
            if (this.buffer.length >= this.bufferSize)
                batch = this.buffer.splice(0, this.bufferSize);
            else
                batch = this.buffer.splice(0, this.buffer.length);

            totalItemsProcessed += batch.length;
            this.send({ type: "work", data: batch });
        }
    }

    send(msg: ToConsumerMessage<TItem>): void {
        const consumer = this.idle.values().next().value!;
        consumer.send(msg);
        this.idle.delete(consumer);
    }

    async shutdown(): Promise<void> {
        this.isShuttingDown = true;
        this.dispatch();

        while (this.isWorking()) {
            const busy = this.workingCount();
            console.log(`[end] Shutting down...Busy consumers: ${busy} Buffer size: ${this.buffer.length}`);
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        for (const worker of this.workers) {
            worker.send({ type: "shutdown" });
        }
    }
}