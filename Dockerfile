FROM ubuntu:latest as builder

# Install wget and unzip
RUN apt-get -qq update && \
  apt-get -qq install -y  \
  wget \
  unzip \
  nodejs \
  npm \
  git

# BCF Converter
RUN wget --quiet https://github.com/bimspot/bcf-converter/releases/download/0.0.1/bcf-converter-linux-x64.tar.gz
RUN tar -zxvf bcf-converter-linux-x64.tar.gz
RUN chmod +x bcf-converter-linux-x64/bcf-converter

ARG NODE_ENV=development
ENV NODE_ENV $NODE_ENV
# Snyk token for authentication
ENV SNYK_TOKEN=feb696b3-0d7f-4589-8327-fe6a8064c285
# So that locally installed packages are available on the PATH
ENV PATH /home/node/node_modules/.bin:$PATH

RUN npm config set unsafe-perm true

WORKDIR /home/node

# Installing dependencies
COPY ./src/package.json /home/node/
RUN npm install --quiet
RUN npm install -g nodemon --quiet --unsafe-perm=true

COPY ./src/ /home/node/

# Creating folders for generated documenation and test results
RUN mkdir -p docs artifacts

# Running eslint. Image will not build without confirming to style guide.
RUN eslint *.js

# ----------------------------------------------------------------------------
# Production container
# ----------------------------------------------------------------------------
FROM mcr.microsoft.com/dotnet/core/runtime:2.2-bionic

RUN apt-get -qq update && apt-get -qq install -y  \
  nodejs \
  npm \
  git

RUN npm install npm@latest -g
RUN npm install bimspot/xeokit-gltf-to-xkt#cli -g

# Converting tools
COPY --from=builder /bcf-converter-linux-x64/ /usr/lib/bcf-converter
RUN ln -s /usr/lib/bcf-converter/bcf-converter /usr/local/bin/bcf-converter

WORKDIR /home/node
COPY ./src/ /home/node/
RUN npm install --production

CMD ["node", "index.js"]