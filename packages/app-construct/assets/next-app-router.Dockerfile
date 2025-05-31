FROM node:20-alpine

# by default npm writes logs under /home/.npm and Lambda fs is read-only
ENV NPM_CONFIG_CACHE=/tmp/.npm

# Set working directory to function root directory
WORKDIR "/var/task"

RUN ls

# Copy in the built dependencies
COPY ./.next/standalone ./

CMD ["node", "./server.js"]