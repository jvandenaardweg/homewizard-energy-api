import { mockMdnsTxtData } from '@/mocks/mdns';
import { bufferArrayToJSON, isBufferArray } from '@/shared/buffer';

describe('utils/buffer', () => {
  describe('bufferArrayToJSON', () => {
    it('should convert a buffer array to a JSON object', () => {
      const expected = {
        api_enabled: '1',
        path: '/api/v1',
        product_name: 'Energy Socket',
        product_type: 'HWE-SKT',
        serial: '3c39e7aabb01',
      };
      const actual = bufferArrayToJSON(mockMdnsTxtData);
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
      const actual = isBufferArray(mockMdnsTxtData);
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
