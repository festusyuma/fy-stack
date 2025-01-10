ARG FUNCTION_DIR="/var/task"

# Set up the base image
FROM public.ecr.aws/awsguru/aws-lambda-adapter:0.8.4 AS aws-lambda-adapter
FROM node:18.17.0-buster as build-image

# Include global arg in this stage of the build
ARG FUNCTION_DIR

WORKDIR ${FUNCTION_DIR}

# install dependencies
COPY package.json ./
COPY package-lock.json ./
RUN npm ci --omit=dev --loglevel verbose

# Copy the function code
COPY src ./src
COPY server.js ./

FROM node:18.17.0-buster-slim

# by default npm writes logs under /home/.npm and Lambda fs is read-only
ENV NPM_CONFIG_CACHE=/tmp/.npm

# Include global arg in this stage of the build
ARG FUNCTION_DIR

# Set working directory to function root directory
WORKDIR ${FUNCTION_DIR}

# Copy lamnda adapter layer
COPY --from=aws-lambda-adapter /lambda-adapter /opt/extensions/lambda-adapter

# Copy in the built dependencies
COPY --from=build-image ${FUNCTION_DIR} ${FUNCTION_DIR}

ENV PORT=8000
EXPOSE 8000

CMD ["node", "server.js"]