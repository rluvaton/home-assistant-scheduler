import {setTimeout as sleep} from "node:timers/promises";
import {Readable} from "node:stream";
import {getTasksReadyToExecute} from "./one-time-task.js";

let fetcher

export function getFetcher(abortSignal) {
    if (!fetcher) {
        fetcher = Readable.from((async function* fetch() {
            while (true) {
                const tasksToExecute = await getTasksReadyToExecute();

                for (const task of tasksToExecute) {
                    yield task;
                }

                // TODO - should allow to exit without waiting for the sleep
                await sleep(1000);
            }
        })(), {signal: abortSignal})
    }

    return fetcher;
}
