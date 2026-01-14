###########
## Build ##
###########
FROM node:22 AS build

WORKDIR /app
COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build


###########
## PROD ##
###########
FROM node:20-alpine

RUN apk add --no-cache \
  ffmpeg \
  flac \
  exiftool \
  python3 \
  py3-pip \
  tzdata

ENV TZ=America/Sao_Paulo
RUN cp /usr/share/zoneinfo/${TZ} /etc/localtime && echo ${TZ} > /etc/timezone

RUN pipx install --no-cache-dir spotdl
RUN pipx ensurepath

WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules

ENV NODE_ENV=production
EXPOSE 3001

CMD ["npm", "run", "start"]
