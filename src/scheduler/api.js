import Fastify from "fastify";
import {addTask, getPendingTasks} from "./one-time-task.js";

/**
 * @type {import('fastify').FastifyInstance}
 */
let fastify;

export function setup() {
    if(fastify) {
        return;
    }

    fastify = Fastify({
        disableRequestLogging: true,
        logger: {
            transport: {
                target: 'pino-pretty'
            },
            serializers: {
                res(reply) {
                    // The default
                    return {
                        statusCode: reply.statusCode
                    }
                },
                req(request) {
                    return {
                        method: request.method,
                        url: request.url,
                        path: request.routeOptions.url,
                        parameters: request.params,
                        // Including the headers in the log could be in violation
                        // of privacy laws, e.g. GDPR. You should use the "redact" option to
                        // remove sensitive fields. It could also leak authentication data in
                        // the logs.
                        headers: request.headers
                    };
                }
            }
        }
    })

    fastify.addHook('preHandler', function (req, reply, done) {
        req.log.info({
            method: req.method,
            url: req.url,
            query: req.query,
            headers: req.headers,
            body: req.body,
        }, 'Got request');
        done()
    });

    fastify.post('/one-time-tasks', async (req, res) => {
        const {runIn, actions} = req.body;

        const msToAdd = runIn.hours * 60 * 60 * 1000 + runIn.minutes * 60 * 1000 + runIn.seconds * 1000;

        req.log.info({
            runIn,
            actions,
            millisecondsToAdd: msToAdd
        }, 'Adding task');

        const task = await addTask({
            actions,
            msToAdd
        });

        req.log.info({
            task,
            expected_run_at: new Date(task.execution_date).toISOString()
        }, 'Task added');

        return task;
    });

    fastify.get('/one-time-tasks', async () => {
        const data = await getPendingTasks();

        return data.map(({id, actions, execution_date: executionDate}) => ({
                id,
                actions,
                executionDate
            })
        );
    });
}

export async function start(port, signal) {
    if(!fastify) {
        throw new Error('You must call setup() before start()');
    }
    const server = await fastify.listen({
        port: port,
        host: '0.0.0.0'
    });

    if(signal) {
        signal.addEventListener('abort', () => {
            fastify.close();
        }, {once: true})
    }

    console.log(`Server listening on ${server.url}`);

    return fastify.server.address().port;
}

export async function close() {
    await fastify.close();
    fastify = null;
}

export async function run() {
    setup();

    await start(3000)
}
