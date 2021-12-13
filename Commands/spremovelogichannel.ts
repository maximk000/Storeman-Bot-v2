import { Client, CommandInteraction, TextChannel } from "discord.js";
import { getCollections } from '../mongoDB';

const spremovelogichannel = async (interaction: CommandInteraction, client: Client): Promise<boolean> => {
    const collections = getCollections()
    const configDoc = (await collections.config.findOne({}))!

    if ("channelId" in configDoc) {
        const channelObj = client.channels.cache.get(configDoc.channelId) as TextChannel
        const msg = await channelObj.messages.fetch(configDoc.logiMessage)
        await msg.delete()

        await interaction.reply({
            content: "Logi channel was successfully deleted",
            ephemeral: true
        });
    }
    else {
        await interaction.reply({
            content: "Logi channel was not set. Unable to remove.",
            ephemeral: true
        });
    }
    



   
    return true;
}

export default spremovelogichannel