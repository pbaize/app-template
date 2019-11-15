/**
 * A (partial) Peer to peer implementation of FDC3.
 * Introduces the FDC3.Agent api which is required to be implemented for more complex fdc3 functionality.
 * No re-connect logic
 * conflicts when joining multiple channels
 * difference between broadcast on a fdc3 client and the "global" broadcast
 */
import {
  Identity,
  Fin,
} from '../node_modules/hadouken-js-adapter/out/types/src/main';
import { IntentResolution, Listener, DesktopAgent, AppIntent } from './fdc3';
import { ChannelClient } from '../node_modules/hadouken-js-adapter/out/types/src/api/interappbus/channel/client';
import { ChannelProvider } from '../node_modules/hadouken-js-adapter/out/types/src/api/interappbus/channel/provider';
declare var fin: Fin;
// tslint:disable no-any
const connectionsToAgents = new Map<string, FDC3Client>();
const agents = new Map<string, FDC3Agent>();
// tslint:disable-next-line: ban-ts-ignore
//@ts-ignore
const me: Identity = fin.wire.me;
let subscribed: string | null = null;
let globalContextListeners: Array<(c: any) => void> = [];
let globalIntentListeners: Array<[string, (c: any) => void]> = [];
// tslint:disable-next-line: ban-ts-ignore
//@ts-ignore
window.fdc3 = {
  connections: connectionsToAgents,
  agents,
  Agent: {
    create: async (name: string) => {
      const channel = 'FDC3P2P' + name;
      await fin.InterApplicationBus.subscribe(
        { uuid: '*' },
        'FDC3P2P/get-all-agents',
        (_: any, source: Identity) =>
          fin.InterApplicationBus.send(source, 'FDC3P2P/add-agent', {
            channel,
            name,
          })
      );
      const provider = await fin.InterApplicationBus.Channel.create(channel);
      const agent = new FDC3Agent(name, provider);
      agents.set(name, agent);
      setTimeout(
        () =>
          fin.InterApplicationBus.publish('FDC3P2P/add-agent', {
            channel,
            name,
          }),
        100
      ); // give time to add connection listener
      return agent;
    },
    connect: async (name: string, payload?: any) => {
      if (connectionsToAgents.has(name)) {
        return connectionsToAgents.get(name);
      }
      const client = await fin.InterApplicationBus.Channel.connect(
        'FDC3P2P' + name,
        payload
      );
      return new FDC3Client(name, client);
    },
  },
  broadcast(context: object): void {
    if (subscribed === null) {
      fin.InterApplicationBus.publish('FDC3P2P/globalbroadcast', context);
    }
    for (const client of connectionsToAgents.values()) {
      client.broadcast(context);
    }
  },
  async raiseIntent(
    intent: string,
    context: object,
    target?: string | undefined
  ): Promise<IntentResolution> {
    if (connectionsToAgents.size === 0) {
      throw new Error('NoAppsFound');
    }
    return new Promise((resolve, reject) => {
      let pending: Array<Promise<void>> = [];
      for (const client of connectionsToAgents.values()) {
        const p = client
          .raiseIntent(intent, context, target)
          .then(v => {
            resolve(v);
          })
          .catch(e => {
            pending = pending.filter(x => x !== p);
            if (pending.length === 0) {
              reject(e);
            }
          });
        pending.push(p);
      }
    });
  },
  addIntentListener(intent: string, handler: (context: any) => void): Listener {
    const tuple: [string, (c: any) => void] = [intent, handler];
    globalIntentListeners.push(tuple);
    const unsubscribes: Array<() => void> = [];
    for (const client of connectionsToAgents.values()) {
      const unsub = client.addIntentListener(intent, handler).unsubscribe;
      unsubscribes.push(unsub);
    }
    const unsubscribe = () => {
      globalIntentListeners = globalIntentListeners.filter(x => x !== tuple);
      unsubscribes.forEach(x => x());
    };
    return { unsubscribe };
  },
  addContextListener(handler: (context: object) => void): Listener {
    globalContextListeners.push(handler);
    const unsubscribes: Array<() => void> = [];
    for (const client of connectionsToAgents.values()) {
      const unsub = client.addContextListener(handler).unsubscribe;
      unsubscribes.push(unsub);
    }
    const unsubscribe = () => {
      globalContextListeners = globalContextListeners.filter(
        x => x !== handler
      );
      unsubscribes.forEach(x => x());
    };
    return {
      unsubscribe,
    };
  },
};
async function init() {
  await fin.InterApplicationBus.subscribe(
    { uuid: '*' },
    'FDC3P2P/add-agent',
    async (info: any, source: Identity) => {
      if (!agents.has(info.name)) {
        const channel = await fin.InterApplicationBus.Channel.connect(
          info.channel
        );
        const client = new FDC3Client(info.name, channel);
        connectionsToAgents.set(info.name, client);
        globalContextListeners.forEach(f => client.addContextListener(f));
        globalIntentListeners.forEach(([i, f]) =>
          client.addIntentListener(i, f)
        );
      }
    }
  );
  await fin.InterApplicationBus.subscribe(
    { uuid: '*' },
    'FDC3P2P/globalbroadcast',
    (context: any) => {
      if (subscribed === null) globalContextListeners.forEach(f => f(context));
    }
  );
  await fin.InterApplicationBus.publish('FDC3P2P/get-all-agents', me);
}
init();
class FDC3Client implements DesktopAgent {
  private intentListeners: any[];
  private contextListeners: any[];
  private iabTopic: string | null = null;
  private channelId: string | null = null;
  constructor(public name: string, private client: ChannelClient) {
    this.intentListeners = [];
    this.contextListeners = [];
    this.client.register('joined-channel', async ({previous, joining}: {previous: any, joining: any}) => {
        if (previous) await this._leaveChannel(previous)
        await this._joinChannel(joining)
    });
  }

  findIntent = (
    intent: string,
    context?: object | undefined
  ): Promise<AppIntent> => {
    throw new Error('Method not implemented.');
  };
  findIntentsByContext = (context: object): Promise<AppIntent[]> => {
    throw new Error('Method not implemented.');
  };
  broadcast = (context: object): void => {
    if (this.iabTopic) {
      fin.InterApplicationBus.publish(this.iabTopic, context);
    }
  };
  raiseIntent = (
    intent: string,
    context: object,
    target?: string | undefined
  ): Promise<IntentResolution> => {
    return this.client.dispatch('raise-intent', { intent, context, target });
  };
  addIntentListener = (
    intent: string,
    handler: (context: object) => void
  ): Listener => {
    throw new Error('Method not implemented.');
  };
  addContextListener = (handler: (context: object) => void): Listener => {
    this.contextListeners.push(handler);
    const unsubscribe = () => {
      this.contextListeners = this.contextListeners.filter(x => x !== handler);
    };
    return {
      unsubscribe,
    };
  };
  private _joinChannel = async ({ id, iabTopic }: any) => {
    if (id !== 'default') {
      subscribed = this.name;
    }
    this.iabTopic = iabTopic;
    await fin.InterApplicationBus.subscribe(
      { uuid: '*' },
      iabTopic,
      this._handleContext
    );
  };

  private _leaveChannel = async ({ iabTopic }: { iabTopic: string }) => {
    if (subscribed === this.name) {
      subscribed = null;
    }
    this.iabTopic = null;
    this.channelId = null;
    await fin.InterApplicationBus.unsubscribe(
      { uuid: '*' },
      iabTopic,
      this._handleContext
    );
  };

  async getAllChannels() {
    const info = await this.client.dispatch('get-channel-info');
    const decorateInfo = (info: any) =>
      Object.assign(info, {
        join: (identity = me) => this.joinChannel(info.id, me),
      });
    return info.map(decorateInfo);
  }
  private async joinChannel(channelId: string, identity: Identity = me) {
    await this.client.dispatch('join-channel', {
      channelId,
      identity,
      previousChannel: this.channelId,
    });
  }
  open = async (name: string, context?: any) => {
    await this.client.dispatch('open', { name, context });
  };
  private _handleContext = (context: any) => {
    this.contextListeners.forEach(f => {
      f(context);
    });
  };
}

class FDC3Agent {
  channels = new Map<string, any>();
  constructor(public name: string, public provider: ChannelProvider) {
    this.createChannel({ id: 'default' });
    provider.register(
      'join-channel',
      async ({
        channelId,
        identity
      }: {
        channelId: string;
        previousChannel: string;
        identity: Identity;
      }) => {
        if (!this.channels.has(channelId)) {
          throw new Error('Could not locate requested channel');
        }
        const previous: any = Array.from(this.channels.values()).find(x => x.members.some(id => id.uuid === identity.uuid && id.name === identity.name));
        if (previous) {
          previous.members = previous.members.filter(
            (x: Identity) =>
              x.uuid !== identity.uuid && x.name !== identity.name
          );
        }
        const joining = this.channels.get(channelId);
        await provider.dispatch(identity, 'joined-channel', {previous, joining});
        await fin.InterApplicationBus.send(
          identity,
          joining.iabTopic,
          joining.context
        );
      }
    );
    provider.register('get-channel-info', () =>
      Array.from(this.channels.values())
    );
    provider.setDefaultAction(() => {
      throw new Error('FDC3 Agent has not implemented this method');
    });
  }
  registerOpenHandler = async (
    handler: (name: string, context: any) => void
  ) => {
    this.provider.register(
      'open',
      ({ context, name }: { name: string; context: any }) =>
        handler(name, context)
    );
  };
  registerIntentResolver = async (
    handler: (
      intent: string,
      context: any,
      target?: string,
      identity?: Identity
    ) => Promise<IntentResolution>
  ) => {
    this.provider.register(
      'raise-intent',
      ({ intent, context, target }: any, sender) =>
        handler(intent, context, target, sender)
    );
  };
  createChannel(info: { id: string }) {
    const iabTopic = this.name + info.id + Math.random() + Date.now();
    const members: Identity[] = [];
    const context: any = null;
    this.channels.set(info.id, { iabTopic, members, context, ...info });
  }
}
