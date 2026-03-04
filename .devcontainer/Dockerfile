FROM node:22

RUN apt update && apt install -y flac exiftool ffmpeg python3 pipx

ENV TZ="America/Sao_Paulo"
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
RUN ln -snf /usr/share/zoneinfo/${TZ} /etc/localtime && echo ${TZ} > /etc/timezone

RUN pipx install spotdl
RUN pipx ensurepath
