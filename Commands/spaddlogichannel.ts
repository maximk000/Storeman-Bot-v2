import { Client, ChatInputCommandInteraction, GuildMember, ActionRowBuilder, ButtonBuilder, TextChannel } from "discord.js";
import { getCollections } from '../mongoDB';
import checkPermissions from "../Utils/checkPermissions";
import generateMsg from '../Utils/generateStockpileMsg'

const spaddlogichannel = async (interaction: ChatInputCommandInteraction, client: Client): Promise<boolean> => {
    try {
        const channel = interaction.options.getChannel("channel")! // Tell typescript to shut up and it is non-null

        if (!(await checkPermissions(interaction, "admin", interaction.member as GuildMember))) return false

        if (!channel) {
            await interaction.editReply({
                content: "Missing parameters"
            });
            return false
        }

        

        const collections = process.env.STOCKPILER_MULTI_SERVER === "true" ? getCollections(interaction.guildId) : getCollections()
        const channelObj = client.channels.cache.get(channel.id) as TextChannel

        const configDoc = (await collections.config.findOne({}))!
        if (configDoc.channels && configDoc.channels[channel.id]) {
            const channelConfig = configDoc.channels[channel.id];
            const newChannelObj = client.channels.cache.get(channel.id) as TextChannel;
        
            // Attempt to delete the stockpile messages header
            try {
                const msg = await newChannelObj.messages.fetch(channelConfig.stockpileMsgsHeader);
                await msg.delete();
                console.log("stockpileMsgsHeader deleted successfully");
            } catch (e) {
                console.log("Failed to delete stockpileMsgsHeader:", e);
            }
        
            // Attempt to delete the stockpile header message
            try {
                const msg = await newChannelObj.messages.fetch(channelConfig.stockpileHeader);
                await msg.delete();
                console.log("stockpile header msg deleted successfully");
            } catch (e) {
                console.log("Failed to delete stockpile header msg:", e);
            }
        
            // Attempt to delete stockpile messages
            for (let i = 0; i < channelConfig.stockpileMsgs.length; i++) {
                try {
                    const stockpileMsg = await newChannelObj.messages.fetch(channelConfig.stockpileMsgs[i]);
                    await stockpileMsg.delete();
                    console.log("stockpileMsg deleted successfully");
                } catch (e) {
                    console.log("Failed to delete stockpileMsg:", e);
                }
            }
        
            // Attempt to delete target messages
            for (let i = 0; i < channelConfig.targetMsg.length; i++) {
                try {
                    const targetMsg = await newChannelObj.messages.fetch(channelConfig.targetMsg[i]);
                    await targetMsg.delete();
                    console.log("targetMsg deleted successfully");
                } catch (e) {
                    console.log("Failed to delete targetMsg:", e);
                }
            }
        
            // Attempt to delete the refreshAll message
            try {
                const refreshAllID = await newChannelObj.messages.fetch(channelConfig.refreshAllID);
                await refreshAllID.delete();
                console.log("refreshAll msg deleted successfully");
            } catch (e) {
                console.log("Failed to delete refreshAll msg:", e);
            }
        } else {
            console.log("No existing messages for this channel to delete.");
        }
        const [stockpileHeader, stockpileMsgs, targetMsg, stockpileMsgsHeader, refreshAll] = await generateMsg(false, interaction.guildId)
        const newMsg = await channelObj.send(stockpileHeader)
        const stockpileMsgsHeaderID = await channelObj.send(stockpileMsgsHeader)
        let stockpileMsgIDs: any = []
        let stockpileIndex = 0
        for (let i = 0; i < stockpileMsgs.length; i++) {

            if (typeof stockpileMsgs[i] !== "string") {
                const temp = await channelObj.send({ content: stockpileMsgs[i][0], components: [stockpileMsgs[i][1]] })
                stockpileMsgIDs.push(temp.id)
                stockpileIndex += 1
            }
            else {
                const temp = await channelObj.send(stockpileMsgs[i])
                stockpileMsgIDs.push(temp.id)
            }


        }

        // Send refresh all stockpiles
        const refreshAllID = await channelObj.send({ content: "----------\nRefresh the timer of **all stockpiles**", components: [refreshAll] })

        let targetMsgIDs: String[] = []
        for (let i = 0; i < targetMsg.length; i++) {
            const targetMsgID = await channelObj.send(targetMsg[i])
            targetMsgIDs.push(targetMsgID.id)
        }

        await collections.config.updateOne(
            {}, 
            { 
                $set: { 
                    [`channels.${channel.id}.stockpileHeader`]: newMsg.id,
                    [`channels.${channel.id}.stockpileMsgs`]: stockpileMsgIDs,
                    [`channels.${channel.id}.targetMsg`]: targetMsgIDs,
                    [`channels.${channel.id}.stockpileMsgsHeader`]: stockpileMsgsHeaderID.id,
                    [`channels.${channel.id}.refreshAllID`]: refreshAllID.id
                } 
            }
        )
        
        await interaction.editReply({
            content: "Logi channel '" + channel.name + "' added successfully",
        });
        
    }
    catch (e) {
        console.log(e)
    }
    return true;
}

export default spaddlogichannel
