let readline, mailgun;

try {
    readline = require('readline');
    mailgun = require('mailgun-js');
} catch(e) {
    // Don't block ssh if modules haven't been installed yet
    console.error('WARNING: Modules need to be installed for verification to work');
    process.exit(0);
}

class Verify {
    constructor(config = {}) {
        this.sigInit();

        this.config = Object.assign({
            mailgun: {
                apiKey: '',
                domain: 'domain.com'
            },
            email: {
                from: 'example@domain.com',
                subject: '2-factor authentication code',
                text: 'Your code is: ${code}' // '${code}' will be replaced with the 2fa code
            },
            whitelist: false, // If true, any user without auth prefs set is denied access by default
            users: {
                // root: { // Example user config
                //     email: 'example@email.com'
                // }
            },
            promptText: '2fa code from the email you just received: ',
            grantedText: 'Access granted!',
            deniedText: 'Access denied!'
        }, config);

        if(
            this.config.mailgun.apiKey.length == 0
            || this.config.mailgun.domain.length == 0
        ) {
            // Don't block ssh if mailgun info isn't set
            console.error('WARNING: Mailgun settings must be set in config');
            process.exit(0);
        }

        if(
            this.config.whitelist === true
            && (
                typeof(this.config.users) != 'object'
                || Object.keys(this.config.users).length == 0
            )
        ) {
            console.error('WARNING: At least one user must be configured in whitelist mode');
        }

        try {
            this.mailgun = mailgun(this.config.mailgun);
        } catch(e) {
            // If mailgun fails to init, don't block ssh
            console.error('WARNING: Mailgun module failed to initialize');
            process.exit(0);
        }
    }

    sigInit() {
        this.handleExit = () => {
            process.exit(1);
        };
        process.on('SIGINT', this.handleExit);
        process.on('SIGTERM', this.handleExit);
    }

    getCode() {
        return parseInt(Math.random() * 1000000);
    }

    getUserCfg() {
        let user = process.env.USER || false;

        if(user) {
            let cfg = this.config.users[user] || false;
            if(cfg) {
                return cfg;
            }
        }

        return false;
    }

    buildMessage({userCfg, code}) {
        let emailPrefs = this.config.email || {};
        let subject = emailPrefs.subject || '';
        let text = emailPrefs.text || '';

        subject = subject.replace('${code}', code);
        text = text.replace('${code}', code);

        let fromEmail = emailPrefs.from || '';
        let toEmail = userCfg.email || '';

        let message = {
            to: toEmail,
            from: fromEmail,
            subject: subject,
            text: text
        };

        return message;
    }

    sendEmail(message = {}) {
        return this.mailgun.messages().send(message).catch((resp) => {
            // Don't block if email failed to send
            console.error('WARNING: Email failed to send');
            process.exit(0);
        });
    }

    defaultExit() {
        if(this.config.whitelist === true) {
            process.exit(1);
        } else {
            process.exit(0);
        }
    }

    run() {
        let userCfg = this.getUserCfg();

        if(userCfg !== false && typeof(userCfg) == 'object') {
            let code = this.getCode();
            let message = this.buildMessage({userCfg, code});

            this.sendEmail(message).then(() => {
                let prompt = readline.createInterface({input: process.stdin, output: process.stdout});

                // Handle signals to prevent circumvention
                prompt.on('SIGCONT', this.handleExit);
                prompt.on('SIGINT', this.handleExit);
                prompt.on('SIGSTP', this.handleExit);
                prompt.on('close', this.handleExit);

                prompt.question(this.config.promptText, (userCode) => {
                    if(userCode == code.toString()) {
                        // Access granted

                        if(this.config.grantedText.length > 0) {
                            console.log(this.config.grantedText);
                        }

                        process.exit(0);
                    } else {
                        // Access denied

                        if(this.config.deniedText.length > 0) {
                            console.log(this.config.deniedText);
                        }

                        process.exit(1);
                    }
                });
            });
        } else {
            this.defaultExit();
        }
    }
}

if(require.main === module) {
    let config;

    try {
        config = require('./config.json');
    } catch(e) {
        // Don't block ssh in case of missing or malformed config
        console.error('WARNING: Config must be present and valid');
        process.exit(0);
    }

    let verify = new Verify(config);
    verify.run();
}