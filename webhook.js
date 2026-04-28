const express = require('express');
const { exec } = require('child_process');
const crypto = require('crypto');

const app = express();
const PORT = 9000;

// Middleware to parse JSON payloads from GitHub
app.use(express.json());

app.post('/github-webhook', (req, res) => {
    console.log('Received webhook event from GitHub!');

    // GitHub sends a 'ping' event when you first create the webhook. We should respond to it.
    if (req.headers['x-github-event'] === 'ping') {
        return res.status(200).send('Webhook configured successfully!');
    }

    // Only process push events
    if (req.headers['x-github-event'] === 'push') {
        res.status(200).send('Push event received. Starting deployment...');

        // Execute the deployment commands
        // 1. Pull the latest code
        // 2. Install any new dependencies
        // 3. Restart the main app using pm2
        const deployCommand = `git pull && npm install && pm2 restart emi-app`;

        exec(deployCommand, (error, stdout, stderr) => {
            if (error) {
                console.error(`Deployment Error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`Deployment Stderr: ${stderr}`);
            }
            console.log(`Deployment Stdout: ${stdout}`);
            console.log('Deployment complete!');
        });
    } else {
        res.status(400).send('Event not supported');
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Webhook listener running on port ${PORT}`);
});
