# Define custom function directory
ARG FUNCTION_DIR="/function"

FROM node:18.17.0-buster as build-image

# Include global arg in this stage of the build
ARG FUNCTION_DIR

# Install build dependencies
RUN apt-get update && \
    apt-get install -y \
    g++ \
    make \
    cmake \
    unzip \
    libcurl4-openssl-dev

# Copy package.json and lock file
RUN mkdir -p ${FUNCTION_DIR}
COPY package.json ${FUNCTION_DIR}/
COPY package-lock.json ${FUNCTION_DIR}/

WORKDIR ${FUNCTION_DIR}

# Install Node.js dependencies
RUN npm ci --omit=dev --loglevel verbose

# Install the runtime interface client
RUN npm install --omit=dev --loglevel verbose aws-lambda-ric

# Copy function code
COPY src ${FUNCTION_DIR}/src

FROM node:18.17.0-buster-slim

# by default npm writes logs under /home/.npm and Lambda fs is read-only
ENV NPM_CONFIG_CACHE=/tmp/.npm

# Include global arg in this stage of the build
ARG FUNCTION_DIR

# Set working directory to function root directory
WORKDIR ${FUNCTION_DIR}

# Copy in the built dependencies
COPY --from=build-image ${FUNCTION_DIR} ${FUNCTION_DIR}

# Set runtime interface client as default command for the container runtime
ENTRYPOINT ["/usr/local/bin/npx", "aws-lambda-ric"]

# Pass the name of the function handler as an argument to the runtime
CMD ["index.handler"]