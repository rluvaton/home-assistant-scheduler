// https://community.home-assistant.io/t/persistent-storage-in-addons/463458

import {knex} from "./db.js";

export async function getPendingTasks() {
    const result = await knex("one-time")
        .where("finished", false)
        .andWhere("execution_date", "<", knex.fn.now());

    return result.map(item => ({
        ...item,
        // must parse as sqlite client does not convert it automatically
        actions: JSON.parse(item.actions)
    }));
}

export async function markTaskAsFinished(id, failed) {
    await knex("one-time")
        .where("id", id)
        .update({
            finished: true,
            executed: !failed,
            failed: !!failed
        });
}

export async function addTask({actions, dateToRun}) {
    return await knex("one-time").insert({
        // must stringify as sqlite client does not convert it automatically
        actions: JSON.stringify(actions),
        execution_date: dateToRun,

        finished: false,
        executed: null,
        failed: null
    }).returning("*");
}
