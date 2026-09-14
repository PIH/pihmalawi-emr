#!/bin/bash

SERVER_ID=${1}

if [ -z ${SERVER_ID} ]; then
  echo "Please specify serverId as argument"
  exit 1
fi

git pull
mvn clean install -DskipTests
pushd distro/target/distro/web
mvn openmrs-sdk:deploy -DserverId=${SERVER_ID}
popd
