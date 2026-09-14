#!/bin/bash

usage () {
    echo -e "Usage: install.sh [SERVER]\n"
    echo -e "Installs the configuration to SERVER, where a server is the name of an OpenMRS SDK instance at path '~/openmrs/[SERVER]'\n"
    echo -e "Example: ./install.sh neno\n"
}

if [ $# -eq 0 ]; then
    echo -e "Please provide the name of the server to install to as a command line argument.\n"
    usage
    exit 1
fi

mvn clean compile -DserverId=$1
