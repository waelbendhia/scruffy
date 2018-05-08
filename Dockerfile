FROM node:carbon

ENV YARN_VERSION 1.6.0

RUN curl -fSLO --compressed "https://yarnpkg.com/downloads/$YARN_VERSION/yarn-v$YARN_VERSION.tar.gz" \
  && tar -xzf yarn-v$YARN_VERSION.tar.gz -C /opt/ \
  && ln -snf /opt/yarn-v$YARN_VERSION/bin/yarn /usr/local/bin/yarn \
  && ln -snf /opt/yarn-v$YARN_VERSION/bin/yarnpkg /usr/local/bin/yarnpkg \
  && rm yarn-v$YARN_VERSION.tar.gz

RUN yarn global add serve
CMD serve -s build
EXPOSE 5000

COPY package.json ./
COPY yarn.lock ./
RUN yarn install

COPY . .

RUN yarn run build
