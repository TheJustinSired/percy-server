
import express from 'express';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import mailcomposer from 'mailcomposer';
import fs from 'fs';
import axios from 'axios';

dotenv.config();
const app = express();
const PORT = 3000;

const oAuth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
);

// 🧠 Load tasks
const loadTasks = () => {
    try {
        return JSON.parse(fs.readFileSync('tasks.json'));
    } catch {
        return [];
    }
};

// 💾 Save tasks
const saveTasks = (tasks) => {
    fs.writeFileSync('tasks.json', JSON.stringify(tasks, null, 2));
};

// 💾 Save contacts
const saveContact = (contact) => {
    let contacts = [];
    try {
        contacts = JSON.parse(fs.readFileSync('contacts.json'));
    } catch { }
    contacts.push(contact);
    fs.writeFileSync('contacts.json', JSON.stringify(contacts, null, 2));
};

// 🕵️ Search contacts using SerpAPI
const searchIndustryContacts = async () => {
    const queries = [
        "music A&R email site:universal.com",
        "music curator contact site:spotify.com",
        "record label executive email"
    ];

    for (const q of queries) {
        const url = `https://serpapi.com/search.json?q=${encodeURIComponent(q)}&api_key=${process.env.SERPAPI_KEY}`;

        try {
            const response = await axios.get(url);
            const results = response.data?.organic_results || [];

            for (const r of results) {
                if (r.link && r.snippet && r.link.includes('@')) {
                    const emailMatch = r.link.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                    if (emailMatch) {
                        const contact = {
                            name: r.title,
                            email: emailMatch[0],
                            note: r.snippet,
                        };
                        saveContact(contact);
                        await sendEmail(contact.email);
                        addTaskFromContact(contact);
                    }
                }
            }
        } catch (err) {
            console.error(`❌ SerpAPI error: ${err.message}`);
        }
    }
};

// 📧 Send email using Gmail API
const sendEmail = async (to) => {
    oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    const mail = mailcomposer({
        from: `Justin Sired <${process.env.SENDER_EMAIL}>`,
        to,
        subject: 'Collab Opportunity from Justin Sired',
        text: 'Hey there — Percy here on behalf of Justin Sired. He’s working on a major release and would love to connect. Let us know if you’re open to talking.',
    });

    return new Promise((resolve, reject) => {
        mail.build(async (err, message) => {
            if (err) return reject(err);
            const encodedMessage = Buffer.from(message)
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            try {
                await gmail.users.messages.send({
                    userId: 'me',
                    requestBody: { raw: encodedMessage },
                });
                console.log(`✅ Email sent to ${to}`);
                resolve();
            } catch (e) {
                console.error(`❌ Failed to email ${to}:`, e.message);
                reject(e);
            }
        });
    });
};

// 📌 Add task to follow up
const addTaskFromContact = (contact) => {
    const tasks = loadTasks();
    tasks.push({
        id: (tasks.length + 1).toString(),
        title: `Follow up with ${contact.name}`,
        due: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 'Medium',
        status: 'incomplete',
    });
    saveTasks(tasks);
};

// 🔐 Auth route
app.get('/auth', (req, res) => {
    const url = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/gmail.send'],
        prompt: 'consent',
    });
    console.log('\n🔗 COPY THIS LINK INTO YOUR BROWSER TO LOG IN:\n' + url);
    res.send('✅ Copy the link from your terminal and open it in your browser to sign in.');
});

// 🔑 OAuth callback
app.get('/oauth2callback', async (req, res) => {
    const code = req.query.code;
    try {
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        console.log('\n✅ Access Token:', tokens.access_token);
        console.log('🔁 Refresh Token (PASTE INTO .env):', tokens.refresh_token);
        res.send('✅ Auth complete! Refresh token printed in terminal.');
    } catch (err) {
        console.error('❌ Auth error:', err.message);
        res.status(500).send('❌ Authentication failed.');
    }
});

// 🧠 Search contacts and email automatically
app.get('/run-percy', async (req, res) => {
    await searchIndustryContacts();
    res.send('🤖 Percy has scanned and emailed potential industry contacts.');
});

// 📝 View tasks
app.get('/tasks', (req, res) => {
    const tasks = loadTasks();
    res.json(tasks);
});

app.listen(PORT, () => {
    console.log(`🚀 Percy is running at http://localhost:${PORT}`);
});
