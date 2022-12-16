import { bufferArrayToJSON } from '@/utils/buffer';

describe('utils/buffer', () => {
  describe('bufferArrayToJSON', () => {
    it('should convert a buffer array to a JSON object', () => {
      const bufferArray = [
        Buffer.from('key1=value1'),
        Buffer.from('key2=value2'),
        Buffer.from('key3=value3'),
      ];
      const expected = {
        key1: 'value1',
        key2: 'value2',
        key3: 'value3',
      };
      const actual = bufferArrayToJSON(bufferArray);
      expect(actual).toEqual(expected);
    });
  });
});
