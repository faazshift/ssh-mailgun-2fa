#!/bin/bash

PKGDIR=$( cd $(dirname $0) ; pwd -P )

if [[ "$SSH_ORIGINAL_COMMAND" != "" ]]
then
        exec /bin/bash -c "${SSH_ORIGINAL_COMMAND}"
elif [ $SHELL ]
then
    /usr/local/bin/node "$PKGDIR/verify.js"
    if [[ $? -eq 0 ]]
    then
        exec -l $SHELL
    fi
fi
