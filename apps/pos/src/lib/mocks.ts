import { Table } from '../store/usePOSStore';

export const MOCK_TABLES: Table[] = [
  ...Array.from({ length: 12 }, (_, i) => ({
    id: `t${i + 1}`,
    number: i + 1,
    status: (i === 1 || i === 5) ? 'OCCUPIED' : (i === 3 ? 'RESERVED' : (i === 8 ? 'OUT_OF_SERVICE' : 'AVAILABLE')) as any
  }))
];
