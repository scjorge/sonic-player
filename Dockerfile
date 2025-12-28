###########
## Build ##
###########
FROM node:22 AS build

WORKDIR /app
COPY package*.json ./

RUN npm install --omit=dev

COPY . .

RUN npm run build


###########
## PROD ##
###########
FROM node:22

RUN apt update && apt install -y flac exiftool ffmpeg

ENV TZ="America/Sao_Paulo"
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
RUN ln -snf /usr/share/zoneinfo/${TZ} /etc/localtime && echo ${TZ} > /etc/timezone

WORKDIR /app

COPY --from=build /app/dist /app/dist
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/package-lock.json /app/package-lock.json
COPY --from=build /app/asserts /app/asserts

EXPOSE 3000