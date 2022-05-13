FROM node:12-alpine
RUN apk --no-cache add git
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --production
COPY . . 
RUN npm run build
EXPOSE 20003