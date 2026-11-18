import { HomeWizardError } from './errors';
import { Client } from './client';
import {
  Batteries,
  BatteriesUpdate,
  DeviceInformation,
  LOCAL_USER_PREFIX,
  System,
  User,
  USER_NAME_PATTERN,
  UserCreated,
} from './types';

/*
 * One function per endpoint of the API v2. The device classes expose the ones their device supports.
 */

/** `GET /api` @link https://api-documentation.homewizard.com/docs/v2/device_information */
export function getDevice(client: Client): Promise<DeviceInformation> {
  return client.json('GET', '/api');
}

/** `GET /api/measurement` @link https://api-documentation.homewizard.com/docs/v2/measurement */
export function getMeasurement<T>(client: Client): Promise<T> {
  return client.json('GET', '/api/measurement');
}

/** `GET /api/system` @link https://api-documentation.homewizard.com/docs/v2/system */
export function getSystem<T extends Partial<System>>(client: Client): Promise<T> {
  return client.json('GET', '/api/system');
}

/** `PUT /api/system` @link https://api-documentation.homewizard.com/docs/v2/system */
export function updateSystem<T extends Partial<System>>(
  client: Client,
  params: Partial<System>,
): Promise<T> {
  return client.json('PUT', '/api/system', params);
}

/** `PUT /api/system/identify` @link https://api-documentation.homewizard.com/docs/v2/system#identify */
export function identify(client: Client): Promise<void> {
  return client.empty('PUT', '/api/system/identify');
}

/** `PUT /api/system/reboot` @link https://api-documentation.homewizard.com/docs/v2/system#reboot */
export function reboot(client: Client): Promise<void> {
  return client.empty('PUT', '/api/system/reboot');
}

/** `GET /api/telegram` @link https://api-documentation.homewizard.com/docs/v2/telegram */
export function getTelegram(client: Client): Promise<string> {
  return client.text('GET', '/api/telegram');
}

/** `GET /api/batteries` @link https://api-documentation.homewizard.com/docs/v2/batteries */
export function getBatteries(client: Client): Promise<Batteries> {
  return client.json('GET', '/api/batteries');
}

/** `PUT /api/batteries` @link https://api-documentation.homewizard.com/docs/v2/batteries */
export function updateBatteries(client: Client, params: BatteriesUpdate): Promise<Batteries> {
  return client.json('PUT', '/api/batteries', params);
}

/**
 * Adds the `local/` prefix when it's missing, and checks the name against the rules of the device.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/authorization#parameters
 */
export function toLocalUserName(name: string): string {
  // Not a TypeError for a name that isn't a string, from JavaScript: pairing would retry it until the pair timeout
  const withoutPrefix =
    typeof name === 'string' && name.startsWith(LOCAL_USER_PREFIX)
      ? name.slice(LOCAL_USER_PREFIX.length)
      : name;

  if (typeof withoutPrefix !== 'string' || !USER_NAME_PATTERN.test(withoutPrefix)) {
    throw new HomeWizardError(
      'invalid',
      `The user name "${name}" is invalid: use 1 to 40 characters of a-z, A-Z, 0-9, -, _, \\, /, # and spaces`,
    );
  }

  return `${LOCAL_USER_PREFIX}${withoutPrefix}`;
}

/**
 * `POST /api/user`. Fails with `user:creation-not-enabled` until the button on the device is pressed.
 *
 * @link https://api-documentation.homewizard.com/docs/v2/authorization#create-user-and-get-token
 */
export async function createUser(client: Client, name: string): Promise<UserCreated> {
  const user = await client.json<UserCreated>('POST', '/api/user', { name: toLocalUserName(name) });

  return user;
}

/** `GET /api/user` @link https://api-documentation.homewizard.com/docs/v2/authorization#list-users */
export function listUsers(client: Client): Promise<User[]> {
  return client.json('GET', '/api/user');
}

/**
 * `DELETE /api/user`. The name includes its prefix (`local/` or `cloud/`).
 *
 * @link https://api-documentation.homewizard.com/docs/v2/authorization#delete-user
 */
export function deleteUser(client: Client, name: string): Promise<void> {
  return client.empty('DELETE', '/api/user', { name });
}
