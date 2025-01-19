const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('createproduct')
        .setDescription('Create a new product'),
    async execute(interaction, db) {
        // Check if the user has Administrator permissions
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({
                content: 'You do not have the required permissions to use this command.',
                ephemeral: true,
            });
        }

        const modal = new ModalBuilder()
            .setCustomId('createProductModal')
            .setTitle('Create a Product');

        const nameInput = new TextInputBuilder()
            .setCustomId('productName')
            .setLabel('Product Name')
            .setStyle(TextInputStyle.Short);

        const priceInput = new TextInputBuilder()
            .setCustomId('productPrice')
            .setLabel('Price')
            .setStyle(TextInputStyle.Short);

        const downloadLinkInput = new TextInputBuilder()
            .setCustomId('downloadLink')
            .setLabel('Download Info')
            .setStyle(TextInputStyle.Paragraph);

        const infoInput = new TextInputBuilder()
            .setCustomId('productInfo')
            .setLabel('Product Info')
            .setStyle(TextInputStyle.Paragraph);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(priceInput),
            new ActionRowBuilder().addComponents(downloadLinkInput),
            new ActionRowBuilder().addComponents(infoInput)
        );

        await interaction.showModal(modal);

        const filter = (i) => i.customId === 'createProductModal' && i.user.id === interaction.user.id;
        interaction.awaitModalSubmit({ filter, time: 60000 })
            .then(async (modalInteraction) => {
                const name = modalInteraction.fields.getTextInputValue('productName');
                const price = parseInt(modalInteraction.fields.getTextInputValue('productPrice'));
                const downloadLink = modalInteraction.fields.getTextInputValue('downloadLink');
                const info = modalInteraction.fields.getTextInputValue('productInfo');
                const ownerId = interaction.user.id;

                db.run('INSERT INTO products (name, price, owner_id, download_link, info) VALUES (?, ?, ?, ?, ?)',
                    [name, price, ownerId, downloadLink, info], (err) => {
                        if (err) {
                            console.error(err.message);
                            return modalInteraction.reply({ content: 'An error occurred while creating the product.', ephemeral: true });
                        }
                        modalInteraction.reply({ content: `Product ${name} created successfully!`, ephemeral: true });
                    });
            })
            .catch(console.error);
    },
};
