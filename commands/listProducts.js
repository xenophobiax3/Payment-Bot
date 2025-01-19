const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listproducts')
        .setDescription('List all available products'),
    async execute(interaction, db) {
        db.all('SELECT name, price FROM products', [], async (err, products) => {
            if (err) {
                console.error('Database error:', err.message);
                return interaction.reply({
                    content: 'An error occurred while retrieving products.',
                    ephemeral: true,
                });
            }

            if (products.length === 0) {
                return interaction.reply({
                    content: 'No products available.',
                    ephemeral: true,
                });
            }

            const itemsPerPage = 5;
            let currentPage = 0;

            const totalPages = Math.ceil(products.length / itemsPerPage);

            // ページごとのEmbedを生成
            const generateEmbed = (page) => {
                const start = page * itemsPerPage;
                const end = start + itemsPerPage;
                const productList = products.slice(start, end)
                    .map((p, index) => `**${start + index + 1}. ${p.name}**: ${p.price} credits`)
                    .join('\n');

                return new EmbedBuilder()
                    .setTitle(`Available Products (Page ${page + 1}/${totalPages})`)
                    .setDescription(productList)
                    .setColor('Blue')
                    .setFooter({ text: `Page ${page + 1} of ${totalPages}` });
            };

            // ボタンの行を作成
            const generateActionRow = () => {
                return new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('prevPage')
                            .setLabel('Previous')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(currentPage === 0),
                        new ButtonBuilder()
                            .setCustomId('nextPage')
                            .setLabel('Next')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(currentPage === totalPages - 1)
                    );
            };

            // 初期応答を送信
            const message = await interaction.reply({
                embeds: [generateEmbed(currentPage)],
                components: [generateActionRow()],
                fetchReply: true,
            });

            // ボタンのコレクターを作成
            const collector = message.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async (i) => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({
                        content: 'You cannot interact with these buttons.',
                        ephemeral: true,
                    });
                }

                if (i.customId === 'prevPage') {
                    currentPage = Math.max(currentPage - 1, 0);
                } else if (i.customId === 'nextPage') {
                    currentPage = Math.min(currentPage + 1, totalPages - 1);
                }

                // メッセージを更新
                await i.update({
                    embeds: [generateEmbed(currentPage)],
                    components: [generateActionRow()],
                });
            });

            collector.on('end', () => {
                // タイムアウト後にボタンを無効化
                message.edit({
                    components: [],
                });
            });
        });
    },
};
