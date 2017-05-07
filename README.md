# ssh-mailgun-2fa

Email-based two-factor authentication for SSH, using mailgun.

# Install

Installation is largely automated (including installing `node` if it isn't already). After cloning this repository to a world-readable location (eg. **not** in `/root`), just run the following from whithin that directory:

```bash
$ bash install.sh
```

After that, edit the `config.json` file. At a minimum, specify your Mailgun API credentials, basic email configuration, and user configuration.

Make sure to restart your sshd server for two-factor authentication to take affect.

# Uninstall

From the repository clone location, just run:

```
$ bash install.sh uninstall
```