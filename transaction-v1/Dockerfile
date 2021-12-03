FROM node:12-alpine
RUN apk --no-cache add git
WORKDIR /app
COPY package*.json ./
RUN yarn install
COPY . . 
CMD npm run start