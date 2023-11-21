import Fastify from "fastify";
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

// Not setting OPTIONS as it is handled by cors plugin
['delete', 'get', 'post', 'put', 'patch', 'head'].map(method => {
    fastify[method]('*', handleApi);
})
async function handleApi(req, res) {
    return {
        method: req.method,
        url: req.url,
        query: req.query,
        headers: req.headers,
        body: req.body,
    };
}

await fastify.listen({
    port: 3000,
    host: '0.0.0.0'
});



// process.stdin.on('data', (data) => {
//     try {
//         let parsed;
//
//         try {
//             parsed = JSON.parse(data.toString());
//         } catch (e) {
//             console.error('Failed to parse', {data: data.toString()});
//             return;
//         }
//
//         console.log(parsed);
//
//         if (!parsed.runIn) {
//             console.error('Missing runIn');
//             return;
//         }
//
//         if (!parsed.actions?.length) {
//             console.error('Missing actions');
//             return;
//         }
//
//         save(parsed).catch(error => {
//             console.error('Failed to save', {error});
//         });
//     } catch (e) {
//         console.error('Failed to handle', {data: data.toString(), error: e});
//     }
// })
