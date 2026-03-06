#!/bin/bash
set -e

IMAGE_NAME="scjorge/sonicplayer"

if [ -z "$1" ]; then
  echo "Erro: Você deve fornecer a versão como argumento."
  echo "Uso: $0 <versão>"
  exit 1
fi

TAG=$1

if docker manifest inspect $IMAGE_NAME:$TAG > /dev/null 2>&1; then
    echo "❌ A tag '$TAG' já existe no Docker Hub. Abortando para evitar substituição."
    exit 1
fi

docker build --platform linux/amd64 -t $IMAGE_NAME:$TAG -t $IMAGE_NAME:latest ./
docker push $IMAGE_NAME:$TAG
docker push $IMAGE_NAME:latest
