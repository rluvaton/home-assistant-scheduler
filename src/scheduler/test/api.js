
import {after, before, beforeEach, describe, it} from "node:test";
import assert from "node:assert";
import {start as startApi, setup as setupApi, close as closeApi} from "../api.js";
import {knex} from "../db.js";

let baseUrl = 'http://localhost:';
before(async ({signal}) => {
    setupApi();
    const listenedPort = await startApi(0, signal);

    baseUrl += listenedPort;
});

after(async () => {
    await closeApi();
    await knex.destroy()
});

beforeEach(async () => {
    // TODO - remove this cleanup it make it impossible to run tests in parallel
    await knex('one-time').truncate();
})

describe('API', () => {
    describe('GET /one-time-tasks', () => {
        it('should return empty array', async () => {
            const response = await fetch(`${baseUrl}/one-time-tasks`);
            const data = await response.json();

            assert.equal(data.length, 0);
        });

        it('should return the existing pending tasks', async () => {
            const body = {
                runIn: {
                    hours: 100,
                    minutes: 0,
                    seconds: 0
                },
                actions: [
                    {
                        type: 'log',
                        message: 'Hello world'
                    }
                ]
            }
            const createResponse = await fetch(`${baseUrl}/one-time-tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            const createdTask = await createResponse.json();

            const getResponse = await fetch(`${baseUrl}/one-time-tasks`);
            const pendingTasks = await getResponse.json();

            assert.equal(pendingTasks.length, 1);

            assert.deepStrictEqual(pendingTasks[0].id, createdTask.id);
            assert.deepStrictEqual(pendingTasks[0].actions, body.actions);
        });
    });

    describe('POST /one-time-tasks', () => {
        it('should create task', async () => {
            const body = {
                runIn: {
                    hours: 0,
                    minutes: 0,
                    seconds: 1
                },
                actions: [
                    {
                        type: 'log',
                        message: 'Hello world'
                    }
                ]
            }
            const response = await fetch(`${baseUrl}/one-time-tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            const data = await response.json();

            assert.ok(data);
        });
    });
});
