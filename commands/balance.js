const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your balance'),
    async execute(interaction, db) {
        const userId = interaction.user.id;

        // データベースからユーザーの残高を取得
        db.get('SELECT balance FROM users WHERE id = ?', [userId], (err, row) => {
            if (err) {
                console.error('Database error:', err.message);
                return interaction.reply({
                    content: 'An error occurred while checking your balance.',
                    ephemeral: true,
                });
            }

            // 残高を取得し、デフォルト値は0に設定
            const balance = row ? row.balance : 0;

            // Embedメッセージを作成
            const embed = new EmbedBuilder()
                .setTitle(`${interaction.user.username}'s Balance`)
                .setDescription(`You currently have **${balance} credits**.`)
                .setColor('Green');

            // ユーザーに応答
            interaction.reply({
                embeds: [embed],
                ephemeral: true, // 応答をユーザーのみが見られるように設定
            });
        });
    },
};
