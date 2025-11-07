import { ChildProcess, fork } from "child_process";

type ConsumerReadyMessage = { type: "ready" };
export type ConsumerResultMessage<TResult> = { type: "result"; data: TResult; };
export type FromConsumerMessage<TResult> = ConsumerReadyMessage | ConsumerResultMessage<TResult>;

type BatchMessage<TItem> = { type: "work"; data: TItem[] };
type ShutdownMessage = { type: "shutdown" };
export type ToConsumerMessage<TItem> = BatchMessage<TItem> | ShutdownMessage;


export class Consumer<TItem, TResult> {
    private child: ChildProcess;

    constructor(
        index: number,
        consumerPath: string,
        onMessage: (consumer: Consumer<TItem, TResult>, msg: FromConsumerMessage<TResult>) => void
    ) {
        this.child = fork(consumerPath);
        this.child.on("message", (msg: FromConsumerMessage<TResult>) => onMessage(this, msg));
        this.child.on("exit", () => console.log(`Consumer ${index} (pid=${this.child.pid}) exited`));
    }

    send(msg: ToConsumerMessage<TItem>) {
        if (msg.type === "shutdown")
            this.child.kill();
        else if (msg.type === "work")
            this.child.send(msg);
    }
}