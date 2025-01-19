const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('checkinvoice')
        .setDescription('Check the status of an invoice')
        .addStringOption(option =>
            option.setName('invoice_id')
                .setDescription('The ID of the invoice to check')
                .setRequired(true)),
    
    async execute(interaction, db) {
        const invoiceId = interaction.options.getString('invoice_id');
        const url = "https://api.cryptocloud.plus/v2/invoice/merchant/info";
        const headers = {
            "Authorization": `Token ${process.env.API_KEY}`
        };
        const data = {
            "uuids": [invoiceId]
        };

        try {
            const response = await axios.post(url, data, { headers });

            if (response.status === 200) {
                const invoices = response.data.result;

                if (Array.isArray(invoices)) {
                    const invoiceInfo = invoices.find(inv => inv.uuid === invoiceId);

                    if (invoiceInfo) {
                        const embed = new EmbedBuilder()
                            .setColor('#0099ff')
                            .setTitle('Invoice Status')
                            .setDescription(`Invoice ${invoiceId} status: ${invoiceInfo.status}`)
                            .addFields(
                                { name: 'Received Amount', value: invoiceInfo.received.toString(), inline: true }
                            );

                        if (['paid', 'overpaid'].includes(invoiceInfo.status)) {
                            db.get('SELECT user_id FROM invoices WHERE invoice_id = ?', [invoiceId], (err, row) => {
                                if (err) {
                                    console.error('Database query error:', err.message);
                                    return interaction.reply({ content: 'An error occurred while checking the invoice.', flags: MessageFlags.Ephemeral });
                                }
                                if (row) {
                                    const userId = row.user_id;

                                    db.get('SELECT balance FROM users WHERE id = ?', [userId], (err, userRow) => {
                                        if (err) {
                                            console.error('Error fetching balance:', err.message);
                                            return interaction.reply({ content: 'An error occurred while fetching the balance.', flags: MessageFlags.Ephemeral });
                                        }
                                        if (userRow) {
                                            const currentBalance = userRow.balance || 0;
                                            const newBalance = currentBalance + parseFloat(invoiceInfo.received);

                                            db.run('UPDATE users SET balance = ? WHERE id = ?', [newBalance, userId], (err) => {
                                                if (err) {
                                                    console.error('Error updating balance:', err.message);
                                                    return interaction.reply({ content: 'An error occurred while updating your balance.', flags: MessageFlags.Ephemeral });
                                                }
                                                interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                                            });
                                        } else {
                                            interaction.reply({ content: 'User not found in the users table.', flags: MessageFlags.Ephemeral });
                                        }
                                    });
                                } else {
                                    interaction.reply({ content: 'Invoice not found in the database.', flags: MessageFlags.Ephemeral });
                                }
                            });
                        } else {
                            interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                        }
                    } else {
                        interaction.reply({ content: 'Invoice not found in the response.', flags: MessageFlags.Ephemeral });
                    }
                } else {
                    interaction.reply({ content: 'Invalid response format: invoices is not an array.', flags: MessageFlags.Ephemeral });
                }
            } else {
                interaction.reply({ content: 'Failed to fetch invoice information.', flags: MessageFlags.Ephemeral });
            }
        } catch (error) {
            console.error('Error during API request or processing:', error);
            interaction.reply({ content: 'An error occurred while checking the invoice.', flags: MessageFlags.Ephemeral });
        }
    },
};
