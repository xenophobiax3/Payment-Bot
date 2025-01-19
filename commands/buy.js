const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Buy a product')
        .addStringOption(option =>
            option.setName('product')
                .setDescription('The name of the product to buy')
                .setRequired(true)),
    async execute(interaction, db) {
        const productName = interaction.options.getString('product');
        const userId = interaction.user.id;

        // 商品情報を取得
        db.get('SELECT price, owner_id, download_link FROM products WHERE name = ?', [productName], (err, product) => {
            if (err) {
                console.error('Database error:', err.message);
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription('An error occurred while processing your purchase.')
                            .setColor('Red'),
                    ],
                    ephemeral: true,
                });
            }

            if (!product) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(`Product "${productName}" not found.`)
                            .setColor('Red'),
                    ],
                    ephemeral: true,
                });
            }

            // ユーザーの残高を確認
            db.get('SELECT balance FROM users WHERE id = ?', [userId], (err, row) => {
                if (err) {
                    console.error('Database error:', err.message);
                    return interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setDescription('An error occurred while checking your balance.')
                                .setColor('Red'),
                        ],
                        ephemeral: true,
                    });
                }

                const balance = row ? row.balance : 0;

                // 購入可能か確認
                if (balance >= product.price) {
                    // 購入者の残高を減らす
                    db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [product.price, userId], (err) => {
                        if (err) {
                            console.error('Database error:', err.message);
                            return interaction.reply({
                                embeds: [
                                    new EmbedBuilder()
                                        .setDescription('An error occurred while updating your balance.')
                                        .setColor('Red'),
                                ],
                                ephemeral: true,
                            });
                        }

                        // 販売者の残高を増やす
                        db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [product.price, product.owner_id], (err) => {
                            if (err) {
                                console.error('Database error:', err.message);
                                return interaction.reply({
                                    embeds: [
                                        new EmbedBuilder()
                                            .setDescription('An error occurred while transferring the credits.')
                                            .setColor('Red'),
                                    ],
                                    ephemeral: true,
                                });
                            }

                            // DMで購入情報を送信
                            const successEmbed = new EmbedBuilder()
                                .setTitle('Purchase Successful')
                                .setDescription(`You have purchased "${productName}" for ${product.price} credits.`)
                                .addFields(
                                    { name: 'Download Info', value: product.download_link },
                                )
                                .setColor('Green');

                            interaction.user.send({ embeds: [successEmbed] })
                                .then(() => {
                                    interaction.reply({
                                        embeds: [
                                            new EmbedBuilder()
                                                .setDescription('Purchase successful! Check your DM for the product details.')
                                                .setColor('Green'),
                                        ],
                                        ephemeral: true,
                                    });
                                })
                                .catch((error) => {
                                    console.error('Failed to send DM:', error.message);
                                    interaction.reply({
                                        embeds: [
                                            new EmbedBuilder()
                                                .setDescription('Purchase successful, but I could not send you a DM. Please make sure your DMs are enabled.')
                                                .setColor('Yellow'),
                                        ],
                                        ephemeral: true,
                                    });
                                });
                        });
                    });
                } else {
                    // 残高不足
                    interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setDescription('Insufficient balance to purchase this product.')
                                .setColor('Red'),
                        ],
                        ephemeral: true,
                    });
                }
            });
        });
    },
};
