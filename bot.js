require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const axios = require('axios');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');

// 環境変数の読み込み
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
const token = process.env.TOKEN;

// Discordクライアントの初期化
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// SQLiteデータベースの初期化
const db = new sqlite3.Database('./marketplace.db', (err) => {
    if (err) console.error('Failed to connect to SQLite database:', err.message);
    else console.log('Connected to the SQLite database.');
});

// データベーススキーマの設定
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            balance INTEGER DEFAULT 5
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS products (
            product_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            price INTEGER,
            owner_id TEXT,
            download_link TEXT,
            info TEXT
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS invoices (
            invoice_id TEXT PRIMARY KEY,
            used BOOLEAN DEFAULT 0,
            user_id TEXT
        )
    `);
});

// コマンドのロード
client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const commands = [];

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
}

// アプリケーションコマンドの登録
const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Failed to refresh commands:', error);
    }
})();

// Botが準備完了したときの処理
client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return console.error('Guild not found.');

    try {
        const members = await guild.members.fetch();
        for (const member of members.values()) {
            const userId = member.id;
            db.run(
                'INSERT OR IGNORE INTO users (id) VALUES (?)',
                [userId],
                (err) => {
                    if (err) console.error('Failed to insert user:', err.message);
                }
            );
        }
    } catch (error) {
        console.error('Failed to fetch members:', error);
    }
});

// 新規メンバーが参加したときの処理
client.on('guildMemberAdd', (member) => {
    const userId = member.id;
    db.run(
        'INSERT OR IGNORE INTO users (id) VALUES (?)',
        [userId],
        (err) => {
            if (err) console.error('Failed to insert new user:', err.message);
            else console.log(`Added new user with ID: ${userId}`);
        }
    );
});

// メンバーが退出したときの処理
client.on('guildMemberRemove', (member) => {
    const userId = member.id;
    db.run('DELETE FROM users WHERE id = ?', [userId], (err) => {
        if (err) console.error('Failed to delete user:', err.message);
        else console.log(`Deleted user with ID: ${userId}`);
    });

    db.run('DELETE FROM products WHERE owner_id = ?', [userId], (err) => {
        if (err) console.error('Failed to delete user products:', err.message);
        else console.log(`Deleted products for user with ID: ${userId}`);
    });
});

// スラッシュコマンドの処理
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction, db);
    } catch (error) {
        console.error('Error executing command:', error);
        await interaction.reply({
            content: 'There was an error while executing this command!',
            ephemeral: true,
        });
    }
});

// Botのログイン
client.login(token);
