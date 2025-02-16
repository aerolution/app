import Channels from '../../data/channels';
import { WS } from '../../types/ws';

import { WSGuard } from '../modules/ws-guard';
import { WSEvent } from './ws-event';
import { WebSocket } from '../websocket';
import { Socket } from 'socket.io';
import { VoiceService } from '../../voice/voice-service';
import Users from '../../data/users';
import { SelfUserDocument } from '../../data/models/user';
import { ChannelDocument } from '../../data/models/channel';

export default class implements WSEvent<'CHANNEL_LEAVE'> {
  on = 'CHANNEL_LEAVE' as const;

  public async invoke(ws: WebSocket, client: Socket) {
    const userId = ws.sessions.get(client.id);
    const user = await deps.users.getSelf(userId);
    
    const oldChannel = await deps.channels.getSafely(user.voice.channelId);
    if (oldChannel)
      await this.handleExistingVC(oldChannel, userId, ws, client);

    await this.updateVoiceState(user);

    client.emit('VOICE_STATE_UPDATE', {
      userId: user.id,
      voice: user.voice,
    } as WS.Args.VoiceStateUpdate);
  }

  private async handleExistingVC(oldChannel: ChannelDocument, userId: string, ws: WebSocket, client) {
    if (oldChannel.type !== 'VOICE')
      throw new TypeError('You cannot leave a non-voice channel');

    // TODO: perms - validate can leave
    const doesExist = oldChannel.userIds.includes(userId);
    if (!doesExist)
      throw new TypeError('User not connected to voice');

    // leave voice server
    deps.voiceService.remove(oldChannel.id, userId);
    await deps.channels.leaveVC(oldChannel, userId);

    ws.io
      .to(oldChannel.guildId)
      .emit('CHANNEL_UPDATE', {
        channelId: oldChannel.id,
        partialChannel: { userIds: oldChannel.userIds },
      } as WS.Args.ChannelUpdate);

    await client.leave(oldChannel.id);
  }

  private async updateVoiceState(user: SelfUserDocument) {
    user.voice = { channelId: undefined };
    await user.save();
  }
}