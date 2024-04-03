import { Client, ChatInputCommandInteraction, GuildMember, TextChannel } from "discord.js";
import { getCollections } from '../mongoDB';
import checkPermissions from "../Utils/checkPermissions";

const spremovelogichannel = async (interaction: ChatInputCommandInteraction, client: Client): Promise<boolean> => {
    // Assume we get the channel ID from the interaction options
    const channel = interaction.options.getChannel("channel");

    if (!channel) {
        await interaction.editReply({
            content: "You must specify a channel to remove."
        });
        return false;
    }

    const collections = process.env.STOCKPILER_MULTI_SERVER === "true" ? getCollections(interaction.guildId) : getCollections();
    const configDoc = (await collections.config.findOne({}))!;

    if (!(await checkPermissions(interaction, "admin", interaction.member as GuildMember))) return false;

    // Check if the specified channel is configured
    if (configDoc.channels && configDoc.channels[channel.id]) {
        const channelConfig = configDoc.channels[channel.id];
        const channelObj = client.channels.cache.get(channel.id) as TextChannel;

        // Delete messages based on the stored IDs in the channel's config
        const messageIds = [
            channelConfig.stockpileHeader,
            channelConfig.stockpileMsgsHeader,
            ...channelConfig.stockpileMsgs,
            ...channelConfig.targetMsg,
            channelConfig.refreshAllID,
        ];

        for (const messageId of messageIds) {
            try {
                const msg = await channelObj.messages.fetch(messageId);
                await msg.delete();
                console.log(`Message ${messageId} deleted successfully.`);
            } catch (e) {
                console.log(`Failed to delete message ${messageId}:`, e);
            }
        }

        // Remove the channel's configuration from the database
        await collections.config.updateOne({}, { $unset: { [`channels.${channel.id}`]: "" } });

        await interaction.editReply({
            content: `Logi channel ${channel.name} was successfully removed.`,
        });
    } else {
        await interaction.editReply({
            content: "Specified logi channel is not configured or does not exist.",
        });
    }

    return true;
};

export default spremovelogichannel;
