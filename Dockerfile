# This will be alpine
ARG BUILD_FROM

FROM node:20-alpine AS node

FROM $BUILD_FROM


# Using this so we can have node 20 version
COPY --from=node /usr/lib /usr/lib
COPY --from=node /usr/local/share /usr/local/share
COPY --from=node /usr/local/lib /usr/local/lib
COPY --from=node /usr/local/include /usr/local/include
COPY --from=node /usr/local/bin /usr/local/bin

# Enable to pass signals to the process
# See more [here](https://snyk.io/blog/10-best-practices-to-containerize-nodejs-web-applications-with-docker/#:~:text=To%20quote%20the,our%20container%20image.)
RUN apk add dumb-init

ENV NODE_ENV production
ENV RUNNING_ON home-assistant

RUN mkdir /data

WORKDIR /usr/src/app

# Copy it before the code so Docker caching will help us build images faster
COPY package*.json ./

# Install only production dependencies.
RUN npm ci --only=production

# Copy local code to the container image.
COPY . .

RUN npm run migrate

CMD [ "dumb-init", "node", "src/scheduler/main.js" ]
