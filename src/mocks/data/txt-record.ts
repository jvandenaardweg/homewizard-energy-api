import { MdnsTxtRecord } from '@/types';

export const txtRecordMock = {
  api_enabled: '1',
  path: '/api/v1',
  product_name: 'Energy Socket',
  product_type: 'HWE-SKT',
  serial: '123456789',
} satisfies MdnsTxtRecord;

// TODO: mock this
//   [
//   <Buffer 61 70 69 5f 65 6e 61 62 6c 65 64 3d 31>,
//   <Buffer 70 61 74 68 3d 2f 61 70 69 2f 76 31>,
//   <Buffer 73 65 72 69 61 6c 3d 33 63 33 39 65 37 32 34 31 33 39 30>,
//   <Buffer 70 72 6f 64 75 63 74 5f 6e 61 6d 65 3d 50 31 20 6d 65 74 65 72>,
//   <Buffer 70 72 6f 64 75 63 74 5f 74 79 70 65 3d 48 57 45 2d 50 31>
// ]
