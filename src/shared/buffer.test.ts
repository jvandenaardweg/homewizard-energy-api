import { mockMdnsV2TxtData } from '@/mocks/mdns-v2';
import { bufferArrayToJSON, isBufferArray } from '@/shared/buffer';

describe('utils/buffer', () => {
  describe('bufferArrayToJSON', () => {
    it('should convert a buffer array to a JSON object', () => {
      const expected = {
        serial: '3c39e7aabb02',
        product_type: 'HWE-P1',
        product_name: 'P1 Meter',
        id: 'appliance/p1dongle/3c39e7aabb02',
        api_version: '2.2.0',
      };
      const actual = bufferArrayToJSON(mockMdnsV2TxtData);
      expect(actual).toEqual(expected);
    });

    it('should keep every "=" after the first one in the value', () => {
      const actual = bufferArrayToJSON([Buffer.from('token=a=b==')]);
      expect(actual).toStrictEqual({ token: 'a=b==' });
    });

    it('should keep a key without "=" with an undefined value', () => {
      const actual = bufferArrayToJSON([Buffer.from('flag')]);
      expect(actual).toStrictEqual({ flag: undefined });
    });

    it('should skip entries without a key', () => {
      const actual = bufferArrayToJSON([Buffer.from('=value'), Buffer.from('')]);
      expect(actual).toStrictEqual({});
    });

    it('should not let a "__proto__" entry change the prototype', () => {
      const actual = bufferArrayToJSON([Buffer.from('__proto__=x'), Buffer.from('serial=1')]);
      expect(Object.getPrototypeOf(actual)).toBe(Object.prototype);
      expect(Object.keys(actual)).toStrictEqual(['serial']);
    });
  });
  describe('isBufferArray', () => {
    it('should true if invoked with a buffer array', () => {
      const expected = true;
      const actual = isBufferArray(mockMdnsV2TxtData);
      expect(actual).toEqual(expected);
    });

    it('should false if not invoked with a buffer array', () => {
      const expected = false;
      const actual = isBufferArray(['test', 'test2']);
      expect(actual).toEqual(expected);
    });

    it('should false if not invoked with a buffer array', () => {
      const expected = false;
      const actual = isBufferArray(
        Buffer.from([97, 112, 105, 95, 101, 110, 97, 98, 108, 101, 100, 61, 49]),
      );
      expect(actual).toEqual(expected);
    });
  });
});
