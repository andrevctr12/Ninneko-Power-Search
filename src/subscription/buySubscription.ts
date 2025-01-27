import {
    CommandInteraction,
    GuildMemberRoleManager,
} from 'discord.js';
import moment from 'moment';
import { bree } from '../index';
import User from '../models/user.model';
import add from './add';
import path from 'path';

export default async function buySubscription(
    user: User | null,
    interaction: CommandInteraction
) {
    const username = interaction.user.username;
    const txID = interaction.options.getString('transaction_id')?.toLowerCase();
    await interaction.editReply({ content: 'Working on it!' });
    console.info(`[INFO][${username}] txID: ${txID}`);

    if (!user?.publicAddress) {
        await interaction.editReply({
            content: 'Please, link a Wallet Address',
        });
    } else if (txID && (await add(user, txID))) {
        let guild = interaction.client.guilds.cache.get('951929724442132520');
        if (!guild) {
            guild = await interaction.client.guilds.fetch('951929724442132520');
        }
        let role = guild?.roles.cache.find(
            (role) => role.name === 'Subscribed'
        );
        if (!role) {
            role = (await guild.roles.fetch()).find((r: any) => r.name === 'Subscribed');
        }
        let member = guild?.members.cache.find(
            (member) => member.id === user.discordID
        );
        if (!member) {
            member = await guild.members.fetch(user.discordID);
          }
        if (role && member) {
            await (member?.roles as GuildMemberRoleManager).add(role as any);
        }

        // subscriptionDue = now + 7 days
        const due = moment().add(1, 'month').toDate();
        user.subscriptionDue = due;
        user.save();

        await interaction.editReply({ content: `Subscribed until next month ${due.toLocaleDateString()}` });
        console.log(`[SUBSCRIBE][${username}]`);

        // Execute task after (date - now) milliseconds
        // setTimeout(async function () {
        //     console.log('Role ended');
        //     await (member?.roles as GuildMemberRoleManager).remove(role as any);
        // }, due.getTime() - now);
        await bree.add({
            name: interaction.user.username,
            date: user.subscriptionDue,
            path: path.join(__dirname, '../../jobs', 'roleTimeout.ts'),
            worker: {
                workerData: {
                    username: interaction.user.username,
                    discordID: user.discordID,
                }
            }
        });
        await bree.start(interaction.user.username);
        console.info('[Bree] ', bree.config.jobs);
    } else {
        await interaction.editReply({
            content: 'Something went wrong, try again or send a ticket',
        });
    }
}
