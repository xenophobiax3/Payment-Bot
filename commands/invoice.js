const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invoice')
        .setDescription('Create an invoice for topping up balance')
        .addIntegerOption(option => 
            option.setName('amount')
                .setDescription('Amount to top up')
                .setRequired(true)),
    async execute(interaction, db) {
        const amount = interaction.options.getInteger('amount');
        const userId = interaction.user.id;

        const url = "https://api.cryptocloud.plus/v2/invoice/create";
        const headers = {
            "Authorization": `Token ${process.env.API_KEY}`,
            "Content-Type": "application/json"
        };
        const data = {
            "amount": amount,
            "shop_id": process.env.SHOP_ID,
            "currency": "USD"
        };

        try {
            const response = await axios.post(url, data, { headers });

            if (response.status === 200 && response.data.status === 'success') {
                const result = response.data.result;
                const invoiceId = result.uuid;
                const paymentUrl = result.link;

                // データベースに請求書を登録
                db.run('INSERT INTO invoices (invoice_id, user_id) VALUES (?, ?)', [invoiceId, userId], (err) => {
                    if (err) {
                        console.error('Database error:', err.message);
                        const errorEmbed = new EmbedBuilder()
                            .setDescription('An error occurred while saving the invoice to the database.')
                            .setColor('Red');
                        return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                    }

                    const successEmbed = new EmbedBuilder()
                        .setTitle('Invoice Created')
                        .setDescription(`Your invoice has been created successfully!`)
                        .addFields(
                            { name: 'Amount', value: `${amount} USD`, inline: true },
                            { name: 'Payment Link', value: `[Pay Here](${paymentUrl})`, inline: false }
                        )
                        .setColor('Green');
                    interaction.reply({ embeds: [successEmbed], ephemeral: true });
                });
            } else {
                const failureEmbed = new EmbedBuilder()
                    .setDescription(`Failed to create invoice: ${response.data.status}`)
                    .setColor('Red');
                interaction.reply({ embeds: [failureEmbed], ephemeral: true });
            }
        } catch (error) {
            console.error('API error:', error.message);
            const errorEmbed = new EmbedBuilder()
                .setDescription('An error occurred while creating the invoice.')
                .setColor('Red');
            interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },
};
