FROM node:18.17

WORKDIR /app

COPY package.json ./

RUN yarn install

COPY . . 

RUN yarn run build

EXPOSE 8001

CMD [ "yarn", "start" ]
