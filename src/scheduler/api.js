import {addTask, getPendingTasks} from "./one-time-task.js";

/**
 *
 * @param {{hours: number, minutes: number, seconds: number}} runIn
 * @param actions
 */
export async function save({runIn, actions}) {
    const msToAdd = runIn.hours * 60 * 60 * 1000 + runIn.minutes * 60 * 1000 + runIn.seconds * 1000;

    await addTask({
        actions,
        dateToRun: new Date(Date.now() + msToAdd)
    });
}


export async function getTasks() {
    const data = await getPendingTasks();

    return data.map(({id, actions, execution_date: executionDate}) => ({
            id,
            actions,
            executionDate
        })
    );
}
process.stdin.on('data', (data) => {
  let parsed;

    try {
        parsed = JSON.parse(data.toString());
    } catch(e) {
        console.error('Failed to parse', {data: data.toString()});
        return;
    }

    console.log(parsed);

    if(!parsed.runIn) {
        console.error('Missing runIn');
        return;
    }

    if(!parsed.actions?.length) {
        console.error('Missing actions');
        return;
    }

    save(parsed).catch(error => {
        console.error('Failed to save', {error});
    });
})
