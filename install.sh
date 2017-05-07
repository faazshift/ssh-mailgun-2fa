#!/bin/bash

PKGDIR=$( cd $(dirname $0) ; pwd -P )
SSHD_CMD='sshd-cmd.sh'
NODE_BIN='/usr/local/bin/node'

function get_ssh_cfg() {
    local cfg=''

    if [[ -f /etc/sshd_config ]]
    then
        cfg="/etc/sshd_config"
    elif [[ -f /etc/ssh/sshd_config ]]
    then
        cfg="/etc/ssh/sshd_config"
    else
        echo "Cannot find sshd_config! To enable, add 'ForceCommand $PKGDIR/$SSHD_CMD'" >&2
    fi

    echo $cfg
}

function install_forcecmd() {
    local sshcfg=$( get_ssh_cfg )

    if [[ $sshcfg != '' &&  -w "$sshcfg" ]]
    then
        sed -ie "/^ForceCommand.*$SSHD_CMD.*/d" $sshcfg
        sed -i -e :a -e '/^\n*$/{$d;N;};/\n$/ba' $sshcfg
        echo -en "\nForceCommand $PKGDIR/$SSHD_CMD" >> $sshcfg
    else
        echo "Cannot write to sshd_config! To enable add 'ForceCommand $PKGDIR/$SSHD_CMD'"
    fi
}

function uninstall_forcecmd() {
    local sshcfg=$( get_ssh_cfg )

    if [[ $sshcfg != '' && -w "$sshcfg" ]]
    then
        sed -ie "/^ForceCommand.*$SSHD_CMD.*/d" $sshcfg
        sed -i -e :a -e '/^\n*$/{$d;N;};/\n$/ba' $sshcfg
    fi
}

if [[ $USER != "root" ]]
then
    echo "Please run this script as 'root'"
    exit 1
fi

if [[ $1 == "uninstall" ]]
then
    echo -n "Uninstalling..."
    uninstall_forcecmd

    echo " done!"
    echo "Restart SSH for 2-factor authentication to be disabled"
else
    if [[ ! -f $NODE_BIN ]]
    then
        if [[ -f "/usr/bin/make" ]]
        then
            mkdir -p /tmp/tmp_tj_n
            git clone https://github.com/tj/n.git /tmp/tmp_tj_n
            cd /tmp/tmp_tj_n
            make install
            /usr/local/bin/n latest
        else
            echo "Cannot auto-install 'node', since 'make' is not installed"
            exit 1
        fi
    fi

    if [[ ! -d "$PKGDIR/node_modules" ]]
    then
        cd $PKGDIR
        npm install
    fi

    if [[ ! -f "$PKGDIR/config.json" ]]
    then
        cp "$PKGDIR/config.tpl.json" "$PKGDIR/config.json"
    fi

    chmod 755 "$PKGDIR/$SSHD_CMD"
    chmod 744 "$PKGDIR/verify.js"

    install_forcecmd

    echo "Installed"
    echo "Restart SSH to start using 2-factor authentication"
fi