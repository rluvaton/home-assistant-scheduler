import Fastify from "fastify";
import {addTask, getPendingTasks} from "./one-time-task.js";

const fastify = Fastify({
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

    return await addTask({
        actions,
        dateToRun: new Date(Date.now() + msToAdd)
    });
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

await fastify.listen({
    port: 3000,
    host: '0.0.0.0'
});
