import { Client, Credentials, ConnectionOptions } from '../client';
import * as endpoints from '../endpoints';
import { pair, PairOptions, splitPairOptions } from '../pairing';
import { DeviceInformation, System, User } from '../types';
import { SocketTarget, WebSocketOptions } from '../websocket';

export interface Users {
  /**
   * Returns all users of the device, including the ones the HomeWizard cloud created (`cloud/…`).
   *
   * @link https://api-documentation.homewizard.com/docs/v2/authorization#list-users
   */
  list(): Promise<User[]>;
  /**
   * Deletes a user, after which its token stops working. The name includes its prefix (`local/` or `cloud/`).
   * Deleting your own user removes your access, so make sure another user has access first.
   *
   * @link https://api-documentation.homewizard.com/docs/v2/authorization#delete-user
   */
  delete(name: string): Promise<void>;
}

export interface PairedDevice<TDevice> {
  /** The host, token and identifier. Store them, to create the device next time without pairing again. */
  credentials: Credentials;
  /** The device, set up with the credentials. */
  device: TDevice;
}

/** What differs per device: its responses, the settings it lets you change, and its WebSocket. */
export interface DeviceSpec {
  /** The response of `getMeasurement()`. */
  measurement: unknown;
  /** The response of `getSystem()` and `updateSystem()`. */
  system: Partial<System>;
  /** The settings `updateSystem()` takes. */
  systemUpdate: unknown;
  /** The socket `openWebSocket()` returns, typed with the device's topics and writable settings. */
  socket: { connect(): void };
}

/**
 * What every device with the API v2 has: device information, measurement, system, users and the WebSocket.
 *
 * @internal Use the device classes, such as `P1Meter`.
 */
export abstract class Device<TSpec extends DeviceSpec> {
  protected readonly client: Client;
  /** The socket class `openWebSocket()` creates. Devices that can identify use `IdentifiableDeviceSocket`. */
  protected abstract readonly socketClass: new (
    target: SocketTarget,
    options?: WebSocketOptions,
  ) => TSpec['socket'];
  /** The IP address or hostname this device connects to, as given in the credentials. */
  readonly host: string;

  /**
   * @param credentials The host, token and identifier, as `pair()` returns them.
   * @param options How to connect, for example a `timeout` or a `logger`.
   */
  constructor(credentials: Credentials, options: ConnectionOptions = {}) {
    const { host, token, identifier } = credentials;

    this.host = host;
    this.client = new Client(host, { ...options, token, identifier });
  }

  /**
   * Opens the WebSocket of the device, which pushes the data of the topics you subscribe to when it changes.
   * Each call opens a new connection: close it with `socket.close()`.
   *
   * @example
   * const socket = p1.openWebSocket();
   * socket.on('measurement', measurement => console.log(measurement.power_w));
   * socket.subscribe('measurement');
   *
   * @link https://api-documentation.homewizard.com/docs/v2/websocket
   */
  openWebSocket(options?: WebSocketOptions): TSpec['socket'] {
    const socket = new this.socketClass(this.client.webSocketTarget(), options);

    socket.connect();

    return socket;
  }

  /**
   * Pairs with the device, see `pair()`, and returns the device set up with the new credentials. Store the
   * credentials: next time, create the device with them instead of pairing again.
   *
   * @example
   * const { device, credentials } = await P1Meter.pair('192.168.1.35', 'my-app');
   */
  static async pair<TDevice>(
    this: new (credentials: Credentials, options?: ConnectionOptions) => TDevice,
    host: string,
    name: string,
    options: PairOptions = {},
  ): Promise<PairedDevice<TDevice>> {
    const credentials = await pair(host, name, options);

    return {
      credentials,
      device: new this(credentials, splitPairOptions(options).connectionOptions),
    };
  }

  /**
   * Returns the product type, serial, firmware version and API version of the device.
   *
   * @link https://api-documentation.homewizard.com/docs/v2/device_information
   */
  getDevice(): Promise<DeviceInformation> {
    return endpoints.getDevice(this.client);
  }

  /**
   * Returns the most recent measurement. Data points the device doesn't have are left out.
   *
   * @link https://api-documentation.homewizard.com/docs/v2/measurement
   */
  getMeasurement(): Promise<TSpec['measurement']> {
    return endpoints.getMeasurement<TSpec['measurement']>(this.client);
  }

  /**
   * Returns the Wi-Fi, uptime, cloud and LED settings of the device.
   *
   * @link https://api-documentation.homewizard.com/docs/v2/system
   */
  getSystem(): Promise<TSpec['system']> {
    return endpoints.getSystem<TSpec['system']>(this.client);
  }

  /**
   * Changes system settings, and returns them all.
   *
   * Disabling `cloud_enabled` stops the HomeWizard app and firmware updates, so make sure the user understands
   * that before changing it.
   *
   * @link https://api-documentation.homewizard.com/docs/v2/system
   */
  updateSystem(params: TSpec['systemUpdate']): Promise<TSpec['system']> {
    return endpoints.updateSystem<TSpec['system']>(this.client, params as Partial<System>);
  }

  /** The users on the device. */
  get users(): Users {
    return {
      list: () => endpoints.listUsers(this.client),
      delete: (name: string) => endpoints.deleteUser(this.client, name),
    };
  }

  /** Closes the connections to the device. Call it when you no longer need this instance. */
  close(): Promise<void> {
    return this.client.close();
  }
}
