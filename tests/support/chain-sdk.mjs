export { sql } from '../../node_modules/@chain/sdk/src/storage-table.ts';

export const desktop = new Proxy({}, { get: (_, capability) => globalThis.chainDesktop[capability] });
