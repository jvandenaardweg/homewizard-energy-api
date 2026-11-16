import { Client, DeviceOptions } from '../client';
import * as endpoints from '../endpoints';
import { pair, PairOptions, PairResult } from '../pairing';
import { DeviceInformation, System, User } from '../types';
import { CommonTopics, DeviceSocket, WebSocketOptions } from '../websocket';

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

export interface PairedDevice<TDevice> extends PairResult {
  /** The device, set up with the new token and identifier. */
  device: TDevice;
}

/**
 * What every device with the API v2 has: device information, measurement, system, users and the WebSocket.
 *
 * @internal Use the device classes, such as `v2.P1Meter`.
 */
export abstract class Device<
  TMeasurement,
  TSystem extends Partial<System>,
  TSystemUpdate,
  TTopics extends CommonTopics<TMeasurement, TSystem> = CommonTopics<TMeasurement, TSystem>,
> {
  protected readonly client: Client;

  /**
   * @param host The IP address or hostname of the device, for example `192.168.1.35`.
   */
  constructor(host: string, options: DeviceOptions) {
    this.client = new Client(host, options);
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
  openWebSocket(options?: WebSocketOptions): DeviceSocket<TTopics> {
    const socket = new DeviceSocket<TTopics>(
      {
        url: `${this.client.baseUrl.replace(/^https:/i, 'wss:')}/api/ws`,
        token: this.client.token,
        dispatcher: this.client.dispatcher,
        logger: this.client.loggerOptions,
      },
      options,
    );

    socket.connect();

    return socket;
  }

  /**
   * Pairs with the device, see `v2.pair()`, and returns the device set up with the new token and identifier.
   * Store the token and identifier: next time, create the device with them instead of pairing again.
   *
   * @example
   * const { device, token, identifier } = await v2.P1Meter.pair('192.168.1.35', 'my-app');
   */
  static async pair<TDevice>(
    this: new (host: string, options: DeviceOptions) => TDevice,
    host: string,
    name: string,
    options: PairOptions = {},
  ): Promise<PairedDevice<TDevice>> {
    const result = await pair(host, name, options);
    const { insecure, timeout, logger, dispatcher, ca } = options;

    const device = new this(host, {
      insecure,
      timeout,
      logger,
      dispatcher,
      ca,
      token: result.token,
      identifier: result.identifier,
    });

    return { ...result, device };
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
  getMeasurement(): Promise<TMeasurement> {
    return endpoints.getMeasurement<TMeasurement>(this.client);
  }

  /**
   * Returns the Wi-Fi, uptime, cloud and LED settings of the device.
   *
   * @link https://api-documentation.homewizard.com/docs/v2/system
   */
  getSystem(): Promise<TSystem> {
    return endpoints.getSystem<TSystem>(this.client);
  }

  /**
   * Changes system settings, and returns them all.
   *
   * Disabling `cloud_enabled` stops the HomeWizard app and firmware updates, so make sure the user understands
   * that before changing it.
   *
   * @link https://api-documentation.homewizard.com/docs/v2/system
   */
  updateSystem(params: TSystemUpdate): Promise<TSystem> {
    return endpoints.updateSystem<TSystem>(this.client, params as Partial<System>);
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
