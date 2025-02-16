import { Socket } from 'socket.io';
import { WebSocket } from '../websocket';
import { WSEvent, } from './ws-event';
import { WS } from '../../types/ws';
import { Channel } from '../../data/models/channel';

export default class implements WSEvent<'MESSAGE_CREATE'> {
  on = 'MESSAGE_CREATE' as const;

  public async invoke(ws: WebSocket, client: Socket, { attachmentURLs, channelId, content, embed }: WS.Params.MessageCreate) {
    const authorId = ws.sessions.userId(client);    
    
    const [_, message, author] = await Promise.all([
      deps.wsGuard.validateCanInChannel(client, channelId, 'SEND_MESSAGES'), 
      deps.messages.create(authorId, channelId, { attachmentURLs, content, embed }),
      deps.users.getSelf(authorId),
    ]);

    author.lastReadMessageIds ??= {};
    author.lastReadMessageIds[channelId] = message.id;
    await author.save();

    await Channel.updateOne({ _id: channelId }, { lastMessageId: message.id }),

    ws.io
      .to(channelId)
      .emit('MESSAGE_CREATE', { message } as WS.Args.MessageCreate);
  }
}