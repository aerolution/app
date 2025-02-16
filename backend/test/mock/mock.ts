import { Channel, ChannelDocument } from '../../src/data/models/channel';
import { Guild, GuildDocument } from '../../src/data/models/guild';
import { GuildMember, GuildMemberDocument } from '../../src/data/models/guild-member';
import { User, SelfUserDocument } from '../../src/data/models/user';
import { generateSnowflake } from '../../src/data/snowflake-entity';
import { Role, RoleDocument } from '../../src/data/models/role';
import { Message } from '../../src/data/models/message';
import { Invite } from '../../src/data/models/invite';
import Roles from '../../src/data/roles';
import Messages from '../../src/data/messages';
import Invites from '../../src/data/invites';
import { App } from '../../src/data/models/app';
import { WebSocket } from '../../src/ws/websocket';

import Guilds from '../../src/data/guilds';
import GuildMembers from '../../src/data/guild-members';
import Channels from '../../src/data/channels';
import { PermissionTypes } from '../../src/types/permission-types';
import { REST } from '../../src/rest/server';
import Users from '../../src/data/users';

// TODO: eventually replace with data wrappers
export class Mock {
  public static channels = deps.channels;
  public static guilds = deps.guilds;
  public static guildMembers = deps.guildMembers;
  public static messages = deps.messages;
  public static invites = deps.invites;
  public static roles = deps.roles;
  public static users = deps.users;

  public static async defaultSetup(client: any, eventType: any = function() {}) {
    deps.rest;

    const event = new (eventType as any)();
    const ws = deps.webSocket;

    const guild = await this.guild();
    const guildId = guild.id;

    const [ownerUser, ownerMember, noobUser, noobMember, everyoneRole, textChannel] = await Promise.all([
      User.findOne({ guildIds: guildId }) as any as SelfUserDocument,
      GuildMember.findOne({ _id: guild.ownerId, guildId }),
      User.findOne({ _id: { $ne: guild.ownerId }, guildIds: guildId }) as any as SelfUserDocument,
      GuildMember.findOne({ _id: { $ne: guild.ownerId }, guildId }),
      Role.findOne({ guildId }),
      Channel.findOne({ guildId }),
    ]);

    Mock.ioClient(client);
    ws.sessions.set(client.id, noobUser.id);

    return { event, guild, ownerUser, ownerMember, noobUser, noobMember, ws, everyoneRole, textChannel };
  }
  public static async afterEach(ws) {
    ws.sessions.clear();  
    await Mock.cleanDB();  
  }
  public static async after(client) {
    client.disconnect();
  }

  // FIXME: less maintainable than daily YouTube uploads
  public static ioClient(client: any) {
    client.rooms = [];
    client.sockets = {
      adapter: { rooms: client.rooms },
    };
    client.join = async (...args) => {
      client.rooms.push(...args);
    };
    client.leave = async (...args) => {
      for (const arg of args)
        client.rooms.delete(arg);
    };
    client.sockets.sockets = {
      get: () => ({ join: client.join }),
    };
  }

  public static async message(author: Entity.User, channelId: string, options?: Partial<Entity.Message>) {
    return await this.messages.create(author.id, channelId, {
      content: 'testing123',
      ...options,
    });
  }

  public static async guild(): Promise<GuildDocument> {
    const owner = await Mock.self();
    const memberUser = await Mock.self();
    
    const guild = await this.guilds.create('Mock Guild', owner); 
    await this.guildMembers.create(guild.id, memberUser); 
    
    return guild;
  }

  public static async user(options?: Partial<UserTypes.Self>): Promise<SelfUserDocument> {
    return await User.create({
      avatarURL: 'a',
      bot: false,
      email: `${generateSnowflake()}@gmail.com`,
      verified: true,
      username: `mock-user-${generateSnowflake()}`,
      discriminator: 1,
      ...options,
    } as any) as any;
  }

  public static async self(guildIds: string[] = []) {
    return await this.user({ guildIds }) as any as SelfUserDocument;
  }
  public static async bot(guildIds: string[] = []): Promise<SelfUserDocument> {
    return await Mock.user({ bot: true, guildIds });
  }
  public static guildMember(user: SelfUserDocument, guild: GuildDocument): Promise<GuildMemberDocument> {    
    return this.guildMembers.create(guild.id, user);
  }
  public static channel(options?: Partial<Entity.Channel>): Promise<ChannelDocument> {
    return this.channels.create(options);
  }
  public static role(guildId: string, options?: Partial<Entity.Role>): Promise<RoleDocument> {
    return this.roles.create(guildId, options);
  }
  public static invite(guildId: string, options?: InviteTypes.Options) {
    return this.invites.create({ options, guildId }, generateSnowflake());
  }
  public static everyoneRole(guildId: string, permissions = PermissionTypes.defaultPermissions) {
    return this.roles.create(guildId, { name: '@everyone', permissions });
  }

  public static async clearRolePerms(guild: Entity.Guild) {
    await Role.updateMany({ guildId: guild.id }, { permissions: 0 });
  }
  public static async giveRolePerms(role: RoleDocument, permissions: PermissionTypes.Permission) {
    await role.updateOne({ permissions: role.permissions | permissions });
  }

  public static async giveEveryoneAdmin(guild: Entity.Guild) {
    await Role.updateOne(
      { guildId: guild.id },
      { permissions: PermissionTypes.General.ADMINISTRATOR },
    );
  }

  public static async givePerm(guild: GuildDocument, member: GuildMemberDocument, permissions: PermissionTypes.Permission) {
    const role = await this.role(guild, permissions);
    member.roleIds.push(role.id);    
    await member.save();
  }

  public static async cleanDB() {
    await App.deleteMany({});
    await Channel.deleteMany({});
    await Guild.deleteMany({});
    await GuildMember.deleteMany({});
    await Invite.deleteMany({});
    await Message.deleteMany({});
    await Role.deleteMany({});
    await User.deleteMany({});
  }

  public static async makeGuildOwner(ws: any, client: any, guild: GuildDocument) {
    ws.sessions.set(client.id, guild.ownerId);
    await Mock.clearRolePerms(guild);
  }
}
