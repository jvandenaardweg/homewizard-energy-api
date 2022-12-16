import { mockMdnsTxtData } from '@/mocks/mdns';
import { bufferArrayToJSON, isBufferArray } from '@/utils/buffer';

describe('utils/buffer', () => {
  describe('bufferArrayToJSON', () => {
    it('should convert a buffer array to a JSON object', () => {
      const expected = {
        api_enabled: '1',
        path: '/api/v1',
        product_name: 'Energy Socket',
        product_type: 'HWE-SKT',
        serial: '3c39e727ff1e',
      };
      const actual = bufferArrayToJSON(mockMdnsTxtData);
      expect(actual).toEqual(expected);
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
