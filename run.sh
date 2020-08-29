#!/bin/sh
mode='-d'
container='plex-betaseries-webhook'
image="thilas/$image"
while (( "$#" )); do
  case "$1" in
  --image-tag)
    tag=":$2"
    shift
    ;;
  --interactive)
    mode='-it'
    ;;
  --test)
    mode='-it --env NODE_ENV=development --rm'
    container="$container-test"
    ;;
  *)
    echo "Unknown argument: $1" 1>&2
    exit 1
  esac
  shift
done
imageId="$(sudo docker ps --filter "name=$container" --format '{{.Image}}')"
if [[ -n "$imageId" ]]; then
  echo 'Upgrading existing container...'
  echo "Current image: $imageId"
  sudo docker stop "$container"
  sudo docker rm "$container"
fi
sudo docker run $mode --name "$container" --volume "$(pwd)/src/config:/home/node/app/dist/config" "$image$tag"
